UPDATE "Submission"
SET "changelog" = '首次发布。'
WHERE "status" = 'published'
  AND "changelog" = '首个候选版本，等待管理员审批发布。';

CREATE INDEX "Submission_slug_status_publishedAt_idx"
ON "Submission"("slug", "status", "publishedAt");