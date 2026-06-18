import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";


import { getAdminCredentials } from "@/lib/config";
import { db } from "@/lib/db";
import {
  applySelectedBranch,
  buildGitLabSkillRootPath,
  deleteSkillFromGitLab,
  listGitLabBranches,
  parseGitLabTreeUrl,
  syncSubmissionToGitLab,
  testGitLabConnection,
} from "@/lib/gitlab-sync";
import { sendFeishuCardMessage, type FeishuReceiveIdType } from "@/lib/feishu";
import { hashPassword } from "@/lib/security";
import { getOriginFromHeaders } from "@/lib/site";
import type {
  ApprovalLogAction,
  ApprovalLogRecord,
  CatalogItem,
  FavoriteRecord,
  FeishuNotificationConfig,
  FeishuNotificationSummary,
  GitLabBranchOption,
  GitLabConnectionTestResult,
  GitLabSyncConfig,
  GitLabSyncConfigSummary,
  GitLabSyncProject,
  GitLabSyncResult,
  HubStore,
  LeaderboardData,
  LeaderboardEntry,
  ProjectOption,
  RatingRecord,
  ReviewDecision,
  SkillDetail,
  SkillEngagementSummary,
  SubmissionRecord,
  UserDashboardData,
  UserRecord,
} from "@/lib/types";
import { normalizeSlug, safeSegment, splitTags } from "@/lib/utils";
import {
  createZipFromFiles,
  extractArchiveEntries,
  inspectSkillArchive,
  normalizeSkillArchive,
} from "@/lib/zip";

const DATA_DIR = join(/* turbopackIgnore: true */ process.cwd(), "data");
const STORAGE_DIR = join(
  /* turbopackIgnore: true */ process.cwd(),
  "storage",
  "archives",
);
const STORE_FILE = join(DATA_DIR, "records.json");
const GITLAB_SYNC_SETTING_KEY = "gitlab-sync";
const FEISHU_NOTIFICATION_SETTING_KEY = "feishu-notification";
const ADMIN_PROFILE_SETTING_KEY = "admin-profile";
const GITLAB_SYNC_STORAGE_MISSING = Symbol("gitlab-sync-storage-missing");
const DEFAULT_PROJECT_ID = "global";
const DEFAULT_PROJECT_NAME = "默认项目";
const SUPER_ADMIN_PROJECT_ADMIN_ID = "__superadmin__";
const REMOVED_TEST_SUBMISSION_IDS = new Set(["76558742-5817-4d0b-9a91-8a485eaff921"]);

let initPromise: Promise<void> | null = null;
let projectNameCache = new Map<string, string>([[DEFAULT_PROJECT_ID, DEFAULT_PROJECT_NAME]]);

type CreateSubmissionInput = {
  projectId?: string;
  appOrigin?: string;
  slug: string;
  displayName: string;
  version: string;
  summary: string;
  changelog: string;
  category: string;
  tags: string;
  authorName: string;
  authorEmail: string;
  archive: Buffer;
};

type UpdateUserSubmissionInput = CreateSubmissionInput & {
  submissionId: string;
  user: Pick<UserRecord, "username" | "displayName" | "email">;
};

type ReviewSubmissionOptions = {
  actorName?: string;
  appOrigin?: string;
};

type DashboardScope = {
  projectIds?: string[];
};

type FeishuNotificationResult = {
  attempted: boolean;
  sent: boolean;
  message: string;
};

type FeishuReceiver = {
  receiveIdType: FeishuReceiveIdType;
  receiveId: string;
  label: string;
};

type SeedSpec = Omit<CreateSubmissionInput, "archive" | "tags"> & {
  status: SubmissionRecord["status"];
  featured?: boolean;
  downloads?: number;
  installsCurrent?: number;
  installsAllTime?: number;
  stars?: number;
  reviewedAt?: string;
  publishedAt?: string;
  reviewNotes?: string;
  tags: string[];
  files: Record<string, string>;
};

type CreateUserInput = {
  username: string;
  email?: string;
  displayName: string;
  password: string;
  roleLabel?: string;
  organization?: string;
  createdBy?: string;
};

type UpdateUserInput = {
  userId: string;
  displayName: string;
  email?: string;
  roleLabel?: string;
  organization?: string;
  password?: string;
  actorName?: string;
};

type DbSubmission = NonNullable<Awaited<ReturnType<typeof db.submission.findFirst>>>;
// Prisma client types can lag behind local migrations in the editor; keep user row mapping tolerant.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbUser = any;
type DbFavorite = NonNullable<Awaited<ReturnType<typeof db.favorite.findFirst>>>;
type DbRating = NonNullable<Awaited<ReturnType<typeof db.rating.findFirst>>>;
type DbApprovalLog = NonNullable<Awaited<ReturnType<typeof db.approvalLog.findFirst>>>;
type DbApprovalLogAction = DbApprovalLog["action"];

export async function ensureStore() {
  if (!initPromise) {
    initPromise = bootstrapStore();
  }

  await initPromise;
}

export async function listPublishedCatalog(query?: string, projectId?: string) {
  await ensureStore();
  await listProjectOptions();
  const latest = getLatestPublishedBySlug(
    mapSubmissions(
      await db.submission.findMany({
        where: { status: "published", ...buildSubmissionProjectWhere(projectId) },
        orderBy: { updatedAt: "desc" },
      }),
    ),
  );
  const filtered = applyCatalogQuery(latest, query);

  return filtered.sort((a, b) => {
    if (a.featured !== b.featured) {
      return a.featured ? -1 : 1;
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function listFeaturedSkills(limit = 3, projectId?: string) {
  const items = await listPublishedCatalog(undefined, projectId);
  return items.filter((item) => item.featured).slice(0, limit);
}

export async function listAllSubmissions(projectIds?: string[]) {
  await ensureStore();
  await listProjectOptions();
  return mapSubmissions(
    await db.submission.findMany({
      where: buildSubmissionScopeWhere(projectIds),
      orderBy: { createdAt: "desc" },
    }),
  );
}

export async function getDashboardData(scope?: DashboardScope) {
  await ensureStore();
  await listProjectOptions();

  const submissionWhere = buildSubmissionScopeWhere(scope?.projectIds);

  const [submissions, users, logs] = await Promise.all([
    db.submission.findMany({ where: submissionWhere, orderBy: { updatedAt: "desc" } }),
    db.user.findMany({ orderBy: { username: "asc" } }),
    db.approvalLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);

  const mappedSubmissions = mapSubmissions(submissions);
  return {
    pending: mappedSubmissions
      .filter((item) => item.status === "pending")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    recentPublished: mappedSubmissions
      .filter((item) => item.status === "published")
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 8),
    users: mapUsers(users),
    logs: mapLogs(logs),
    allSkills: mappedSubmissions.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    ),
  };
}

export async function getHubStats(projectId?: string) {
  await ensureStore();
  await listProjectOptions();
  const submissions = mapSubmissions(
    await db.submission.findMany({
      where: buildSubmissionProjectWhere(projectId),
      orderBy: { updatedAt: "desc" },
    }),
  );
  const published = submissions.filter((item) => item.status === "published");
  const latestPublished = getLatestPublishedBySlug(submissions);

  return {
    publishedSkills: latestPublished.length,
    publishedVersions: published.length,
    pendingReviews: submissions.filter((item) => item.status === "pending").length,
    totalDownloads: published.reduce((sum, item) => sum + item.downloads, 0),
  };
}

export async function getSkillDetail(slug: string): Promise<SkillDetail | null> {
  await ensureStore();
  await listProjectOptions();
  const versions = mapSubmissions(
    await db.submission.findMany({
      where: { slug, status: "published" },
      orderBy: { updatedAt: "desc" },
    }),
  );

  if (!versions.length) {
    return null;
  }

  return {
    latest: versions[0],
    versions,
  };
}

export async function getUserById(id: string) {
  await ensureStore();
  const user = await db.user.findUnique({ where: { id } });
  return user ? mapUser(user) : null;
}

export async function getUserByUsername(username: string) {
  await ensureStore();
  const user = await db.user.findUnique({
    where: { username: username.trim().toLowerCase() },
  });
  return user ? mapUser(user) : null;
}

export async function authenticateUser(username: string, password: string) {
  const user = await getUserByUsername(username);
  if (!user || user.disabled) {
    return null;
  }

  const secret = getAdminCredentials().sessionSecret;
  return user.passwordHash === hashPassword(password, secret) ? user : null;
}

export async function listUsers() {
  await ensureStore();
  return mapUsers(await db.user.findMany({ orderBy: { username: "asc" } }));
}

export async function getAdminDisplayName() {
  await ensureStore();
  const record = await readAppSettingRecord(ADMIN_PROFILE_SETTING_KEY);
  if (record === GITLAB_SYNC_STORAGE_MISSING || !record?.value || typeof record.value !== "object" || Array.isArray(record.value)) {
    return "超级管理员";
  }
  const displayName = (record.value as { displayName?: unknown }).displayName;
  return typeof displayName === "string" && displayName.trim() ? displayName.trim() : "超级管理员";
}

export async function getAdminProfile() {
  await ensureStore();
  const record = await readAppSettingRecord(ADMIN_PROFILE_SETTING_KEY);
  if (record === GITLAB_SYNC_STORAGE_MISSING || !record?.value || typeof record.value !== "object" || Array.isArray(record.value)) {
    return { displayName: "超级管理员", email: "" };
  }
  const raw = record.value as { displayName?: unknown; email?: unknown };
  const displayName = typeof raw.displayName === "string" && raw.displayName.trim() ? raw.displayName.trim() : "超级管理员";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  return { displayName, email };
}

export async function updateAdminDisplayName(displayName: string) {
  await updateAdminProfile({ displayName });
}

export async function updateAdminProfile(input: { displayName: string; email?: string }) {
  await ensureStore();
  const current = await getAdminProfile();
  const nextName = input.displayName.trim();
  const email = normalizeEmail(input.email ?? current.email, false);
  if (!nextName) {
    throw new Error("显示名称不能为空。");
  }
  await db.appSetting.upsert({
    where: { key: ADMIN_PROFILE_SETTING_KEY },
    update: { value: { displayName: nextName, email } as never, updatedAt: new Date() },
    create: { key: ADMIN_PROFILE_SETTING_KEY, value: { displayName: nextName, email } as never, updatedAt: new Date() },
  });
}

export async function createUserAccount(input: CreateUserInput) {
  await ensureStore();
  const username = input.username.trim().toLowerCase();
  const email = normalizeEmail(input.email, false);
  const displayName = input.displayName.trim();
  const password = input.password.trim();
  const roleLabel = input.roleLabel?.trim() || "成员";
  const organization = input.organization?.trim() || "";

  if (!username) {
    throw new Error("用户名不能为空。");
  }

  if (!displayName) {
    throw new Error("显示名称不能为空。");
  }

  if (password.length < 6) {
    throw new Error("密码至少需要 6 位。");
  }

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    throw new Error("该用户名已存在，请更换。");
  }

  const secret = getAdminCredentials().sessionSecret;
  const createdAt = new Date();
  const user = await db.user.create({
    data: {
      id: randomUUID(),
      username,
      email,
      displayName,
      passwordHash: hashPassword(password, secret),
      role: "user",
      roleLabel,
      organization,
      createdAt,
      createdBy: input.createdBy,
      disabled: false,
    } as never,
  });

  await appendLog({
    action: "user-created",
    actorType: input.createdBy ? "admin" : "system",
    actorName: input.createdBy || "system",
    targetType: "user",
    targetId: user.id,
    targetLabel: user.username,
    message: `创建普通用户 ${user.username}`,
  });

  return mapUser(user);
}

export async function updateUserAccount(input: UpdateUserInput) {
  await ensureStore();
  const user = await db.user.findUnique({ where: { id: input.userId } });

  if (!user) {
    throw new Error("未找到目标用户。");
  }

  const displayName = input.displayName.trim();
  if (!displayName) {
    throw new Error("显示名称不能为空。");
  }

  const data: {
    displayName: string;
    email: string;
    roleLabel: string;
    organization: string;
    passwordHash?: string;
  } = {
    displayName,
    email: normalizeEmail(input.email, false),
    roleLabel: input.roleLabel?.trim() || "成员",
    organization: input.organization?.trim() || "",
  };

  if (input.password?.trim()) {
    if (input.password.trim().length < 6) {
      throw new Error("新密码至少需要 6 位。");
    }
    data.passwordHash = hashPassword(input.password.trim(), getAdminCredentials().sessionSecret);
  }

  const updated = await db.user.update({ where: { id: input.userId }, data });
  await appendLog({
    action: "user-enabled",
    actorType: "admin",
    actorName: input.actorName || "superadmin",
    targetType: "user",
    targetId: updated.id,
    targetLabel: updated.username,
    message: `更新用户 ${updated.username} 信息`,
  });
  return mapUser(updated);
}

export async function deleteUserAccounts(userIds: string[], actorName = "superadmin") {
  await ensureStore();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!ids.length) {
    throw new Error("请选择要删除的用户。");
  }

  const users = await db.user.findMany({ where: { id: { in: ids } } });
  await db.favorite.deleteMany({ where: { userId: { in: ids } } });
  await db.rating.deleteMany({ where: { userId: { in: ids } } });
  const result = await db.user.deleteMany({ where: { id: { in: ids } } });

  await appendLog({
    action: "user-disabled",
    actorType: "admin",
    actorName,
    targetType: "user",
    targetId: ids.join(","),
    targetLabel: users.map((user) => user.username).join(", ") || `${ids.length} users`,
    message: `批量删除 ${result.count} 个用户`,
  });

  return result.count;
}

export async function importUserAccountsFromCsv(content: string, actorName = "superadmin") {
  await ensureStore();
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = lines[0]?.toLowerCase().includes("username") ? lines.slice(1) : lines;
  let created = 0;

  for (const line of rows) {
    const [username = "", email = "", displayName = "", password = "", roleLabel = "成员", organization = ""] = line.split(",").map((value) => value.trim());
    if (!username || !displayName || !password) {
      continue;
    }

    const existing = await db.user.findUnique({ where: { username: username.toLowerCase() } });
    if (existing) {
      continue;
    }

    await createUserAccount({ username, email, displayName, password, roleLabel, organization, createdBy: actorName });
    created += 1;
  }

  return created;
}

export async function updateUserStatus(userId: string, disabled: boolean, actorName = "superadmin") {
  await ensureStore();
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error("未找到目标用户。");
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { disabled },
  });

  await appendLog({
    action: disabled ? "user-disabled" : "user-enabled",
    actorType: "admin",
    actorName,
    targetType: "user",
    targetId: updated.id,
    targetLabel: updated.username,
    message: `${disabled ? "停用" : "启用"}用户 ${updated.username}`,
  });

  return mapUser(updated);
}

