export type SubmissionStatus = "pending" | "published" | "rejected";
export type UserRole = "user";
export type ApprovalLogAction =
  | "skill-submitted"
  | "skill-approved"
  | "skill-rejected"
  | "skill-deleted"
  | "gitlab-sync-succeeded"
  | "gitlab-sync-failed"
  | "user-created"
  | "user-enabled"
  | "user-disabled"
  | "password-changed";

export type GitLabSyncConfig = {
  id?: string;
  name?: string;
  enabled: boolean;
  repositoryTreeUrl: string;
  branch: string;
  token: string;
  adminUserIds?: string[];
  notifyEmails?: string[];
};

export type GitLabSyncProject = Required<Pick<GitLabSyncConfig, "id" | "name" | "enabled" | "repositoryTreeUrl" | "branch" | "token">> & {
  adminUserIds: string[];
  notifyEmails: string[];
};

export type FeishuNotificationConfig = {
  enabled: boolean;
  appId: string;
  appSecret: string;
  chatId: string;
};

export type FeishuNotificationSummary = {
  enabled: boolean;
  appId: string;
  hasAppSecret: boolean;
  maskedAppSecret?: string;
  chatId: string;
  updatedAt?: string;
  storageReady?: boolean;
  issue?: string;
};

export type ProjectOption = {
  id: string;
  name: string;
  enabled: boolean;
  projectPath?: string;
  branch?: string;
  basePath?: string;
};

export type GitLabBranchOption = {
  name: string;
  isDefault?: boolean;
};

export type GitLabSyncConfigSummary = {
  id?: string;
  name?: string;
  enabled: boolean;
  repositoryTreeUrl: string;
  branch: string;
  hasToken: boolean;
  maskedToken?: string;
  adminUserIds?: string[];
  notifyEmails?: string[];
  updatedAt?: string;
  projectPath?: string;
  basePath?: string;
  storageReady?: boolean;
  issue?: string;
  availableBranches?: GitLabBranchOption[];
  projects?: GitLabSyncConfigSummary[];
};

export type GitLabSyncResult = {
  attempted: boolean;
  synced: boolean;
  message?: string;
  targetPath?: string;
};

export type GitLabConnectionTestResult = {
  ok: boolean;
  message: string;
  projectPath?: string;
  branch?: string;
  basePath?: string;
  availableBranches?: GitLabBranchOption[];
};

export type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
};

export type SubmissionRecord = {
  id: string;
  slug: string;
  displayName: string;
  version: string;
  namespace: string;
  projectId: string;
  projectName: string;
  summary: string;
  description: string;
  changelog: string;
  category: string;
  tags: string[];
  authorName: string;
  authorEmail: string;
  status: SubmissionStatus;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  publishedAt?: string;
  reviewNotes?: string;
  downloads: number;
  installsCurrent: number;
  installsAllTime: number;
  stars: number;
  featured: boolean;
  zipPath: string;
  readme: string;
  fileTree: FileNode[];
  fileCount: number;
  fingerprint: string;
  frontmatter: Record<string, unknown>;
};

export type UserRecord = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  passwordHash: string;
  role: UserRole;
  roleLabel: string;
  organization: string;
  createdAt: string;
  createdBy?: string;
  disabled?: boolean;
};

export type FavoriteRecord = {
  userId: string;
  slug: string;
  createdAt: string;
};

export type RatingRecord = {
  userId: string;
  slug: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
};

export type ApprovalLogRecord = {
  id: string;
  action: ApprovalLogAction;
  actorType: "admin" | "user" | "system";
  actorName: string;
  targetType: "skill" | "user";
  targetId: string;
  targetLabel: string;
  message: string;
  createdAt: string;
};

export type HubStore = {
  version: number;
  submissions: SubmissionRecord[];
  users: UserRecord[];
  favorites: FavoriteRecord[];
  ratings: RatingRecord[];
  logs: ApprovalLogRecord[];
};

export type CatalogItem = {
  id: string;
  slug: string;
  displayName: string;
  summary: string;
  category: string;
  tags: string[];
  authorName: string;
  version: string;
  updatedAt: string;
  downloads: number;
  installsCurrent: number;
  installsAllTime: number;
  stars: number;
  featured: boolean;
  fileCount: number;
  projectId: string;
  projectName: string;
};

export type SkillDetail = {
  latest: SubmissionRecord;
  versions: SubmissionRecord[];
};

export type SkillEngagementSummary = {
  favoriteCount: number;
  averageRating: number;
  ratingCount: number;
  isFavorited: boolean;
  currentUserRating: number | null;
};

export type UserDashboardData = {
  submissions: SubmissionRecord[];
  reviewSubmissions: SubmissionRecord[];
  favorites: SubmissionRecord[];
  ratings: Array<{
    submission: SubmissionRecord;
    rating: number;
    updatedAt: string;
  }>;
};

export type LeaderboardEntry = {
  slug: string;
  displayName: string;
  version: string;
  category: string;
  summary: string;
  favoriteCount: number;
  averageRating: number;
  ratingCount: number;
  downloads: number;
};

export type LeaderboardData = {
  favorites: LeaderboardEntry[];
  ratings: LeaderboardEntry[];
};

export type ReviewDecision = "approve" | "reject";
