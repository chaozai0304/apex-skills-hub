#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const [submissions, users, favorites, ratings, logs] = await Promise.all([
    db.submission.findMany({
      select: { slug: true, version: true, status: true },
      orderBy: { slug: "asc" },
    }),
    db.user.findMany({
      select: { username: true, disabled: true },
      orderBy: { username: "asc" },
    }),
    db.favorite.count(),
    db.rating.count(),
    db.approvalLog.count(),
  ]);

  console.log(
    JSON.stringify(
      {
        submissions,
        users,
        favorites,
        ratings,
        logs,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
