#!/usr/bin/env node
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DATA_DIR = join(process.cwd(), "data");
const STORAGE_DIR = join(process.cwd(), "storage", "archives");
const STORE_FILE = join(DATA_DIR, "records.json");
const REMOVED_TEST_SUBMISSION_IDS = new Set(["76558742-5817-4d0b-9a91-8a485eaff921"]);

function toDbLogAction(action) {
  return action.replace(/-/g, "_");
}

function normalizeStore(raw) {
  const submissions = (raw.submissions ?? []).filter((item) => !REMOVED_TEST_SUBMISSION_IDS.has(item.id));
  const users = raw.users ?? [];
  const userIds = new Set(users.map((item) => item.id));
  const slugs = new Set(submissions.map((item) => item.slug));
  const favorites = (raw.favorites ?? []).filter((item) => userIds.has(item.userId) && slugs.has(item.slug));
  const ratings = (raw.ratings ?? []).filter(
    (item) => userIds.has(item.userId) && slugs.has(item.slug) && item.rating >= 1 && item.rating <= 5,
  );
  const logs = raw.logs ?? [];
  return { submissions, users, favorites, ratings, logs };
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(STORAGE_DIR, { recursive: true });

  const count = await prisma.submission.count();
  if (count > 0) {
    console.log("[db-import] Database already has submissions, skip legacy JSON import.");
    return;
  }

  if (!existsSync(STORE_FILE)) {
    console.log("[db-import] data/records.json not found, skip legacy JSON import.");
    return;
  }

  const raw = JSON.parse(await readFile(STORE_FILE, "utf8"));
  const store = normalizeStore(raw);

  if (store.submissions.length) {
    await prisma.submission.createMany({
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
        fileTree: item.fileTree,
        fileCount: item.fileCount,
        fingerprint: item.fingerprint,
        frontmatter: item.frontmatter ?? {},
      })),
    });
  }

  if (store.users.length) {
    await prisma.user.createMany({
      data: store.users.map((item) => ({
        id: item.id,
        username: item.username,
        displayName: item.displayName,
        passwordHash: item.passwordHash,
        role: item.role,
        createdAt: new Date(item.createdAt),
        createdBy: item.createdBy ?? null,
        disabled: Boolean(item.disabled),
      })),
    });
  }

  if (store.favorites.length) {
    await prisma.favorite.createMany({
      data: store.favorites.map((item) => ({
        id: randomUUID(),
        userId: item.userId,
        slug: item.slug,
        createdAt: new Date(item.createdAt),
      })),
    });
  }

  if (store.ratings.length) {
    await prisma.rating.createMany({
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
    await prisma.approvalLog.createMany({
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

  const favoriteCounts = new Map();
  for (const item of store.favorites) {
    favoriteCounts.set(item.slug, (favoriteCounts.get(item.slug) ?? 0) + 1);
  }
  await Promise.all(
    [...favoriteCounts.entries()].map(([slug, stars]) =>
      prisma.submission.updateMany({ where: { slug }, data: { stars } }),
    ),
  );

  console.log(`[db-import] Imported ${store.submissions.length} submissions from legacy JSON.`);
}

main()
  .catch((error) => {
    console.error("[db-import] Failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
