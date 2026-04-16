import type {
  GitLabBranchOption,
  GitLabConnectionTestResult,
  GitLabSyncConfig,
  GitLabSyncResult,
  SubmissionRecord,
} from "@/lib/types";

export type ParsedGitLabTreeTarget = {
  origin: string;
  projectPath: string;
  projectId: string;
  branch: string;
  basePath: string;
};

type SyncArchiveFile = {
  path: string;
  contentBase64: string;
};

type GitLabTreeNode = {
  id: string;
  name: string;
  type: "tree" | "blob";
  path: string;
  mode: string;
};

export function parseGitLabTreeUrl(input: string): ParsedGitLabTreeTarget {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    throw new Error("GitLab 地址格式不正确。请提供仓库目录页地址。\n例如：http://host/group/project/-/tree/master/.github/skills");
  }

  const match = url.pathname.match(/^\/(.+?)\/-\/tree\/([^/]+)(?:\/(.*))?$/);
  if (!match) {
    throw new Error("GitLab 地址必须是类似 /group/project/-/tree/<branch>/<path> 的目录地址。");
  }

  const projectPath = decodeURIComponent(match[1]);
  const branch = decodeURIComponent(match[2]);
  const basePath = decodeURIComponent(match[3] ?? "").replace(/^\/+|\/+$/g, "");

  return {
    origin: url.origin,
    projectPath,
    projectId: encodeURIComponent(projectPath),
    branch,
    basePath,
  };
}

export function buildGitLabSkillRootPath(target: ParsedGitLabTreeTarget, slug: string) {
  return [target.basePath, slug].filter(Boolean).join("/");
}

export function applySelectedBranch(target: ParsedGitLabTreeTarget, branch?: string) {
  const nextBranch = branch?.trim();
  if (!nextBranch) {
    return target;
  }

  return {
    ...target,
    branch: nextBranch,
  };
}

function buildGitLabHeaders(token: string) {
  return {
    "content-type": "application/json",
    "PRIVATE-TOKEN": token,
  };
}

async function parseGitLabError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.message === "string") {
      return data.message;
    }
    if (Array.isArray(data?.message)) {
      return data.message.join("; ");
    }
    if (data?.error) {
      return String(data.error);
    }
    return JSON.stringify(data);
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

async function listExistingFiles(
  target: ParsedGitLabTreeTarget,
  token: string,
  rootPath: string,
) {
  const url = new URL(`${target.origin}/api/v4/projects/${target.projectId}/repository/tree`);
  url.searchParams.set("ref", target.branch);
  url.searchParams.set("recursive", "true");
  url.searchParams.set("per_page", "100");
  url.searchParams.set("path", rootPath);

  const response = await fetch(url, {
    headers: buildGitLabHeaders(token),
    cache: "no-store",
  });

  if (response.status === 404) {
    return [] as GitLabTreeNode[];
  }

  if (!response.ok) {
    throw new Error(`读取 GitLab 目录失败：${await parseGitLabError(response)}`);
  }

  return (await response.json()) as GitLabTreeNode[];
}

export async function listGitLabBranches(config: {
  repositoryTreeUrl: string;
  token: string;
}): Promise<GitLabBranchOption[]> {
  const repositoryTreeUrl = config.repositoryTreeUrl.trim();
  const token = config.token.trim();

  if (!repositoryTreeUrl) {
    throw new Error("请先填写 GitLab 目录地址。");
  }

  if (!token) {
    throw new Error("请先提供 GitLab 授权码。");
  }

  const target = parseGitLabTreeUrl(repositoryTreeUrl);
  const url = new URL(`${target.origin}/api/v4/projects/${target.projectId}/repository/branches`);
  url.searchParams.set("per_page", "100");

  const response = await fetch(url, {
    headers: buildGitLabHeaders(token),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`读取 GitLab 分支列表失败：${await parseGitLabError(response)}`);
  }

  const branches = (await response.json()) as Array<{ name: string; default?: boolean }>;
  return branches.map((branch) => ({
    name: branch.name,
    isDefault: Boolean(branch.default),
  }));
}

