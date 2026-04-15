CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'published', 'rejected');
CREATE TYPE "UserRole" AS ENUM ('user');
CREATE TYPE "ApprovalLogAction" AS ENUM (
  'skill_submitted',
  'skill_approved',
  'skill_rejected',
  'skill_deleted',
  'user_created',
  'user_enabled',
  'user_disabled',
  'password_changed'
);
CREATE TYPE "ApprovalActorType" AS ENUM ('admin', 'user', 'system');
CREATE TYPE "ApprovalTargetType" AS ENUM ('skill', 'user');

CREATE TABLE "Submission" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "namespace" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "changelog" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "authorName" TEXT NOT NULL,
  "authorEmail" TEXT NOT NULL,
  "status" "SubmissionStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "reviewedAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "reviewNotes" TEXT,
  "downloads" INTEGER NOT NULL DEFAULT 0,
  "installsCurrent" INTEGER NOT NULL DEFAULT 0,
  "installsAllTime" INTEGER NOT NULL DEFAULT 0,
  "stars" INTEGER NOT NULL DEFAULT 0,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "zipPath" TEXT NOT NULL,
  "readme" TEXT NOT NULL,
  "fileTree" JSONB NOT NULL,
  "fileCount" INTEGER NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "frontmatter" JSONB NOT NULL,
  CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP(3) NOT NULL,
  "createdBy" TEXT,
  "disabled" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Favorite" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Rating" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalLog" (
  "id" TEXT NOT NULL,
  "action" "ApprovalLogAction" NOT NULL,
  "actorType" "ApprovalActorType" NOT NULL,
  "actorName" TEXT NOT NULL,
  "targetType" "ApprovalTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "targetLabel" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ApprovalLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Submission_slug_version_key" ON "Submission"("slug", "version");
CREATE INDEX "Submission_slug_status_idx" ON "Submission"("slug", "status");
CREATE INDEX "Submission_status_updatedAt_idx" ON "Submission"("status", "updatedAt");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "Favorite_userId_slug_key" ON "Favorite"("userId", "slug");
CREATE INDEX "Favorite_slug_idx" ON "Favorite"("slug");
CREATE UNIQUE INDEX "Rating_userId_slug_key" ON "Rating"("userId", "slug");
CREATE INDEX "Rating_slug_idx" ON "Rating"("slug");
CREATE INDEX "ApprovalLog_createdAt_idx" ON "ApprovalLog"("createdAt");
