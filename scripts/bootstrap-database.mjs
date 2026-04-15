#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const steps = [
  ["npx", ["prisma", "generate"]],
  ["npx", ["prisma", "migrate", "deploy"]],
  ["node", ["scripts/import-json-to-postgres.mjs"]],
];

for (const [command, args] of steps) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
