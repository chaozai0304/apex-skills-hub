import type { CatalogItem, SubmissionRecord } from "@/lib/types";

function toMillis(value?: string) {
  return value ? new Date(value).getTime() : Date.now();
}

export function mapSkillListItem(entry: SubmissionRecord) {
  return {
    slug: entry.slug,
    displayName: entry.displayName,
    summary: entry.summary,
    tags: entry.tags,
    stats: {
      downloads: entry.downloads,
      installsCurrent: entry.installsCurrent,
      installsAllTime: entry.installsAllTime,
      stars: entry.stars,
    },
    createdAt: toMillis(entry.createdAt),
    updatedAt: toMillis(entry.updatedAt),
    latestVersion: {
      version: entry.version,
      createdAt: toMillis(entry.publishedAt ?? entry.createdAt),
      changelog: entry.changelog,
      license: null,
    },
  };
}

export function mapSkillDetail(entry: SubmissionRecord) {
  return {
    skill: {
      slug: entry.slug,
      displayName: entry.displayName,
      summary: entry.summary,
      tags: entry.tags,
      stats: {
        downloads: entry.downloads,
        installsCurrent: entry.installsCurrent,
        installsAllTime: entry.installsAllTime,
        stars: entry.stars,
      },
      createdAt: toMillis(entry.createdAt),
      updatedAt: toMillis(entry.updatedAt),
    },
    latestVersion: {
      version: entry.version,
      createdAt: toMillis(entry.publishedAt ?? entry.createdAt),
      changelog: entry.changelog,
      license: null,
    },
    owner: {
      handle: null,
      displayName: entry.authorName,
      image: null,
    },
    moderation: {
      isSuspicious: false,
      isMalwareBlocked: false,
      verdict: "clean",
      reasonCodes: ["manual_review_passed"],
      updatedAt: toMillis(entry.reviewedAt ?? entry.updatedAt),
      engineVersion: "apex-manual-review-1",
      summary: entry.reviewNotes ?? "管理员已完成人工审核。",
    },
  };
}

export function mapSkillVersion(entry: SubmissionRecord) {
  return {
    version: {
      version: entry.version,
      createdAt: toMillis(entry.publishedAt ?? entry.createdAt),
      changelog: entry.changelog,
      changelogSource: "user" as const,
      license: null,
      files: entry.fileTree,
    },
    skill: {
      slug: entry.slug,
      displayName: entry.displayName,
    },
  };
}

export function sortCatalog(items: CatalogItem[], sort: string | null) {
  const cloned = [...items];

  switch (sort) {
    case "downloads":
      return cloned.sort((a, b) => b.downloads - a.downloads);
    case "stars":
      return cloned.sort((a, b) => b.stars - a.stars);
    case "installsCurrent":
      return cloned.sort((a, b) => b.installsCurrent - a.installsCurrent);
    case "installsAllTime":
      return cloned.sort((a, b) => b.installsAllTime - a.installsAllTime);
    case "trending":
      return cloned.sort(
        (a, b) =>
          b.installsCurrent + b.stars * 2 - (a.installsCurrent + a.stars * 2),
      );
    default:
      return cloned.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
  }
}