export async function changeUserPassword(userId: string, currentPassword: string, nextPassword: string) {
  await ensureStore();
  const user = await db.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new Error("用户不存在。");
  }

  if (nextPassword.trim().length < 6) {
    throw new Error("新密码至少需要 6 位。");
  }

  const secret = getAdminCredentials().sessionSecret;
  if (user.passwordHash !== hashPassword(currentPassword, secret)) {
    throw new Error("当前密码不正确。");
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(nextPassword.trim(), secret) },
  });

  await appendLog({
    action: "password-changed",
    actorType: "user",
    actorName: updated.username,
    targetType: "user",
    targetId: updated.id,
    targetLabel: updated.username,
    message: `用户 ${updated.username} 修改了登录密码`,
  });

  return mapUser(updated);
}

export async function getSubmissionById(id: string) {
  await ensureStore();
  const submission = await db.submission.findUnique({ where: { id } });
  return submission ? mapSubmission(submission) : null;
}

export async function getPublishedSubmission(slug: string, version?: string) {
  await ensureStore();
  const submission = version
    ? await db.submission.findUnique({ where: { slug_version: { slug, version } } })
    : await db.submission.findFirst({
        where: { slug, status: "published" },
        orderBy: { updatedAt: "desc" },
      });

  if (!submission || submission.status !== "published") {
    return null;
  }

  return mapSubmission(submission);
}

export async function createSubmission(input: CreateSubmissionInput) {
  await ensureStore();
  const projects = await listProjectOptions();
  const project = resolveProjectOption(input.projectId, projects);
  const slug = normalizeSlug(input.slug);
  const normalizedArchive = await normalizeSkillArchive(input.archive);
  const submittedDisplayName = input.displayName.trim();

  if (!slug) {
    throw new Error("技能标识不能为空。");
  }

  if (!submittedDisplayName) {
    throw new Error("技能标题不能为空。");
  }

  const existing = await db.submission.findUnique({
    where: { slug_version: { slug, version: input.version.trim() } },
  });
  if (existing) {
    throw new Error("同一个 slug 和版本已经存在，请更换版本号后再次提交。");
  }

  const archiveMeta = await inspectSkillArchive(normalizedArchive, {
    displayName: submittedDisplayName,
    summary: input.summary,
  });
  const id = randomUUID();
  const now = new Date();
  const zipPath = await saveArchive(slug, input.version, id, normalizedArchive);
  const created = await db.submission.create({
    data: {
      id,
      slug,
      displayName: submittedDisplayName,
      version: input.version.trim(),
      namespace: project.id,
      summary: archiveMeta.summary,
      description: archiveMeta.description,
      changelog: input.changelog.trim() || "首个候选版本，等待管理员审批发布。",
      category: input.category.trim() || "通用",
      tags: splitTags(input.tags),
      authorName: input.authorName.trim(),
      authorEmail: input.authorEmail.trim(),
      status: "pending",
      createdAt: now,
      updatedAt: now,
      downloads: 0,
      installsCurrent: 0,
      installsAllTime: 0,
      stars: 0,
      featured: false,
      zipPath,
      readme: archiveMeta.readme,
      fileTree: archiveMeta.fileTree as never,
      fileCount: archiveMeta.fileCount,
      fingerprint: archiveMeta.fingerprint,
      frontmatter: (archiveMeta.frontmatter || {}) as never,
    },
  });

  await appendLog({
    action: "skill-submitted",
    actorType: "user",
    actorName: created.authorName,
    targetType: "skill",
    targetId: created.id,
    targetLabel: `${created.slug}@${created.version}`,
    message: `提交技能 ${created.displayName} 到项目 ${project.name} 等待审批`,
  });

  const mapped = mapSubmission(created);
  const feishuNotification = await notifyFeishuForSubmission(mapped, "submitted", input.appOrigin);

  return Object.assign(mapped, { feishuNotification });
}

export async function updateUserRejectedSubmission(input: UpdateUserSubmissionInput) {
  await ensureStore();
  const target = await db.submission.findUnique({ where: { id: input.submissionId } });

  if (!target) {
    throw new Error("未找到要修改的技能提交。");
  }

  if (target.status !== "rejected") {
    throw new Error("只有已驳回的技能提交可以由提交人修改后重新送审。");
  }

  if (!isSubmissionOwner(mapSubmission(target), input.user)) {
    throw new Error("只能修改自己提交的技能。");
  }

  const projects = await listProjectOptions();
  const project = resolveProjectOption(input.projectId, projects);
  const slug = normalizeSlug(input.slug);
  const version = input.version.trim();
  const submittedDisplayName = input.displayName.trim();
  const normalizedArchive = await normalizeSkillArchive(input.archive);

  if (!slug) {
    throw new Error("技能标识不能为空。");
  }

  if (!submittedDisplayName) {
    throw new Error("技能标题不能为空。");
  }

  const existing = await db.submission.findUnique({
    where: { slug_version: { slug, version } },
  });
  if (existing && existing.id !== target.id) {
    throw new Error("同一个 slug 和版本已经存在，请更换版本号后再次提交。");
  }

  const archiveMeta = await inspectSkillArchive(normalizedArchive, {
    displayName: submittedDisplayName,
    summary: input.summary,
  });
  const zipPath = await saveArchive(slug, version, target.id, normalizedArchive);
  const updated = await db.submission.update({
    where: { id: target.id },
    data: {
      slug,
      displayName: submittedDisplayName,
      version,
      namespace: project.id,
      summary: archiveMeta.summary,
      description: archiveMeta.description,
      changelog: input.changelog.trim() || "已根据驳回意见修改，重新提交审批。",
      category: input.category.trim() || "通用",
      tags: splitTags(input.tags),
      authorName: input.authorName.trim(),
      authorEmail: normalizeEmail(input.authorEmail, true),
      status: "pending",
      updatedAt: new Date(),
      reviewedAt: null,
      publishedAt: null,
      reviewNotes: null,
      featured: false,
      zipPath,
      readme: archiveMeta.readme,
      fileTree: archiveMeta.fileTree as never,
      fileCount: archiveMeta.fileCount,
      fingerprint: archiveMeta.fingerprint,
      frontmatter: (archiveMeta.frontmatter || {}) as never,
    },
  });

  if (target.zipPath !== zipPath) {
    try {
      await rm(join(/* turbopackIgnore: true */ process.cwd(), target.zipPath), { force: true });
    } catch {
      // ignore archive cleanup errors
    }
  }

  await appendLog({
    action: "skill-submitted",
    actorType: "user",
    actorName: updated.authorName,
    targetType: "skill",
    targetId: updated.id,
    targetLabel: `${updated.slug}@${updated.version}`,
    message: `修改并重新提交技能 ${updated.displayName} 到项目 ${project.name} 等待审批`,
  });

  const mapped = mapSubmission(updated);
  const feishuNotification = await notifyFeishuForSubmission(mapped, "submitted", input.appOrigin);

  return Object.assign(mapped, { feishuNotification });
}

