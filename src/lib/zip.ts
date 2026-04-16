import { createHash } from "node:crypto";

import matter from "gray-matter";
import JSZip from "jszip";

import type { FileNode } from "@/lib/types";

const TEXT_EXTENSIONS = new Set([
  "md",
  "mdx",
  "txt",
  "json",
  "json5",
  "yaml",
  "yml",
  "toml",
  "js",
  "cjs",
  "mjs",
  "ts",
  "tsx",
  "jsx",
  "py",
  "sh",
  "rb",
  "go",
  "rs",
  "swift",
  "kt",
  "java",
  "cs",
  "cpp",
  "c",
  "h",
  "hpp",
  "sql",
  "csv",
  "ini",
  "cfg",
  "env",
  "xml",
  "html",
  "css",
  "scss",
  "sass",
  "svg",
]);

type InspectOptions = {
  displayName?: string;
  summary?: string;
};

type TextFile = {
  path: string;
  sha256: string;
  content: string;
};

export type ArchiveEntry = {
  path: string;
  contentBase64: string;
};

export async function inspectSkillArchive(buffer: Buffer, options: InspectOptions = {}) {
  const zip = await JSZip.loadAsync(await normalizeSkillArchive(buffer));
  const filePaths: string[] = [];
  const textFiles: TextFile[] = [];
  let readme = "";

  const entries = Object.values(zip.files).sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.dir) {
      continue;
    }

    const safePath = sanitizeZipPath(entry.name);
    if (!safePath) {
      continue;
    }

    filePaths.push(safePath);

    const ext = safePath.split(".").pop()?.toLowerCase() ?? "";
    const bytes = Buffer.from(await entry.async("uint8array"));

    if (TEXT_EXTENSIONS.has(ext)) {
      const content = bytes.toString("utf8");
      textFiles.push({
        path: safePath,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        content,
      });
    }

    if (!readme && safePath.toLowerCase().endsWith("skill.md")) {
      readme = bytes.toString("utf8");
    }
  }

  if (!readme) {
    throw new Error("压缩包中必须包含 SKILL.md 文件。");
  }

  const parsed = matter(readme);
  const body = parsed.content.trim();
  const title =
    options.displayName ?? getString(parsed.data.title) ?? extractFirstHeading(body) ?? "未命名技能";
  const summary =
    options.summary ??
    getString(parsed.data.description) ??
    extractFirstParagraph(body) ??
    "尚未提供摘要。";

  return {
    readme,
    displayName: title,
    summary,
    description: extractDescription(body, summary),
    frontmatter: parsed.data as Record<string, unknown>,
    fileTree: buildFileTree(filePaths),
    fileCount: filePaths.length,
    fingerprint: buildFingerprint(textFiles),
  };
}

export async function createZipFromFiles(files: Record<string, string>) {
  const zip = new JSZip();

  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }

  return Buffer.from(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }));
}

export async function normalizeSkillArchive(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files).sort((a, b) => a.name.localeCompare(b.name));
  const safePaths = entries
    .filter((entry) => !entry.dir)
    .map((entry) => sanitizeZipPath(entry.name))
    .filter((path): path is string => Boolean(path));

  if (!safePaths.length) {
    return buffer;
  }

  const rootSegments = safePaths.map((path) => path.split("/")[0]);
  const sharedRoot = rootSegments[0];
  const hasSingleSharedRoot =
    Boolean(sharedRoot) &&
    safePaths.every((path) => path.includes("/")) &&
    rootSegments.every((segment) => segment === sharedRoot);

  if (!hasSingleSharedRoot) {
    return buffer;
  }

  const normalized = new JSZip();

  for (const entry of entries) {
    if (entry.dir) {
      continue;
    }

    const safePath = sanitizeZipPath(entry.name);
    if (!safePath) {
      continue;
    }

    const trimmedPath = safePath.split("/").slice(1).join("/");
    if (!trimmedPath) {
      continue;
    }

    normalized.file(trimmedPath, await entry.async("uint8array"));
  }

  return Buffer.from(
    await normalized.generateAsync({ type: "uint8array", compression: "DEFLATE" }),
  );
}

export async function extractArchiveEntries(buffer: Buffer): Promise<ArchiveEntry[]> {
  const zip = await JSZip.loadAsync(await normalizeSkillArchive(buffer));
  const entries = Object.values(zip.files).sort((a, b) => a.name.localeCompare(b.name));
  const files: ArchiveEntry[] = [];

  for (const entry of entries) {
    if (entry.dir) {
      continue;
    }

    const safePath = sanitizeZipPath(entry.name);
    if (!safePath) {
      continue;
    }

    const bytes = Buffer.from(await entry.async("uint8array"));
    files.push({
      path: safePath,
      contentBase64: bytes.toString("base64"),
    });
  }

  return files;
}

function getString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sanitizeZipPath(value: string) {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "").replace(/^\.\//, "");

  if (!normalized || normalized.includes("..") || normalized.startsWith("__MACOSX/")) {
    return null;
  }

  return normalized;
}

function extractFirstHeading(content: string) {
  const match = content.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim() || null;
}

function extractFirstParagraph(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#") && !line.startsWith("- "));

  return lines[0] || null;
}

function extractDescription(content: string, fallback: string) {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.startsWith("#"));

  return paragraphs.slice(0, 2).join("\n\n") || fallback;
}

function buildFingerprint(files: TextFile[]) {
  const payload = files
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((file) => `${file.path}:${file.sha256}`)
    .join("\n");

  return createHash("sha256").update(payload).digest("hex");
}

function buildFileTree(paths: string[]) {
  const roots: FileNode[] = [];

  for (const path of paths) {
    const parts = path.split("/");
    let level = roots;
    let currentPath = "";

    for (const [index, part] of parts.entries()) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isLast = index === parts.length - 1;
      let node = level.find((item) => item.name === part);

      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isLast ? "file" : "directory",
          children: isLast ? undefined : [],
        };
        level.push(node);
      }

      if (!isLast) {
        node.children ??= [];
        level = node.children;
      }
    }
  }

  return sortTree(roots);
}

function sortTree(nodes: FileNode[]): FileNode[] {
  return nodes
    .map((node) => ({
      ...node,
      children: node.children ? sortTree(node.children) : undefined,
    }))
    .sort((left, right) => {
      if (left.type !== right.type) {
        return left.type === "directory" ? -1 : 1;
      }
      return left.name.localeCompare(right.name);
    });
}