export async function testGitLabConnection(config: {
  repositoryTreeUrl: string;
  token: string;
  branch?: string;
}): Promise<GitLabConnectionTestResult> {
  const repositoryTreeUrl = config.repositoryTreeUrl.trim();
  const token = config.token.trim();

  if (!repositoryTreeUrl) {
    throw new Error("请先填写 GitLab 目录地址。");
  }

  if (!token) {
    throw new Error("请先提供 GitLab 授权码。");
  }

  const target = applySelectedBranch(parseGitLabTreeUrl(repositoryTreeUrl), config.branch);
  const branches = await listGitLabBranches({ repositoryTreeUrl, token });
  const treeUrl = new URL(`${target.origin}/api/v4/projects/${target.projectId}/repository/tree`);
  treeUrl.searchParams.set("ref", target.branch);
  treeUrl.searchParams.set("per_page", "1");
  if (target.basePath) {
    treeUrl.searchParams.set("path", target.basePath);
  }

  const response = await fetch(treeUrl, {
    headers: buildGitLabHeaders(token),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`连接 GitLab 失败：${await parseGitLabError(response)}`);
  }

  return {
    ok: true,
    message: `GitLab 连接成功，可访问 ${target.projectPath}@${target.branch}${target.basePath ? `/${target.basePath}` : ""}`,
    projectPath: target.projectPath,
    branch: target.branch,
    basePath: target.basePath,
    availableBranches: branches,
  };
}

export async function syncSubmissionToGitLab(options: {
  submission: SubmissionRecord;
  config: GitLabSyncConfig;
  files: SyncArchiveFile[];
}): Promise<GitLabSyncResult> {
  if (!options.config.enabled) {
    return { attempted: false, synced: false, message: "GitLab 同步未启用。" };
  }

  if (!options.config.repositoryTreeUrl.trim() || !options.config.token.trim()) {
    return { attempted: false, synced: false, message: "GitLab 同步配置不完整。" };
  }

  const target = applySelectedBranch(
    parseGitLabTreeUrl(options.config.repositoryTreeUrl),
    options.config.branch,
  );
  const rootPath = buildGitLabSkillRootPath(target, options.submission.slug);
  const existingTree = await listExistingFiles(target, options.config.token, rootPath);
  const existingFiles = existingTree.filter((item) => item.type === "blob").map((item) => item.path);

  const desiredFiles = options.files.map((file) => ({
    file_path: `${rootPath}/${file.path}`,
    content: file.contentBase64,
    encoding: "base64" as const,
  }));
  const desiredPaths = new Set(desiredFiles.map((file) => file.file_path));

  const actions = [
    ...desiredFiles.map((file) => ({
      action: existingFiles.includes(file.file_path) ? ("update" as const) : ("create" as const),
      ...file,
    })),
    ...existingFiles
      .filter((path) => !desiredPaths.has(path))
      .map((path) => ({
        action: "delete" as const,
        file_path: path,
      })),
  ];

  if (!actions.length) {
    return {
      attempted: true,
      synced: true,
      message: "GitLab 中已是最新内容，无需更新。",
      targetPath: rootPath,
    };
  }

  const commitUrl = `${target.origin}/api/v4/projects/${target.projectId}/repository/commits`;
  const response = await fetch(commitUrl, {
    method: "POST",
    headers: buildGitLabHeaders(options.config.token),
    body: JSON.stringify({
      branch: target.branch,
      commit_message: `sync skill ${options.submission.slug}@${options.submission.version}`,
      actions,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`同步到 GitLab 失败：${await parseGitLabError(response)}`);
  }

  return {
    attempted: true,
    synced: true,
    message: `已同步到 ${target.projectPath}/${rootPath}`,
    targetPath: rootPath,
  };
}

export async function deleteSkillFromGitLab(options: {
  slug: string;
  config: GitLabSyncConfig;
}): Promise<GitLabSyncResult> {
  if (!options.config.repositoryTreeUrl.trim() || !options.config.token.trim()) {
    return { attempted: false, synced: false, message: "GitLab 同步配置不完整。" };
  }

  const target = applySelectedBranch(
    parseGitLabTreeUrl(options.config.repositoryTreeUrl),
    options.config.branch,
  );
  const rootPath = buildGitLabSkillRootPath(target, options.slug);
  const existingTree = await listExistingFiles(target, options.config.token, rootPath);
  const existingFiles = existingTree.filter((item) => item.type === "blob").map((item) => item.path);

  if (!existingFiles.length) {
    return {
      attempted: true,
      synced: true,
      message: "GitLab 中未找到需要删除的同名技能目录。",
      targetPath: rootPath,
    };
  }

  const response = await fetch(`${target.origin}/api/v4/projects/${target.projectId}/repository/commits`, {
    method: "POST",
    headers: buildGitLabHeaders(options.config.token),
    body: JSON.stringify({
      branch: target.branch,
      commit_message: `delete skill ${options.slug}`,
      actions: existingFiles.map((filePath) => ({
        action: "delete",
        file_path: filePath,
      })),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`删除 GitLab 技能目录失败：${await parseGitLabError(response)}`);
  }

  return {
    attempted: true,
    synced: true,
    message: `已从 ${target.projectPath}/${rootPath} 删除镜像文件`,
    targetPath: rootPath,
  };
}