export async function reviewSubmission(
  id: string,
  decision: ReviewDecision,
  notes?: string,
  actorOrOptions: string | ReviewSubmissionOptions = "superadmin",
) {
  await ensureStore();
  await listProjectOptions();
  const actorName = typeof actorOrOptions === "string" ? actorOrOptions : actorOrOptions.actorName ?? "superadmin";
  const appOrigin = typeof actorOrOptions === "string" ? undefined : actorOrOptions.appOrigin;
  const target = await db.submission.findUnique({ where: { id } });

  if (!target) {
    throw new Error("未找到待审批的技能记录。");
  }

  const now = new Date();
  const data: {
    reviewedAt: Date;
    updatedAt: Date;
    reviewNotes: string | null;
    status: "published" | "rejected";
    publishedAt: Date | null;
    featured?: boolean;
  } = {
    reviewedAt: now,
    updatedAt: now,
    reviewNotes: notes?.trim() || null,
    status: decision === "approve" ? "published" : "rejected",
    publishedAt: decision === "approve" ? now : null,
  };

  let feishuNotification: FeishuNotificationResult = {
    attempted: false,
    sent: false,
    message: "飞书通知未触发。",
  };

  if (decision === "approve") {
    const featuredExists = await db.submission.count({
      where: { featured: true, id: { not: id } },
    });
    if (!featuredExists) {
      data.featured = true;
    }
  }

  const updated = await db.submission.update({ where: { id }, data });

  await appendLog({
    action: decision === "approve" ? "skill-approved" : "skill-rejected",
    actorType: "admin",
    actorName,
    targetType: "skill",
    targetId: updated.id,
    targetLabel: `${updated.slug}@${updated.version}`,
    message: `${decision === "approve" ? "审批发布" : "驳回退回"}项目 ${resolveProjectName(updated.namespace)} 的技能 ${updated.displayName}`,
  });

  let gitLabSync: GitLabSyncResult = { attempted: false, synced: false };

  if (decision === "approve") {
    try {
      gitLabSync = await synchronizeApprovedSubmissionToGitLab(mapSubmission(updated));

      if (gitLabSync.attempted && gitLabSync.synced) {
        await appendGitLabSyncLog({
          action: "gitlab-sync-succeeded",
          actorType: "admin",
          actorName,
          targetType: "skill",
          targetId: updated.id,
          targetLabel: `${updated.slug}@${updated.version}`,
          message: gitLabSync.message || `已同步到 GitLab 目录 ${gitLabSync.targetPath}`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "同步到 GitLab 失败。";
      gitLabSync = { attempted: true, synced: false, message };
      await appendGitLabSyncLog({
        action: "gitlab-sync-failed",
        actorType: "admin",
        actorName,
        targetType: "skill",
        targetId: updated.id,
        targetLabel: `${updated.slug}@${updated.version}`,
        message,
      });
    }

    feishuNotification = await notifyFeishuForSubmission(mapSubmission(updated), "published", appOrigin);
  } else {
    feishuNotification = await notifyFeishuForSubmission(mapSubmission(updated), "rejected", appOrigin);
  }

  return {
    submission: mapSubmission(updated),
    gitLabSync,
    feishuNotification,
  };
}

export async function deleteSubmission(id: string, actorName = "superadmin") {
  await ensureStore();
  const target = await db.submission.findUnique({ where: { id } });

  if (!target) {
    throw new Error("技能记录不存在。 ");
  }

  await db.submission.delete({ where: { id } });

  try {
    await rm(join(/* turbopackIgnore: true */ process.cwd(), target.zipPath), { force: true });
  } catch {
    // ignore archive cleanup errors
  }

  const stillExists = await db.submission.count({ where: { slug: target.slug } });
  if (!stillExists) {
    await db.favorite.deleteMany({ where: { slug: target.slug } });
    await db.rating.deleteMany({ where: { slug: target.slug } });
  }

  await appendLog({
    action: "skill-deleted",
    actorType: "admin",
    actorName,
    targetType: "skill",
    targetId: target.id,
    targetLabel: `${target.slug}@${target.version}`,
    message: `删除技能 ${target.displayName}`,
  });

  return mapSubmission(target);
}

export async function deleteUserRejectedSubmission(
  id: string,
  user: Pick<UserRecord, "username" | "displayName" | "email">,
) {
  await ensureStore();
  const target = await db.submission.findUnique({ where: { id } });

  if (!target) {
    throw new Error("技能记录不存在。");
  }

  const mapped = mapSubmission(target);
  if (target.status === "published") {
    throw new Error("已发布技能不能在个人工作台直接删除，请联系管理员处理。");
  }

  if (!isSubmissionOwner(mapped, user)) {
    throw new Error("只能删除自己提交的技能。");
  }

  await db.submission.delete({ where: { id } });

  try {
    await rm(join(/* turbopackIgnore: true */ process.cwd(), target.zipPath), { force: true });
  } catch {
    // ignore archive cleanup errors
  }

  await appendLog({
    action: "skill-deleted",
    actorType: "user",
    actorName: user.username,
    targetType: "skill",
    targetId: target.id,
    targetLabel: `${target.slug}@${target.version}`,
    message: `提交人删除${target.status === "pending" ? "待审批" : "已驳回"}技能 ${target.displayName}`,
  });

  return mapped;
}

export async function deleteSkillGroup(
  id: string,
  options?: {
    actorName?: string;
    deleteFromGitLab?: boolean;
  },
) {
  await ensureStore();
  await listProjectOptions();
  const actorName = options?.actorName ?? "superadmin";
  const target = await db.submission.findUnique({ where: { id } });

  if (!target) {
    throw new Error("技能记录不存在。");
  }

  const siblings = await db.submission.findMany({
    where: { slug: target.slug },
    orderBy: { updatedAt: "desc" },
  });

  if (!siblings.length) {
    throw new Error("未找到需要删除的技能版本。");
  }

  await db.submission.deleteMany({ where: { slug: target.slug } });

  await Promise.all(
    siblings.map(async (item: DbSubmission) => {
      try {
        await rm(join(/* turbopackIgnore: true */ process.cwd(), item.zipPath), { force: true });
      } catch {
        // ignore archive cleanup errors
      }
    }),
  );

  await db.favorite.deleteMany({ where: { slug: target.slug } });
  await db.rating.deleteMany({ where: { slug: target.slug } });

  await appendLog({
    action: "skill-deleted",
    actorType: "admin",
    actorName,
    targetType: "skill",
    targetId: target.id,
    targetLabel: target.slug,
    message: `删除技能 ${target.displayName}（共 ${siblings.length} 个版本）`,
  });

  let gitLabSync: GitLabSyncResult = { attempted: false, synced: false };

  if (options?.deleteFromGitLab) {
    const record = await readGitLabSyncSettingRecord();
    if (record === GITLAB_SYNC_STORAGE_MISSING) {
      gitLabSync = {
        attempted: false,
        synced: false,
        message: "GitLab 同步配置表尚未创建，已跳过仓库删除。",
      };
    } else {
      const config = getGitLabProjectConfig(record?.value, target.namespace);

      try {
        gitLabSync = await deleteSkillFromGitLab({
          slug: target.slug,
          config,
        });

        if (gitLabSync.attempted && gitLabSync.synced) {
          await appendGitLabSyncLog({
            action: "gitlab-sync-succeeded",
            actorType: "admin",
            actorName,
            targetType: "skill",
            targetId: target.id,
            targetLabel: target.slug,
            message: gitLabSync.message || `已从 GitLab 删除技能目录 ${gitLabSync.targetPath}`,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "删除 GitLab 镜像失败。";
        gitLabSync = { attempted: true, synced: false, message };
        await appendGitLabSyncLog({
          action: "gitlab-sync-failed",
          actorType: "admin",
          actorName,
          targetType: "skill",
          targetId: target.id,
          targetLabel: target.slug,
          message,
        });
      }
    }
  }

  return {
    slug: target.slug,
    displayName: target.displayName,
    deletedCount: siblings.length,
    gitLabSync,
  };
}

export async function switchSkillProject(id: string, nextProjectId: string, actorName = "superadmin") {
  await ensureStore();
  const projects = await listProjectOptions();
  const target = await db.submission.findUnique({ where: { id } });

  if (!target) {
    throw new Error("技能记录不存在。");
  }

  const nextProject = resolveProjectOption(nextProjectId, projects);
  const currentProjectId = target.namespace || DEFAULT_PROJECT_ID;

  if (currentProjectId === nextProject.id) {
    return {
      slug: target.slug,
      displayName: target.displayName,
      projectName: nextProject.name,
      movedCount: 0,
      gitLabSync: { attempted: false, synced: false, message: "技能已属于该项目，无需切换。" } satisfies GitLabSyncResult,
    };
  }

  const siblings = await db.submission.findMany({ where: { slug: target.slug } });
  const record = await readGitLabSyncSettingRecord();
  let gitLabSync: GitLabSyncResult = { attempted: false, synced: false };

  if (record !== GITLAB_SYNC_STORAGE_MISSING) {
    const oldConfig = getGitLabProjectConfig(record?.value, currentProjectId);

    try {
      if (oldConfig.repositoryTreeUrl && oldConfig.token) {
        await deleteSkillFromGitLab({ slug: target.slug, config: oldConfig });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "从原 GitLab 项目删除技能失败。";
      await appendGitLabSyncLog({
        action: "gitlab-sync-failed",
        actorType: "admin",
        actorName,
        targetType: "skill",
        targetId: target.id,
        targetLabel: target.slug,
        message,
      });
      throw new Error(message);
    }
  }

  await db.submission.updateMany({ where: { slug: target.slug }, data: { namespace: nextProject.id, updatedAt: new Date() } });

  const latestPublished = siblings
    .filter((item) => item.status === "published")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
  if (latestPublished) {
    try {
      gitLabSync = await synchronizeApprovedSubmissionToGitLab({
        ...mapSubmission({ ...latestPublished, namespace: nextProject.id }),
        projectId: nextProject.id,
        projectName: nextProject.name,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "同步到新 GitLab 项目失败。";
      gitLabSync = { attempted: true, synced: false, message };
      await appendGitLabSyncLog({
        action: "gitlab-sync-failed",
        actorType: "admin",
        actorName,
        targetType: "skill",
        targetId: latestPublished.id,
        targetLabel: `${latestPublished.slug}@${latestPublished.version}`,
        message,
      });
      throw new Error(message);
    }
  }

  await appendLog({
    action: "skill-submitted",
    actorType: "admin",
    actorName,
    targetType: "skill",
    targetId: target.id,
    targetLabel: target.slug,
    message: `切换技能 ${target.displayName} 所属项目：${resolveProjectName(currentProjectId)} → ${nextProject.name}`,
  });

  return {
    slug: target.slug,
    displayName: target.displayName,
    projectName: nextProject.name,
    movedCount: siblings.length,
    gitLabSync,
  };
}

export async function incrementDownload(id: string) {
  await ensureStore();
  try {
    const updated = await db.submission.update({
      where: { id },
      data: {
        downloads: { increment: 1 },
        installsCurrent: { increment: 1 },
        installsAllTime: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    return mapSubmission(updated);
  } catch {
    return null;
  }
}

export async function readArchive(record: SubmissionRecord) {
  const archive = await readFile(join(/* turbopackIgnore: true */ process.cwd(), record.zipPath));
  return normalizeSkillArchive(archive);
}

export async function findVersionByFingerprint(slug: string, fingerprint: string) {
  await ensureStore();
  const submission = await db.submission.findFirst({
    where: { slug, status: "published", fingerprint },
  });
  return submission ? mapSubmission(submission) : null;
}

export async function getSkillEngagementSummary(
  slug: string,
  userId?: string,
): Promise<SkillEngagementSummary> {
  await ensureStore();
  const [favoriteCount, ratings, existingFavorite, currentUserRating] = await Promise.all([
    db.favorite.count({ where: { slug } }),
    db.rating.findMany({ where: { slug } }),
    userId ? db.favorite.findUnique({ where: { userId_slug: { userId, slug } } }) : null,
    userId ? db.rating.findUnique({ where: { userId_slug: { userId, slug } } }) : null,
  ]);

  const total = ratings.reduce((sum: number, item: DbRating) => sum + item.rating, 0);
  return {
    favoriteCount,
    averageRating: ratings.length ? Number((total / ratings.length).toFixed(1)) : 0,
    ratingCount: ratings.length,
    isFavorited: Boolean(existingFavorite),
    currentUserRating: currentUserRating?.rating ?? null,
  };
}

export async function toggleFavorite(slug: string, userId: string) {
  await ensureStore();
  const existing = await db.favorite.findUnique({
    where: { userId_slug: { userId, slug } },
  });

  if (existing) {
    await db.favorite.delete({ where: { userId_slug: { userId, slug } } });
  } else {
    await db.favorite.create({
      data: {
        id: randomUUID(),
        userId,
        slug,
        createdAt: new Date(),
      },
    });
  }

  await synchronizeFavoriteCount(slug);
  return getSkillEngagementSummary(slug, userId);
}

export async function setSkillRating(slug: string, userId: string, rating: number) {
  await ensureStore();
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("评分必须在 1 到 5 之间。");
  }

  const now = new Date();
  const existing = await db.rating.findUnique({
    where: { userId_slug: { userId, slug } },
  });

  if (existing) {
    await db.rating.update({
      where: { userId_slug: { userId, slug } },
      data: { rating: Math.round(rating), updatedAt: now },
    });
  } else {
    await db.rating.create({
      data: {
        id: randomUUID(),
        userId,
        slug,
        rating: Math.round(rating),
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  return getSkillEngagementSummary(slug, userId);
}

export async function getUserDashboard(userId: string): Promise<UserDashboardData> {
  await ensureStore();
  await listProjectOptions();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("用户不存在。");
  }

  const reviewProjectIds = await getProjectAdminScope(userId);

  const [favorites, ratings, authoredSubmissions, reviewSubmissions]: [DbFavorite[], DbRating[], DbSubmission[], DbSubmission[]] = await Promise.all([
    db.favorite.findMany({ where: { userId } }),
    db.rating.findMany({ where: { userId } }),
    db.submission.findMany({
      where: buildUserSubmissionOwnerWhere(mapUser(user)),
      orderBy: { updatedAt: "desc" },
    }),
    reviewProjectIds.length
      ? db.submission.findMany({
          where: { status: "pending", namespace: { in: reviewProjectIds } },
          orderBy: { updatedAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const slugSet = new Set<string>([
    ...favorites.map((item: DbFavorite) => item.slug),
    ...ratings.map((item: DbRating) => item.slug),
  ]);
  const latestBySlug = new Map(
    getLatestPublishedBySlug(
      mapSubmissions(
        await db.submission.findMany({
          where: { status: "published", slug: { in: [...slugSet] } },
          orderBy: { updatedAt: "desc" },
        }),
      ),
    ).map((item) => [item.slug, item.id]),
  );

  const submissions = mapSubmissions(
    await db.submission.findMany({ where: { id: { in: [...latestBySlug.values()] } } }),
  );
  const submissionsById = new Map(submissions.map((item) => [item.id, item]));

  return {
    submissions: mapSubmissions(authoredSubmissions),
    reviewSubmissions: mapSubmissions(reviewSubmissions),
    favorites: favorites
      .map((item: DbFavorite) => submissionsById.get(latestBySlug.get(item.slug) ?? ""))
      .filter(Boolean) as SubmissionRecord[],
    ratings: ratings
      .map((item: DbRating) => ({
        submission: submissionsById.get(latestBySlug.get(item.slug) ?? ""),
        rating: item.rating,
        updatedAt: item.updatedAt.toISOString(),
      }))
      .filter((item: { submission: SubmissionRecord | undefined; rating: number; updatedAt: string }) => Boolean(item.submission)) as UserDashboardData["ratings"],
  };
}

export async function getLeaderboardData(limit = 5, projectId?: string): Promise<LeaderboardData> {
  await ensureStore();
  await listProjectOptions();
  const [submissions, favorites, ratings] = await Promise.all([
    db.submission.findMany({
      where: { status: "published", ...buildSubmissionProjectWhere(projectId) },
      orderBy: { updatedAt: "desc" },
    }),
    db.favorite.findMany(),
    db.rating.findMany(),
  ]);

  const latest = getLatestPublishedBySlug(mapSubmissions(submissions));
  const latestMap = new Map<string, CatalogItem>(latest.map((item) => [item.slug, item]));
  const favoritesBySlug = groupCounts(favorites.map((item: DbFavorite) => item.slug));
  const ratingsBySlug = groupRatings(
    ratings.map((item: DbRating) => ({
      userId: item.userId,
      slug: item.slug,
      rating: item.rating,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  );

  const entries: LeaderboardEntry[] = latest
    .map((item) => ({
      slug: item.slug,
      displayName: item.displayName,
      version: item.version,
      category: item.category,
      summary: item.summary,
      favoriteCount: favoritesBySlug.get(item.slug) ?? 0,
      averageRating: ratingsBySlug.get(item.slug)?.averageRating ?? 0,
      ratingCount: ratingsBySlug.get(item.slug)?.ratingCount ?? 0,
      downloads: item.downloads,
    }))
    .filter((item) => latestMap.has(item.slug));

  return {
    favorites: [...entries]
      .sort((a, b) => b.favoriteCount - a.favoriteCount || b.downloads - a.downloads)
      .slice(0, limit),
    ratings: [...entries]
      .filter((item) => item.ratingCount > 0)
      .sort(
        (a, b) =>
          b.averageRating - a.averageRating ||
          b.ratingCount - a.ratingCount ||
          b.favoriteCount - a.favoriteCount,
      )
      .slice(0, limit),
  };
}

export async function listApprovalLogs(limit = 20) {
  await ensureStore();
  return mapLogs(
    await db.approvalLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  );
}

export async function getGitLabSyncConfigSummary(): Promise<GitLabSyncConfigSummary> {
  await ensureStore();
  const record = await readGitLabSyncSettingRecord();

  if (record === GITLAB_SYNC_STORAGE_MISSING) {
    return buildGitLabSyncSummary(undefined, undefined, {
      storageReady: false,
      issue:
        "当前数据库尚未创建 GitLab 同步配置表，请先执行数据库迁移（例如 npm run db:migrate:deploy）。",
    });
  }

  const projects = normalizeGitLabSyncProjects(record?.value);
  refreshProjectNameCache(projects);
  const primary = projects[0] ?? buildDefaultGitLabProject();
  const availableBranches = await loadAvailableBranches(primary);

  try {
    return buildGitLabSyncSummary(primary, record?.updatedAt.toISOString(), {
      storageReady: true,
      availableBranches,
      projects: projects.map((project) => buildGitLabSyncSummary(project, record?.updatedAt.toISOString(), {
        storageReady: true,
      })),
    });
  } catch {
    return buildGitLabSyncSummary(primary, record?.updatedAt.toISOString(), {
      storageReady: true,
      availableBranches,
      projects: projects.map((project) => buildGitLabSyncSummary(project, record?.updatedAt.toISOString(), {
        storageReady: true,
      })),
      issue: primary.repositoryTreeUrl ? "当前地址暂时无法解析，请检查 GitLab 目录页格式。" : undefined,
    });
  }
}

export async function getFeishuNotificationSummary(): Promise<FeishuNotificationSummary> {
  await ensureStore();
  const record = await readAppSettingRecord(FEISHU_NOTIFICATION_SETTING_KEY);

  if (record === GITLAB_SYNC_STORAGE_MISSING) {
    return {
      enabled: false,
      appId: "",
      hasAppSecret: false,
      chatId: "",
      storageReady: false,
      issue: "当前数据库尚未创建配置表，请先执行数据库迁移。",
    };
  }

  const config = normalizeFeishuNotificationConfig(record?.value);
  return buildFeishuNotificationSummary(config, record?.updatedAt.toISOString());
}

export async function updateFeishuNotificationConfig(input: {
  enabled: boolean;
  appId: string;
  appSecret?: string;
  clearSecret?: boolean;
  chatId: string;
}) {
  await ensureStore();
  const existingRecord = await readAppSettingRecordOrThrow(FEISHU_NOTIFICATION_SETTING_KEY);
  const existing = normalizeFeishuNotificationConfig(existingRecord?.value);
  const appId = input.appId.trim();
  const appSecret = input.clearSecret ? "" : input.appSecret?.trim() || existing.appSecret;
  const chatId = input.chatId.trim();

  if (input.enabled && (!appId || !appSecret)) {
    throw new Error("启用飞书通知前请填写 App ID 和 App Secret。");
  }

  await db.appSetting.upsert({
    where: { key: FEISHU_NOTIFICATION_SETTING_KEY },
    update: {
      value: { enabled: input.enabled, appId, appSecret, chatId } as never,
      updatedAt: new Date(),
    },
    create: {
      key: FEISHU_NOTIFICATION_SETTING_KEY,
      value: { enabled: input.enabled, appId, appSecret, chatId } as never,
      updatedAt: new Date(),
    },
  });

  return getFeishuNotificationSummary();
}

export async function updateGitLabSyncConfig(input: {
  projectId?: string;
  projectName?: string;
  enabled: boolean;
  repositoryTreeUrl: string;
  branch?: string;
  token?: string;
  clearToken?: boolean;
  adminUserIds?: string[];
  notifyEmails?: string[];
}) {
  await ensureStore();
  const existingRecord = await readGitLabSyncSettingRecordOrThrow();
  const projects = normalizeGitLabSyncProjects(existingRecord?.value);
  const rawProjectId = input.projectId?.trim() ?? "";
  const isNewProject = rawProjectId.startsWith("new-project");

  if (isNewProject && !input.projectName?.trim()) {
    throw new Error("新增同步项目时请填写项目名称。");
  }

  const projectId = isNewProject
    ? createUniqueProjectId(input.projectName ?? "", projects)
    : normalizeProjectId(input.projectId || input.projectName || DEFAULT_PROJECT_ID);
  const matchedProject = projects.find((project) => project.id === projectId);

  const existing = matchedProject ?? buildDefaultGitLabProject({ id: projectId });

  const repositoryTreeUrl = input.repositoryTreeUrl.trim();
  const branch = input.branch?.trim() || parseSelectedBranchFromUrl(repositoryTreeUrl) || existing.branch;
  const token = input.clearToken ? "" : input.token?.trim() || existing.token;
  const enabled = input.enabled;
  const projectName = input.projectName?.trim() || existing.name || projectId;
  const adminUserIds = input.adminUserIds ?? existing.adminUserIds;
  const notifyEmails = normalizeFeishuReceiverValues(input.notifyEmails ?? existing.notifyEmails);

  if (repositoryTreeUrl) {
    const parsed = parseGitLabTreeUrl(repositoryTreeUrl);
    const normalizedBranch = branch || parsed.branch;

    if (token) {
      const branches = await listGitLabBranches({ repositoryTreeUrl, token });
      if (branches.length && !branches.some((item) => item.name === normalizedBranch)) {
        throw new Error(`选择的分支不存在：${normalizedBranch}`);
      }
    }
  }

  if (enabled && !repositoryTreeUrl) {
    throw new Error("启用 GitLab 同步前请先填写目录地址。");
  }

  if (enabled && !token) {
    throw new Error("启用 GitLab 同步前请先填写授权码。若已保存过授权码，可留空以继续沿用。");
  }

  const nextProject: GitLabSyncProject = {
    id: projectId,
    name: projectName,
    enabled,
    repositoryTreeUrl,
    branch,
    token,
    adminUserIds: [...new Set(adminUserIds.filter(Boolean))],
    notifyEmails,
  };
  const nextProjects = upsertGitLabProject(projects, nextProject);

  await db.appSetting.upsert({
    where: { key: GITLAB_SYNC_SETTING_KEY },
    update: {
      value: {
        projects: nextProjects,
      } as never,
      updatedAt: new Date(),
    },
    create: {
      key: GITLAB_SYNC_SETTING_KEY,
      value: {
        projects: nextProjects,
      } as never,
      updatedAt: new Date(),
    },
  });

  return getGitLabSyncConfigSummary();
}

export async function deleteGitLabSyncProject(projectId: string) {
  await ensureStore();
  const existingRecord = await readGitLabSyncSettingRecordOrThrow();
  const projects = normalizeGitLabSyncProjects(existingRecord?.value);
  const normalizedProjectId = normalizeProjectId(projectId || DEFAULT_PROJECT_ID);

  if (projects.length <= 1) {
    throw new Error("至少需要保留一个同步项目。");
  }

  const nextProjects = projects.filter((project) => project.id !== normalizedProjectId);
  if (nextProjects.length === projects.length) {
    throw new Error("未找到要删除的同步项目。");
  }

  await db.appSetting.update({
    where: { key: GITLAB_SYNC_SETTING_KEY },
    data: {
      value: { projects: nextProjects } as never,
      updatedAt: new Date(),
    },
  });

  refreshProjectNameCache(nextProjects);
  return getGitLabSyncConfigSummary();
}

export async function testGitLabSyncConnection(input: {
  projectId?: string;
  repositoryTreeUrl: string;
  branch?: string;
  token?: string;
}): Promise<GitLabConnectionTestResult> {
  await ensureStore();

  const existingRecord = await readGitLabSyncSettingRecord();
  const existing =
    existingRecord && existingRecord !== GITLAB_SYNC_STORAGE_MISSING
      ? getGitLabProjectConfig(existingRecord.value, input.projectId)
      : undefined;
  const repositoryTreeUrl = input.repositoryTreeUrl.trim() || existing?.repositoryTreeUrl || "";
  const branch = input.branch?.trim() || existing?.branch || parseSelectedBranchFromUrl(repositoryTreeUrl);
  const token = input.token?.trim() || existing?.token || "";

  return testGitLabConnection({
    repositoryTreeUrl,
    branch,
    token,
  });
}

export async function getGitLabBranches(input: {
  projectId?: string;
  repositoryTreeUrl: string;
  token?: string;
}): Promise<GitLabBranchOption[]> {
  await ensureStore();

  const existingRecord = await readGitLabSyncSettingRecord();
  const existing =
    existingRecord && existingRecord !== GITLAB_SYNC_STORAGE_MISSING
      ? getGitLabProjectConfig(existingRecord.value, input.projectId)
      : undefined;

  const repositoryTreeUrl = input.repositoryTreeUrl.trim() || existing?.repositoryTreeUrl || "";
  const token = input.token?.trim() || existing?.token || "";

  return listGitLabBranches({ repositoryTreeUrl, token });
}

export async function listProjectOptions(): Promise<ProjectOption[]> {
  await ensureStore();
  const record = await readGitLabSyncSettingRecord();
  const projects = record === GITLAB_SYNC_STORAGE_MISSING
    ? [buildDefaultGitLabProject()]
    : normalizeGitLabSyncProjects(record?.value);
  refreshProjectNameCache(projects);

  return projects.map((project) => {
    try {
      const parsed = project.repositoryTreeUrl
        ? applySelectedBranch(parseGitLabTreeUrl(project.repositoryTreeUrl), project.branch)
        : undefined;
      return {
        id: project.id,
        name: project.name,
        enabled: project.enabled,
        projectPath: parsed?.projectPath,
        branch: parsed?.branch || project.branch,
        basePath: parsed?.basePath,
      };
    } catch {
      return {
        id: project.id,
        name: project.name,
        enabled: project.enabled,
        branch: project.branch,
      };
    }
  });
}

export async function getProjectAdminScope(userId?: string | null) {
  if (!userId) {
    return [] as string[];
  }

  await ensureStore();
  const record = await readGitLabSyncSettingRecord();
  const projects = record === GITLAB_SYNC_STORAGE_MISSING
    ? [buildDefaultGitLabProject()]
    : normalizeGitLabSyncProjects(record?.value);
  refreshProjectNameCache(projects);

  return projects
    .filter((project) => project.adminUserIds.includes(userId))
    .map((project) => project.id);
}

export async function canManageSubmissionProject(submissionId: string, projectIds: string[]) {
  if (!projectIds.length) {
    return false;
  }

  const submission = await db.submission.findUnique({ where: { id: submissionId } });
  return Boolean(submission && projectIds.includes(submission.namespace || DEFAULT_PROJECT_ID));
}

function applyCatalogQuery(items: CatalogItem[], query?: string) {
  if (!query?.trim()) {
    return items;
  }

  const keyword = query.trim().toLowerCase();

  return items
    .map((item) => ({ item, score: getCatalogScore(item, keyword) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.slug.localeCompare(b.item.slug))
    .map((entry) => entry.item);
}

function getCatalogScore(item: CatalogItem, keyword: string) {
  let score = 0;

  if (item.slug.includes(keyword)) score += 4;
  if (item.displayName.toLowerCase().includes(keyword)) score += 3;
  if (item.summary.toLowerCase().includes(keyword)) score += 2;
  if (item.tags.some((tag) => tag.toLowerCase().includes(keyword))) score += 1;

  return score;
}

function getLatestPublishedBySlug(submissions: SubmissionRecord[]): CatalogItem[] {
  const latestMap = new Map<string, SubmissionRecord>();

  for (const entry of submissions) {
    if (entry.status !== "published") {
      continue;
    }

    const current = latestMap.get(entry.slug);
    if (!current || new Date(entry.updatedAt).getTime() > new Date(current.updatedAt).getTime()) {
      latestMap.set(entry.slug, entry);
    }
  }

  return [...latestMap.values()].map((entry) => ({
    id: entry.id,
    slug: entry.slug,
    displayName: entry.displayName,
    summary: entry.summary,
    category: entry.category,
    tags: entry.tags,
    authorName: entry.authorName,
    version: entry.version,
    updatedAt: entry.updatedAt,
    downloads: entry.downloads,
    installsCurrent: entry.installsCurrent,
    installsAllTime: entry.installsAllTime,
    stars: entry.stars,
    featured: entry.featured,
    fileCount: entry.fileCount,
    projectId: entry.projectId,
    projectName: entry.projectName,
  }));
}

function normalizeGitLabSyncConfig(value: unknown): GitLabSyncConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      enabled: false,
      repositoryTreeUrl: "",
      branch: "",
      token: "",
    };
  }

  return {
    enabled: Boolean((value as { enabled?: unknown }).enabled),
    repositoryTreeUrl:
      typeof (value as { repositoryTreeUrl?: unknown }).repositoryTreeUrl === "string"
        ? (value as { repositoryTreeUrl: string }).repositoryTreeUrl.trim()
        : "",
    branch:
      typeof (value as { branch?: unknown }).branch === "string"
        ? (value as { branch: string }).branch.trim()
        : "",
    token:
      typeof (value as { token?: unknown }).token === "string"
        ? (value as { token: string }).token.trim()
        : "",
  };
}

function normalizeGitLabSyncProjects(value: unknown): GitLabSyncProject[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const rawProjects = (value as { projects?: unknown }).projects;
    if (Array.isArray(rawProjects)) {
      const projects = rawProjects.map((item, index) => normalizeGitLabSyncProject(item, index));
      return projects.length ? projects : [buildDefaultGitLabProject()];
    }
  }

  const legacy = normalizeGitLabSyncConfig(value);
  return [
    buildDefaultGitLabProject({
      enabled: legacy.enabled,
      repositoryTreeUrl: legacy.repositoryTreeUrl,
      branch: legacy.branch,
      token: legacy.token,
      adminUserIds: legacy.adminUserIds ?? [],
    }),
  ];
}

function normalizeGitLabSyncProject(value: unknown, index = 0): GitLabSyncProject {
  const config = normalizeGitLabSyncConfig(value);
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const rawName = typeof raw.name === "string" ? raw.name.trim() : "";
  const id = normalizeProjectId(typeof raw.id === "string" ? raw.id : rawName || `${DEFAULT_PROJECT_ID}-${index + 1}`);
  const adminUserIds = Array.isArray(raw.adminUserIds)
    ? raw.adminUserIds.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
  const notifyEmails = Array.isArray(raw.notifyEmails)
    ? normalizeFeishuReceiverValues(raw.notifyEmails.filter((item): item is string => typeof item === "string"))
    : [];

  return {
    id,
    name: rawName || (id === DEFAULT_PROJECT_ID ? DEFAULT_PROJECT_NAME : id),
    enabled: config.enabled,
    repositoryTreeUrl: config.repositoryTreeUrl,
    branch: config.branch,
    token: config.token,
    adminUserIds: [...new Set(adminUserIds)],
    notifyEmails,
  };
}

function buildDefaultGitLabProject(overrides?: Partial<GitLabSyncProject>): GitLabSyncProject {
  return {
    id: DEFAULT_PROJECT_ID,
    name: DEFAULT_PROJECT_NAME,
    enabled: false,
    repositoryTreeUrl: "",
    branch: "",
    token: "",
    adminUserIds: [],
    notifyEmails: [],
    ...overrides,
  };
}

function upsertGitLabProject(projects: GitLabSyncProject[], nextProject: GitLabSyncProject) {
  const existing = projects.filter((project) => project.id !== nextProject.id);
  const ordered = nextProject.id === DEFAULT_PROJECT_ID
    ? [nextProject, ...existing]
    : [...existing, nextProject];
  refreshProjectNameCache(ordered);
  return ordered;
}

function getGitLabProjectConfig(value: unknown, projectId?: string): GitLabSyncProject {
  const projects = normalizeGitLabSyncProjects(value);
  refreshProjectNameCache(projects);
  const normalizedProjectId = normalizeProjectId(projectId || DEFAULT_PROJECT_ID);
  return projects.find((project) => project.id === normalizedProjectId) ?? projects[0] ?? buildDefaultGitLabProject();
}

function normalizeProjectId(value: string) {
  const normalized = normalizeSlug(value || DEFAULT_PROJECT_ID);
  if (normalized) {
    return normalized;
  }

  return `project-${hashProjectName(value || DEFAULT_PROJECT_ID)}`;
}

function normalizeFeishuNotificationConfig(value: unknown): FeishuNotificationConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { enabled: false, appId: "", appSecret: "", chatId: "" };
  }

  const raw = value as Record<string, unknown>;
  return {
    enabled: Boolean(raw.enabled),
    appId: typeof raw.appId === "string" ? raw.appId.trim() : "",
    appSecret: typeof raw.appSecret === "string" ? raw.appSecret.trim() : "",
    chatId: typeof raw.chatId === "string" ? raw.chatId.trim() : "",
  };
}

function buildFeishuNotificationSummary(config: FeishuNotificationConfig, updatedAt?: string): FeishuNotificationSummary {
  return {
    enabled: config.enabled,
    appId: config.appId,
    hasAppSecret: Boolean(config.appSecret),
    maskedAppSecret: maskToken(config.appSecret),
    chatId: config.chatId,
    updatedAt,
    storageReady: true,
  };
}

function normalizeFeishuReceiverValues(values?: string[]) {
  return [...new Set((values ?? [])
    .filter((value): value is string => typeof value === "string")
    .flatMap((value) => value.split(/[，,\s]+/))
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => Boolean(parseFeishuReceiver(value)))
    .map((value) => value.toLowerCase().startsWith("email:") ? value.toLowerCase() : value))];
}

function parseFeishuReceiver(value: string): FeishuReceiver | null {
  const raw = value.trim();
  if (!raw) {
    return null;
  }

  const prefixed = raw.match(/^(open_id|union_id|user_id|email|chat_id)[:：](.+)$/i);
  if (prefixed) {
    const receiveIdType = prefixed[1].toLowerCase() as FeishuReceiveIdType;
    const receiveId = prefixed[2].trim();
    if (!receiveId) {
      return null;
    }

    if (receiveIdType === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(receiveId)) {
      return null;
    }

    return { receiveIdType, receiveId, label: `${receiveIdType}:${receiveId}` };
  }

  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw)) {
    return { receiveIdType: "email", receiveId: raw.toLowerCase(), label: raw.toLowerCase() };
  }

  if (raw.startsWith("ou_")) {
    return { receiveIdType: "open_id", receiveId: raw, label: `open_id:${raw}` };
  }

  if (raw.startsWith("on_")) {
    return { receiveIdType: "union_id", receiveId: raw, label: `union_id:${raw}` };
  }

  if (raw.startsWith("oc_")) {
    return { receiveIdType: "chat_id", receiveId: raw, label: `chat_id:${raw}` };
  }

  return null;
}

function buildFeishuReceivers(values: string[]) {
  const receivers = values
    .map(parseFeishuReceiver)
    .filter((item): item is FeishuReceiver => Boolean(item));
  const deduped = new Map<string, FeishuReceiver>();
  for (const receiver of receivers) {
    deduped.set(`${receiver.receiveIdType}:${receiver.receiveId}`, receiver);
  }

  return [...deduped.values()];
}

function buildUserSubmissionOwnerWhere(user: Pick<UserRecord, "username" | "displayName" | "email">) {
  const candidates = [
    user.email ? { authorEmail: user.email.trim().toLowerCase() } : undefined,
    user.displayName ? { authorName: user.displayName.trim() } : undefined,
    user.username ? { authorName: user.username.trim() } : undefined,
  ].filter((item): item is { authorEmail: string } | { authorName: string } => Boolean(item));

  return candidates.length ? { OR: candidates } : { authorEmail: "__no_user_email__" };
}

function isSubmissionOwner(
  submission: SubmissionRecord,
  user: Pick<UserRecord, "username" | "displayName" | "email">,
) {
  const email = user.email.trim().toLowerCase();
  if (email && submission.authorEmail.trim().toLowerCase() === email) {
    return true;
  }

  const names = new Set([user.displayName.trim(), user.username.trim()].filter(Boolean));
  return names.has(submission.authorName.trim());
}

function normalizeEmail(value: string | undefined, required: boolean) {
  const email = value?.trim().toLowerCase() ?? "";
  if (!email) {
    if (required) {
      throw new Error("邮箱不能为空。");
    }
    return "";
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("邮箱格式不正确。");
  }

  return email;
}

async function notifyFeishuForSubmission(
  submission: SubmissionRecord,
  event: "submitted" | "published" | "rejected",
  appOrigin?: string,
): Promise<FeishuNotificationResult> {
  try {
    const record = await readAppSettingRecord(FEISHU_NOTIFICATION_SETTING_KEY);
    if (record === GITLAB_SYNC_STORAGE_MISSING) {
      return { attempted: false, sent: false, message: "飞书配置表不存在，已跳过通知。" };
    }

    const config = normalizeFeishuNotificationConfig(record?.value);
    if (!config.enabled || !config.appId || !config.appSecret) {
      return { attempted: false, sent: false, message: "飞书通知未启用或 App 信息不完整，已跳过通知。" };
    }

    const gitLabRecord = await readGitLabSyncSettingRecord();
    const project = gitLabRecord === GITLAB_SYNC_STORAGE_MISSING
      ? buildDefaultGitLabProject()
      : getGitLabProjectConfig(gitLabRecord?.value, submission.projectId);
    const users = await db.user.findMany({ where: { id: { in: project.adminUserIds.filter((id) => id !== SUPER_ADMIN_PROJECT_ADMIN_ID) } } });
    const adminProfile = project.adminUserIds.includes(SUPER_ADMIN_PROJECT_ADMIN_ID) ? await getAdminProfile() : null;
    const projectApprovers = buildFeishuReceivers([
      ...project.notifyEmails,
      adminProfile?.email ?? "",
      ...users.map((user) => (user as DbUser).email),
    ]);
    const publisherReceivers = buildFeishuReceivers([submission.authorEmail]);
    const card = buildFeishuSubmissionCard(submission, event, appOrigin);

    const targets = event === "submitted" ? projectApprovers : publisherReceivers;

    if (!targets.length) {
      return {
        attempted: false,
        sent: false,
        message: event === "submitted"
          ? "飞书已启用，但该项目未配置审批人飞书接收人，未发送。请在项目配置中填写审批人的邮箱、open_id、user_id 或 union_id。"
          : "飞书已启用，但发布人没有有效的飞书接收人，未发送。请给发布人配置真实企业邮箱。",
      };
    }

    const results = await Promise.allSettled(
      targets.map((target) => sendFeishuCardMessage({ config, receiveIdType: target.receiveIdType, receiveId: target.receiveId, card })),
    );
    const failed = results
      .map((result, index) => ({ result, target: targets[index] }))
      .filter((item): item is { result: PromiseRejectedResult; target: (typeof targets)[number] } => item.result.status === "rejected");
    const successCount = results.length - failed.length;

    if (!successCount) {
      return {
        attempted: true,
        sent: false,
        message: `飞书发送失败：${failed.map((item) => `${item.target.label} ${item.result.reason instanceof Error ? item.result.reason.message : "发送失败"}`).join("；")}`,
      };
    }

    if (failed.length) {
      return {
        attempted: true,
        sent: true,
        message: `飞书部分发送成功：成功 ${successCount}/${results.length}；失败 ${failed.map((item) => item.target.label).join("、")}`,
      };
    }

    return { attempted: true, sent: true, message: `飞书发送成功：${successCount}/${results.length}。` };
  } catch (error) {
    console.error("Feishu notification skipped.", error);
    return {
      attempted: true,
      sent: false,
      message: error instanceof Error ? `飞书发送失败：${error.message}` : "飞书发送失败。",
    };
  }
}

function buildFeishuSubmissionCard(
  submission: SubmissionRecord,
  event: "submitted" | "published" | "rejected",
  appOrigin?: string,
) {
  const origin = normalizeAppOrigin(appOrigin);
  const actionUrl = buildFeishuActionUrl(origin, submission, event);
  const meta = getFeishuEventMeta(event);
  const markdownLines = [
    `**技能：** ${escapeFeishuMarkdown(submission.displayName)}  \`${escapeFeishuMarkdown(submission.version)}\``,
    `**项目：** ${escapeFeishuMarkdown(submission.projectName)}`,
    `**Slug：** \`${escapeFeishuMarkdown(submission.slug)}\``,
    `**提交人：** ${escapeFeishuMarkdown(submission.authorName)}${submission.authorEmail ? `（${escapeFeishuMarkdown(submission.authorEmail)}）` : ""}`,
  ];

  if (event === "rejected") {
    markdownLines.push(`**审批意见：** ${escapeFeishuMarkdown(submission.reviewNotes || "未填写")}`);
  }

  return {
    schema: "2.0",
    config: {
      update_multi: true,
      width_mode: "fill",
      enable_forward: true,
      summary: { content: meta.summary },
    },
    card_link: { url: actionUrl, pc_url: actionUrl, ios_url: actionUrl, android_url: actionUrl },
    header: {
      title: { tag: "plain_text", content: meta.title },
      subtitle: { tag: "plain_text", content: "Apex Skills Hub" },
      template: meta.template,
      padding: "12px 12px 12px 12px",
    },
    body: {
      direction: "vertical",
      padding: "12px 12px 12px 12px",
      vertical_spacing: "8px",
      elements: [
        {
          tag: "markdown",
          content: markdownLines.join("\n"),
          text_align: "left",
          text_size: "normal_v2",
        },
        {
          tag: "markdown",
          content: escapeFeishuMarkdown(meta.description),
          text_align: "left",
          text_size: "normal_v2",
        },
        {
          tag: "button",
          text: { tag: "plain_text", content: meta.buttonText },
          type: meta.buttonType,
          width: "default",
          size: "medium",
          behaviors: [
            {
              type: "open_url",
              default_url: actionUrl,
              pc_url: actionUrl,
              ios_url: actionUrl,
              android_url: actionUrl,
            },
          ],
        },
      ],
    },
  };
}

function getFeishuEventMeta(event: "submitted" | "published" | "rejected") {
  if (event === "submitted") {
    return {
      title: "🧩 新技能待审批",
      summary: "Apex Skills Hub 有新的技能提交待审批",
      description: "请项目审批人打开审批台完成发布或驳回。",
      buttonText: "打开审批台",
      buttonType: "primary",
      template: "blue",
    };
  }

  if (event === "published") {
    return {
      title: "✅ 技能已发布",
      summary: "Apex Skills Hub 技能审批通过并已发布",
      description: "你的技能已通过审批，可以打开详情页查看发布效果。",
      buttonText: "查看技能详情",
      buttonType: "primary",
      template: "green",
    };
  }

  return {
    title: "↩️ 技能已驳回",
    summary: "Apex Skills Hub 技能提交已被驳回",
    description: "请根据审批意见修改后，在我的技能中重新提交。",
    buttonText: "修改并重新提交",
    buttonType: "danger",
    template: "red",
  };
}

function buildFeishuActionUrl(
  origin: string,
  submission: SubmissionRecord,
  event: "submitted" | "published" | "rejected",
) {
  if (event === "submitted") {
    return `${origin}/admin?tab=pending`;
  }

  if (event === "published") {
    return `${origin}/skills/${encodeURIComponent(submission.slug)}`;
  }

  return `${origin}/my-skills?status=rejected&page=1`;
}

function normalizeAppOrigin(appOrigin?: string) {
  const normalized = appOrigin?.trim().replace(/\/+$/, "");
  if (normalized) {
    return normalized;
  }

  return getOriginFromHeaders(new Headers(), { preferNetworkIp: true }).replace(/\/+$/, "");
}

function escapeFeishuMarkdown(value: string) {
  return value.replace(/`/g, "ʼ");
}

function createUniqueProjectId(projectName: string, projects: GitLabSyncProject[]) {
  const normalizedName = projectName.trim();
  const nameExists = projects.some((project) => project.name.trim().toLowerCase() === normalizedName.toLowerCase());
  if (nameExists) {
    throw new Error(`项目“${normalizedName}”已存在，请更换名称后再新增。`);
  }

  const baseId = normalizeProjectId(normalizedName);
  const usedIds = new Set(projects.map((project) => project.id));
  if (!usedIds.has(baseId)) {
    return baseId;
  }

  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${baseId}-${index}`;
    if (!usedIds.has(candidate)) {
      return candidate;
    }
  }

  return `${baseId}-${Date.now().toString(36)}`;
}

function hashProjectName(value: string) {
  let hash = 0;
  for (const char of value.trim() || DEFAULT_PROJECT_ID) {
    hash = ((hash << 5) - hash + char.codePointAt(0)!) | 0;
  }

  return Math.abs(hash).toString(36);
}

function refreshProjectNameCache(projects: Array<Pick<GitLabSyncProject, "id" | "name">>) {
  projectNameCache = new Map([[DEFAULT_PROJECT_ID, DEFAULT_PROJECT_NAME]]);
  for (const project of projects) {
    projectNameCache.set(project.id, project.name);
  }
}

function resolveProjectName(projectId?: string | null) {
  const id = projectId || DEFAULT_PROJECT_ID;
  return projectNameCache.get(id) ?? id;
}

function resolveProjectOption(projectId: string | undefined, projects: ProjectOption[]) {
  const normalized = normalizeProjectId(projectId || DEFAULT_PROJECT_ID);
  return projects.find((project) => project.id === normalized) ?? projects[0] ?? {
    id: DEFAULT_PROJECT_ID,
    name: DEFAULT_PROJECT_NAME,
    enabled: false,
  };
}

function buildSubmissionProjectWhere(projectId?: string) {
  if (!projectId?.trim()) {
    return {};
  }

  return { namespace: normalizeProjectId(projectId) };
}

function buildSubmissionScopeWhere(projectIds?: string[]) {
  const normalized = [...new Set((projectIds ?? []).map(normalizeProjectId).filter(Boolean))];
  if (!normalized.length) {
    return {};
  }

  return { namespace: { in: normalized } };
}

async function synchronizeApprovedSubmissionToGitLab(
  submission: SubmissionRecord,
): Promise<GitLabSyncResult> {
  const record = await readGitLabSyncSettingRecord();
  if (record === GITLAB_SYNC_STORAGE_MISSING) {
    return {
      attempted: false,
      synced: false,
      message: "GitLab 同步配置表尚未创建，已跳过同步。",
    };
  }

  const config = getGitLabProjectConfig(record?.value, submission.projectId);

  if (!config.enabled || !config.repositoryTreeUrl || !config.token) {
    return { attempted: false, synced: false, message: `项目 ${submission.projectName} 未配置 GitLab 同步。` };
  }

  const archive = await readArchive(submission);
  const files = await extractArchiveEntries(archive);
  const parsedTarget = applySelectedBranch(parseGitLabTreeUrl(config.repositoryTreeUrl), config.branch);
  const result = await syncSubmissionToGitLab({
    submission,
    config,
    files,
  });

  return {
    ...result,
    targetPath: buildGitLabSkillRootPath(parsedTarget, submission.slug),
  };
}

function buildGitLabSyncSummary(
  config?: GitLabSyncConfig,
  updatedAt?: string,
  extras?: {
    storageReady?: boolean;
    issue?: string;
    availableBranches?: GitLabBranchOption[];
    projects?: GitLabSyncConfigSummary[];
  },
): GitLabSyncConfigSummary {
  const normalized = config ?? {
    enabled: false,
    repositoryTreeUrl: "",
    branch: "",
    token: "",
  };

  const summary: GitLabSyncConfigSummary = {
    id: normalized.id ?? DEFAULT_PROJECT_ID,
    name: normalized.name ?? DEFAULT_PROJECT_NAME,
    enabled: normalized.enabled,
    repositoryTreeUrl: normalized.repositoryTreeUrl,
    branch: normalized.branch,
    hasToken: Boolean(normalized.token),
    maskedToken: maskToken(normalized.token),
    adminUserIds: normalized.adminUserIds ?? [],
    notifyEmails: normalized.notifyEmails ?? [],
    updatedAt,
    storageReady: extras?.storageReady ?? true,
    issue: extras?.issue,
    availableBranches: extras?.availableBranches,
    projects: extras?.projects,
  };

  if (!normalized.repositoryTreeUrl) {
    return summary;
  }

  const parsed = applySelectedBranch(parseGitLabTreeUrl(normalized.repositoryTreeUrl), normalized.branch);
  return {
    ...summary,
    projectPath: parsed.projectPath,
    branch: parsed.branch,
    basePath: parsed.basePath,
  };
}

async function loadAvailableBranches(config: GitLabSyncConfig) {
  if (!config.repositoryTreeUrl || !config.token) {
    return undefined;
  }

  try {
    return await listGitLabBranches({
      repositoryTreeUrl: config.repositoryTreeUrl,
      token: config.token,
    });
  } catch {
    return undefined;
  }
}

async function appendGitLabSyncLog(input: {
  action: Extract<ApprovalLogAction, "gitlab-sync-succeeded" | "gitlab-sync-failed">;
  actorType: ApprovalLogRecord["actorType"];
  actorName: string;
  targetType: ApprovalLogRecord["targetType"];
  targetId: string;
  targetLabel: string;
  message: string;
}) {
  try {
    await appendLog(input);
  } catch (error) {
    if (isApprovalLogEnumValueMissing(error)) {
      console.error("GitLab sync log skipped because ApprovalLogAction enum is outdated.", error);
      return;
    }

    throw error;
  }
}

function parseSelectedBranchFromUrl(repositoryTreeUrl: string) {
  if (!repositoryTreeUrl.trim()) {
    return "";
  }

  try {
    return parseGitLabTreeUrl(repositoryTreeUrl).branch;
  } catch {
    return "";
  }
}

function maskToken(token?: string) {
  const value = token?.trim() ?? "";
  if (!value) {
    return undefined;
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}****`;
  }

  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

async function readGitLabSyncSettingRecord() {
  return readAppSettingRecord(GITLAB_SYNC_SETTING_KEY);
}

async function readGitLabSyncSettingRecordOrThrow() {
  return readAppSettingRecordOrThrow(GITLAB_SYNC_SETTING_KEY);
}

async function readAppSettingRecord(key: string) {
  try {
    return await db.appSetting.findUnique({ where: { key } });
  } catch (error) {
    if (isGitLabSettingsTableMissing(error)) {
      return GITLAB_SYNC_STORAGE_MISSING;
    }
    throw error;
  }
}

async function readAppSettingRecordOrThrow(key: string) {
  try {
    return await db.appSetting.findUnique({ where: { key } });
  } catch (error) {
    if (isGitLabSettingsTableMissing(error)) {
      throw new Error(
        "当前数据库尚未创建 GitLab 同步配置表，请先执行数据库迁移（例如 npm run db:migrate:deploy）。",
      );
    }
    throw error;
  }
}

function isGitLabSettingsTableMissing(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: string;
    meta?: { modelName?: string; table?: string };
  };

  return (
    candidate.code === "P2021" &&
    (candidate.meta?.modelName === "AppSetting" || candidate.meta?.table === "public.AppSetting")
  );
}

function isApprovalLogEnumValueMissing(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error && typeof (error as { message?: unknown }).message === "string"
    ? (error as { message: string }).message
    : "";

  return message.includes('invalid input value for enum "ApprovalLogAction"');
}

async function bootstrapStore() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(STORAGE_DIR, { recursive: true });
  await db.$connect();

  const count = await db.submission.count();
  if (count > 0) {
    return;
  }

  if (existsSync(STORE_FILE)) {
    const raw = await readFile(STORE_FILE, "utf8");
    const normalized = normalizeStore(JSON.parse(raw));
    await importLegacyStore(normalized);
    return;
  }

  await seedDatabase();
}

async function importLegacyStore(store: HubStore) {
  if (store.submissions.length) {
    await db.submission.createMany({
      data: store.submissions.map((item) => ({
        id: item.id,
        slug: item.slug,
        displayName: item.displayName,
        version: item.version,
        namespace: item.namespace,
        summary: item.summary,
        description: item.description,
        changelog: item.changelog,
        category: item.category,
        tags: item.tags,
        authorName: item.authorName,
        authorEmail: item.authorEmail,
        status: item.status,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
        reviewedAt: item.reviewedAt ? new Date(item.reviewedAt) : null,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
        reviewNotes: item.reviewNotes ?? null,
        downloads: item.downloads,
        installsCurrent: item.installsCurrent,
        installsAllTime: item.installsAllTime,
        stars: item.stars,
        featured: item.featured,
        zipPath: item.zipPath,
        readme: item.readme,
        fileTree: item.fileTree as never,
        fileCount: item.fileCount,
        fingerprint: item.fingerprint,
        frontmatter: item.frontmatter as never,
      })),
    });
  }

  if (store.users.length) {
    await db.user.createMany({
      data: store.users.map((item) => ({
        id: item.id,
        username: item.username,
        email: item.email || "",
        displayName: item.displayName,
        passwordHash: item.passwordHash,
        role: item.role,
        roleLabel: item.roleLabel || "成员",
        organization: item.organization || "",
        createdAt: new Date(item.createdAt),
        createdBy: item.createdBy ?? null,
        disabled: Boolean(item.disabled),
      })),
    });
  }

  if (store.favorites.length) {
    await db.favorite.createMany({
      data: store.favorites.map((item) => ({
        id: randomUUID(),
        userId: item.userId,
        slug: item.slug,
        createdAt: new Date(item.createdAt),
      })),
    });
  }

  if (store.ratings.length) {
    await db.rating.createMany({
      data: store.ratings.map((item) => ({
        id: randomUUID(),
        userId: item.userId,
        slug: item.slug,
        rating: item.rating,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
    });
  }

  if (store.logs.length) {
    await db.approvalLog.createMany({
      data: store.logs.map((item) => ({
        id: item.id,
        action: toDbLogAction(item.action),
        actorType: item.actorType,
        actorName: item.actorName,
        targetType: item.targetType,
        targetId: item.targetId,
        targetLabel: item.targetLabel,
        message: item.message,
        createdAt: new Date(item.createdAt),
      })),
    });
  }

  const affectedSlugs = [...new Set(store.favorites.map((item) => item.slug))];
  await Promise.all(affectedSlugs.map((slug) => synchronizeFavoriteCount(slug)));
}

async function seedDatabase() {
  const seeds = await Promise.all([
    createSeedRecord({
      slug: "feature-full-lifecycle",
      displayName: "需求开发小助手",
      version: "v20260327.085732.1",
      summary:
        "覆盖从功能提出、立项、方案评审、开发实现到测试回归和上线准备的完整技能流。",
      changelog: "初始版本，新增全生命周期交付清单与阶段门禁模板。",
      category: "开发",
      tags: ["需求拆解", "项目管理", "交付流程"],
      authorName: "钟尔强",
      authorEmail: "zhongerqiang@apexhub.local",
      status: "published",
      featured: true,
      downloads: 13,
      installsCurrent: 10,
      installsAllTime: 13,
      stars: 5,
      reviewedAt: "2026-03-27T09:05:00.000Z",
      publishedAt: "2026-03-27T09:10:00.000Z",
      reviewNotes: "结构规范，交付说明完整，可公开发布。",
      files: {
        "SKILL.md": `---
title: Feature Full Lifecycle
description: 面向复杂需求的端到端开发技能，强调计划、门禁、评审和发布闭环。
tags:
  - demand
  - lifecycle
  - release
---

# Feature Full Lifecycle

## 适用场景

- 新功能从需求澄清到发布上线的一体化推进。
- 涉及多角色协作、评审门禁和较高交付风险的项目。

## 输入要求

- 功能名称与一句话目标。
- 业务背景、当前问题与预期收益。
- 约束条件、时间窗口与发布要求。

## 输出内容

- 阶段化行动计划。
- 开发与测试清单。
- 发布准备项与回滚预案。
`,
        "assets/overview.md": "此目录存放需求流程图、阶段模板与辅助素材。\n",
        "assets/release-checklist.md": "- 变更说明\n- 回滚方案\n- 观察指标\n",
        "templates/phase-gates.md": "## Gate 1\n需求冻结\n\n## Gate 2\n方案评审通过\n",
      },
    }),
    createSeedRecord({
      slug: "incident-playbook",
      displayName: "故障演练手册",
      version: "1.4.2",
      summary: "帮助团队在生产故障、降级演练和复盘环节快速统一响应动作。",
      changelog: "补充 30 分钟内的分级响应策略和升级通知模板。",
      category: "运维",
      tags: ["SRE", "故障响应", "复盘"],
      authorName: "Apex Reliability",
      authorEmail: "reliability@apexhub.local",
      status: "published",
      featured: false,
      downloads: 8,
      installsCurrent: 6,
      installsAllTime: 8,
      stars: 4,
      reviewedAt: "2026-04-03T02:00:00.000Z",
      publishedAt: "2026-04-03T02:10:00.000Z",
      reviewNotes: "覆盖值班流程与复盘模板，可以公开。",
      files: {
        "SKILL.md": `# Incident Playbook

面向生产事故处理的标准化技能，提供分级、通报、升级与复盘建议。

## 包含内容

- 告警初判流程
- 角色分工建议
- 复盘纪要模板
`,
        "runbooks/p1.md": "P1：全站不可用，立即升级到值班负责人。\n",
        "runbooks/p2.md": "P2：核心功能受影响，15 分钟内同步进展。\n",
      },
    }),
    createSeedRecord({
      slug: "workflow-architect",
      displayName: "工作流架构助手",
      version: "0.9.0-rc.1",
      summary: "用于复杂审批流、自动化链路和多系统集成设计的候选技能。",
      changelog: "候选版本，待管理员复审。",
      category: "架构",
      tags: ["workflow", "integration", "architecture"],
      authorName: "Apex Labs",
      authorEmail: "labs@apexhub.local",
      status: "pending",
      reviewNotes: "等待补充跨系统失败补偿说明。",
      files: {
        "SKILL.md": `# Workflow Architect

用于规划跨系统审批流、状态机与补偿机制的技能草案。

## 当前重点

- 状态设计
- 补偿策略
- 回放审计
`,
        "docs/state-machine.md": "初版状态机说明。\n",
      },
    }),
  ]);

  const seededUser = buildSeedUser({
    username: "demo",
    displayName: "演示用户",
    password: "demo123",
    createdBy: "system",
  });

  await importLegacyStore({
    version: 2,
    submissions: seeds,
    users: [seededUser],
    favorites: [
      { userId: seededUser.id, slug: "feature-full-lifecycle", createdAt: seededUser.createdAt },
    ],
    ratings: [
      {
        userId: seededUser.id,
        slug: "feature-full-lifecycle",
        rating: 5,
        createdAt: seededUser.createdAt,
        updatedAt: seededUser.createdAt,
      },
    ],
    logs: [],
  });
}

async function createSeedRecord(seed: SeedSpec): Promise<SubmissionRecord> {
  const archive = await createZipFromFiles(seed.files);
  const archiveMeta = await inspectSkillArchive(archive, {
    displayName: seed.displayName,
    summary: seed.summary,
  });
  const id = randomUUID();
  const now = seed.publishedAt || seed.reviewedAt || new Date().toISOString();
  const zipPath = await saveArchive(seed.slug, seed.version, id, archive);

  return {
    id,
    slug: seed.slug,
    displayName: seed.displayName,
    version: seed.version,
    namespace: DEFAULT_PROJECT_ID,
    projectId: DEFAULT_PROJECT_ID,
    projectName: DEFAULT_PROJECT_NAME,
    summary: seed.summary,
    description: archiveMeta.description,
    changelog: seed.changelog,
    category: seed.category,
    tags: seed.tags,
    authorName: seed.authorName,
    authorEmail: seed.authorEmail,
    status: seed.status,
    createdAt: now,
    updatedAt: now,
    reviewedAt: seed.reviewedAt,
    publishedAt: seed.publishedAt,
    reviewNotes: seed.reviewNotes,
    downloads: seed.downloads ?? 0,
    installsCurrent: seed.installsCurrent ?? 0,
    installsAllTime: seed.installsAllTime ?? 0,
    stars: seed.stars ?? 0,
    featured: Boolean(seed.featured),
    zipPath,
    readme: archiveMeta.readme,
    fileTree: archiveMeta.fileTree,
    fileCount: archiveMeta.fileCount,
    fingerprint: archiveMeta.fingerprint,
    frontmatter: archiveMeta.frontmatter,
  };
}

async function saveArchive(slug: string, version: string, id: string, archive: Buffer) {
  const folder = join(STORAGE_DIR, safeSegment(slug), safeSegment(version));
  await mkdir(folder, { recursive: true });
  const absolutePath = join(folder, `${id}.zip`);
  await writeFile(absolutePath, archive);
  return absolutePath.replace(`${process.cwd()}/`, "");
}

function normalizeStore(raw: Partial<HubStore> & { submissions?: SubmissionRecord[] }) {
  const submissions = (raw.submissions ?? [])
    .filter((item) => !REMOVED_TEST_SUBMISSION_IDS.has(item.id))
    .map((item) => ({
      ...item,
      namespace: item.namespace || DEFAULT_PROJECT_ID,
      projectId: item.projectId || item.namespace || DEFAULT_PROJECT_ID,
      projectName: item.projectName || resolveProjectName(item.namespace || DEFAULT_PROJECT_ID),
    }));
  const users = normalizeUsers(raw.users);
  const favorites = normalizeFavorites(raw.favorites, users, submissions);
  const ratings = normalizeRatings(raw.ratings, users, submissions);
  const logs = normalizeLogs(raw.logs);
  ensureSeedEngagement(users, favorites, ratings, submissions);
  const store: HubStore = {
    version: 2,
    submissions,
    users,
    favorites,
    ratings,
    logs,
  };

  for (const item of submissions) {
    item.stars = favorites.filter((entry) => entry.slug === item.slug).length;
  }

  return store;
}

function normalizeUsers(rawUsers: HubStore["users"] | undefined) {
  if (rawUsers?.length) {
    return rawUsers;
  }

  return [
    buildSeedUser({
      username: "demo",
      displayName: "演示用户",
      password: "demo123",
      createdBy: "system",
    }),
  ];
}

function normalizeFavorites(
  rawFavorites: FavoriteRecord[] | undefined,
  users: UserRecord[],
  submissions: SubmissionRecord[],
) {
  const userIds = new Set(users.map((item) => item.id));
  const slugs = new Set(submissions.map((item) => item.slug));
  return (rawFavorites ?? []).filter((item) => userIds.has(item.userId) && slugs.has(item.slug));
}

function normalizeRatings(
  rawRatings: RatingRecord[] | undefined,
  users: UserRecord[],
  submissions: SubmissionRecord[],
) {
  const userIds = new Set(users.map((item) => item.id));
  const slugs = new Set(submissions.map((item) => item.slug));
  return (rawRatings ?? []).filter(
    (item) =>
      userIds.has(item.userId) &&
      slugs.has(item.slug) &&
      Number.isFinite(item.rating) &&
      item.rating >= 1 &&
      item.rating <= 5,
  );
}

function normalizeLogs(rawLogs: ApprovalLogRecord[] | undefined) {
  return (rawLogs ?? []).filter(Boolean);
}

function ensureSeedEngagement(
  users: UserRecord[],
  favorites: FavoriteRecord[],
  ratings: RatingRecord[],
  submissions: SubmissionRecord[],
) {
  const demoUser = users.find((item) => item.username === "demo");
  const target = submissions.find((item) => item.slug === "feature-full-lifecycle");
  if (!demoUser || !target) {
    return;
  }

  if (!favorites.some((item) => item.userId === demoUser.id && item.slug === target.slug)) {
    favorites.push({ userId: demoUser.id, slug: target.slug, createdAt: demoUser.createdAt });
  }

  if (!ratings.some((item) => item.userId === demoUser.id && item.slug === target.slug)) {
    ratings.push({
      userId: demoUser.id,
      slug: target.slug,
      rating: 5,
      createdAt: demoUser.createdAt,
      updatedAt: demoUser.createdAt,
    });
  }
}

async function synchronizeFavoriteCount(slug: string) {
  const favoriteCount = await db.favorite.count({ where: { slug } });
  await db.submission.updateMany({ where: { slug }, data: { stars: favoriteCount } });
}

async function appendLog(input: {
  action: ApprovalLogAction;
  actorType: ApprovalLogRecord["actorType"];
  actorName: string;
  targetType: ApprovalLogRecord["targetType"];
  targetId: string;
  targetLabel: string;
  message: string;
}) {
  await db.approvalLog.create({
    data: {
      id: randomUUID(),
      action: toDbLogAction(input.action),
      actorType: input.actorType,
      actorName: input.actorName,
      targetType: input.targetType,
      targetId: input.targetId,
      targetLabel: input.targetLabel,
      message: input.message,
      createdAt: new Date(),
    },
  });
}

function groupCounts(values: string[]) {
  const map = new Map<string, number>();
  for (const value of values) {
    map.set(value, (map.get(value) ?? 0) + 1);
  }
  return map;
}

function groupRatings(records: RatingRecord[]) {
  const map = new Map<string, { total: number; ratingCount: number; averageRating: number }>();
  for (const record of records) {
    const existing = map.get(record.slug) ?? { total: 0, ratingCount: 0, averageRating: 0 };
    existing.total += record.rating;
    existing.ratingCount += 1;
    existing.averageRating = Number((existing.total / existing.ratingCount).toFixed(1));
    map.set(record.slug, existing);
  }
  return map;
}

function buildSeedUser({
  username,
  displayName,
  password,
  createdBy,
}: {
  username: string;
  displayName: string;
  password: string;
  createdBy?: string;
}): UserRecord {
  const createdAt = new Date().toISOString();
  return {
    id: randomUUID(),
    username,
    email: "",
    displayName,
    passwordHash: hashPassword(password, getAdminCredentials().sessionSecret),
    role: "user",
    roleLabel: "成员",
    organization: "",
    createdAt,
    createdBy,
    disabled: false,
  };
}

function mapSubmissions(rows: DbSubmission[]) {
  return rows.map(mapSubmission);
}

function mapSubmission(row: DbSubmission): SubmissionRecord {
  const projectId = row.namespace || DEFAULT_PROJECT_ID;
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    version: row.version,
    namespace: projectId,
    projectId,
    projectName: resolveProjectName(projectId),
    summary: row.summary,
    description: row.description,
    changelog: row.changelog,
    category: row.category,
    tags: row.tags,
    authorName: row.authorName,
    authorEmail: row.authorEmail,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString(),
    publishedAt: row.publishedAt?.toISOString(),
    reviewNotes: row.reviewNotes ?? undefined,
    downloads: row.downloads,
    installsCurrent: row.installsCurrent,
    installsAllTime: row.installsAllTime,
    stars: row.stars,
    featured: row.featured,
    zipPath: row.zipPath,
    readme: row.readme,
    fileTree: Array.isArray(row.fileTree) ? (row.fileTree as SubmissionRecord["fileTree"]) : [],
    fileCount: row.fileCount,
    fingerprint: row.fingerprint,
    frontmatter:
      row.frontmatter && typeof row.frontmatter === "object" && !Array.isArray(row.frontmatter)
        ? (row.frontmatter as Record<string, unknown>)
        : {},
  };
}

function mapUsers(rows: DbUser[]) {
  return rows.map(mapUser);
}

function mapUser(row: DbUser): UserRecord {
  return {
    id: row.id,
    username: row.username,
    email: row.email || "",
    displayName: row.displayName,
    passwordHash: row.passwordHash,
    role: row.role,
    roleLabel: row.roleLabel || "成员",
    organization: row.organization || "",
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ?? undefined,
    disabled: row.disabled,
  };
}

function mapLogs(rows: DbApprovalLog[]) {
  return rows.map(mapLog);
}

function mapLog(row: DbApprovalLog): ApprovalLogRecord {
  return {
    id: row.id,
    action: fromDbLogAction(row.action),
    actorType: row.actorType,
    actorName: row.actorName,
    targetType: row.targetType,
    targetId: row.targetId,
    targetLabel: row.targetLabel,
    message: row.message,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDbLogAction(action: ApprovalLogAction) {
  return action.replace(/-/g, "_") as DbApprovalLogAction;
}

function fromDbLogAction(action: DbApprovalLogAction) {
  return action.replace(/_/g, "-") as ApprovalLogAction;
}
