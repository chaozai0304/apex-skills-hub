export type SubmissionStatus = "pending" | "published" | "rejected";
export type UserRole = "user";
export type ApprovalLogAction =
  | "skill-submitted"
  | "skill-approved"
  | "skill-rejected"
  | "skill-deleted"
  | "user-created"
  | "user-enabled"
  | "user-disabled"
  | "password-changed";

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
  displayName: string;
  passwordHash: string;
  role: UserRole;
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
