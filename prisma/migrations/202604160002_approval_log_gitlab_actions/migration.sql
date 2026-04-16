ALTER TYPE "ApprovalLogAction" ADD VALUE IF NOT EXISTS 'gitlab_sync_succeeded';
ALTER TYPE "ApprovalLogAction" ADD VALUE IF NOT EXISTS 'gitlab_sync_failed';
