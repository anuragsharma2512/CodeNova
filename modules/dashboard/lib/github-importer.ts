import JSZip from "jszip";
import path from "path";
import { TemplateFile, TemplateFolder, TemplateItem } from "@/modules/playground/lib/path-to-json";

export interface ParsedRepoInfo {
  owner: string;
  repo: string;
  branch?: string;
}

export interface ImportResult {
  title: string;
  description: string;
  template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
  templateFolder: TemplateFolder;
  fileCount: number;
}

const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".turbo",
  ".vscode",
  ".idea",
  "coverage",
  ".cache",
  ".output",
]);

const IGNORED_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  ".DS_Store",
  "thumbs.db",
]);

const BINARY_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "ico",
  "webp",
  "pdf",
  "zip",
  "tar",
  "gz",
  "mp4",
  "mp3",
  "woff",
  "woff2",
  "ttf",
  "eot",
  "exe",
  "bin",
  "lockb",
]);

const MAX_FILE_SIZE = 500 * 1024; // 500 KB limit for individual files

/**
 * Robust fetch helper that attempts authenticated request first (if token provided).
 * If GitHub rejects with 401 Unauthorized (expired / invalid token), it automatically
 * retries anonymously so public repositories succeed seamlessly.
 */
async function fetchFromGitHub(
  url: string,
  token?: string,
  accept = "application/vnd.github+json"
): Promise<Response> {
  const baseHeaders: Record<string, string> = {
    "User-Agent": "CodeNova-Web-App",
    Accept: accept,
  };

  if (token) {
    const authHeaders = {
      ...baseHeaders,
      Authorization: `Bearer ${token}`,
    };

    const res = await fetch(url, { headers: authHeaders });

    // If token is invalid or expired (401), fallback to unauthenticated request
    if (res.status === 401) {
      console.warn(`[GitHub Importer] GitHub token returned 401 for ${url}. Retrying without authentication...`);
      return await fetch(url, { headers: baseHeaders });
    }

    return res;
  }

  return await fetch(url, { headers: baseHeaders });
}

/**
 * Parses user input to extract GitHub owner, repo, and optional branch.
 */
export function parseGitHubUrl(input: string): ParsedRepoInfo {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Repository URL cannot be empty.");
  }

  // Remove trailing .git
  const cleanInput = trimmed.replace(/\.git$/, "");

  // Match: github.com/:owner/:repo(/tree/:branch...)?
  const urlRegex = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/i;
  const urlMatch = cleanInput.match(urlRegex);

  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
      branch: urlMatch[3],
    };
  }

  // Match simple owner/repo syntax
  const shortRegex = /^([^/]+)\/([^/]+)$/;
  const shortMatch = cleanInput.match(shortRegex);

  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
    };
  }

  throw new Error("Invalid GitHub repository URL. Expected format: https://github.com/owner/repo or owner/repo");
}

/**
 * Detects the most appropriate template enum value based on package.json dependencies
 */
export function detectTemplate(packageJsonContent?: string): "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR" {
  if (!packageJsonContent) return "REACT";

  try {
    const pkg = JSON.parse(packageJsonContent);
    const allDeps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    if (allDeps["next"]) return "NEXTJS";
    if (allDeps["@angular/core"]) return "ANGULAR";
    if (allDeps["vue"] || allDeps["nuxt"]) return "VUE";
    if (allDeps["hono"]) return "HONO";
    if (allDeps["express"]) return "EXPRESS";
    if (allDeps["react"]) return "REACT";
  } catch (err) {
    console.warn("Failed to parse package.json for template detection", err);
  }

  return "REACT";
}

/**
 * Constructs a recursive TemplateFolder tree from a list of relative file paths and contents.
 */
function buildTemplateFolderTree(
  files: Array<{ relativePath: string; content: string }>
): TemplateFolder {
  interface DirNode {
    files: Array<{ name: string; ext: string; content: string }>;
    dirs: Map<string, DirNode>;
  }

  const rootDir: DirNode = { files: [], dirs: new Map() };

  for (const { relativePath, content } of files) {
    const parts = relativePath.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    const filenameWithExt = parts.pop()!;
    let currentDir = rootDir;

    for (const dirName of parts) {
      if (!currentDir.dirs.has(dirName)) {
        currentDir.dirs.set(dirName, { files: [], dirs: new Map() });
      }
      currentDir = currentDir.dirs.get(dirName)!;
    }

    const parsed = path.parse(filenameWithExt);
    const ext = parsed.ext.replace(/^\./, "");
    currentDir.files.push({
      name: parsed.name,
      ext: ext,
      content,
    });
  }

  function convertDirNode(folderName: string, node: DirNode): TemplateFolder {
    const items: TemplateItem[] = [];

    // Add subfolders
    for (const [subDirName, subNode] of node.dirs.entries()) {
      items.push(convertDirNode(subDirName, subNode));
    }

    // Add files
    for (const file of node.files) {
      items.push({
        filename: file.name,
        fileExtension: file.ext,
        content: file.content,
      } as TemplateFile);
    }

    return {
      folderName,
      items,
    };
  }

  return convertDirNode("Root", rootDir);
}

/**
 * Downloads a GitHub repository zipball and transforms it into CodeNova's TemplateFolder format.
 */
export async function importGitHubRepo({
  owner,
  repo,
  branch,
  token,
}: {
  owner: string;
  repo: string;
  branch?: string;
  token?: string;
}): Promise<ImportResult> {
  // 1. Fetch Repo metadata (with automatic 401 fallback to public)
  const metaUrl = `https://api.github.com/repos/${owner}/${repo}`;
  const metaRes = await fetchFromGitHub(metaUrl, token);

  if (!metaRes.ok) {
    if (metaRes.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" was not found or is private.`);
    }
    if (metaRes.status === 403) {
      throw new Error("GitHub API rate limit exceeded. Please try again later or sign in with GitHub.");
    }
    throw new Error(`Failed to fetch repository information from GitHub (HTTP ${metaRes.status}).`);
  }

  const metaData = await metaRes.json();
  const targetBranch = branch || metaData.default_branch || "main";
  const repoTitle = metaData.name || repo;
  const repoDescription = metaData.description || `Imported from GitHub: ${owner}/${repo}`;

  // 2. Download zipball
  const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball/${targetBranch}`;
  const zipRes = await fetchFromGitHub(zipUrl, token, "*/*");

  if (!zipRes.ok) {
    throw new Error(`Failed to download repository archive (HTTP ${zipRes.status}).`);
  }

  const arrayBuffer = await zipRes.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 3. Process zip entries
  const extractedFiles: Array<{ relativePath: string; content: string }> = [];
  let packageJsonContent: string | undefined;

  const entries = Object.keys(zip.files);
  if (entries.length === 0) {
    throw new Error("The downloaded repository archive was empty.");
  }

  // GitHub zipballs root directory is named `{owner}-{repo}-{sha}/`
  const rootPrefix = entries[0].split("/")[0] + "/";

  for (const entryPath of entries) {
    const zipEntry = zip.files[entryPath];
    if (zipEntry.dir) continue;

    // Strip top-level GitHub folder name
    let relativePath = entryPath;
    if (relativePath.startsWith(rootPrefix)) {
      relativePath = relativePath.slice(rootPrefix.length);
    }

    if (!relativePath) continue;

    const pathSegments = relativePath.split("/");
    const fileName = pathSegments[pathSegments.length - 1];

    // Check ignored directories
    const hasIgnoredDir = pathSegments.slice(0, -1).some((dir) => IGNORED_DIRECTORIES.has(dir));
    if (hasIgnoredDir) continue;

    // Check ignored files
    if (IGNORED_FILES.has(fileName)) continue;

    // Check binary extensions
    const ext = path.extname(fileName).replace(/^\./, "").toLowerCase();
    if (BINARY_EXTENSIONS.has(ext)) continue;

    // Read content
    const uncompressedData = await zipEntry.async("uint8array");
    if (uncompressedData.length > MAX_FILE_SIZE) {
      extractedFiles.push({
        relativePath,
        content: `// [File content skipped: size (${uncompressedData.length} bytes) exceeds limit of ${MAX_FILE_SIZE} bytes]`,
      });
      continue;
    }

    const textContent = new TextDecoder("utf-8").decode(uncompressedData);
    extractedFiles.push({
      relativePath,
      content: textContent,
    });

    if (fileName === "package.json" && pathSegments.length === 1) {
      packageJsonContent = textContent;
    }
  }

  if (extractedFiles.length === 0) {
    throw new Error("No usable code files found in the repository.");
  }

  // 4. Detect template
  const detectedTemplate = detectTemplate(packageJsonContent);

  // 5. Build TemplateFolder tree
  const templateFolder = buildTemplateFolderTree(extractedFiles);

  return {
    title: repoTitle,
    description: repoDescription,
    template: detectedTemplate,
    templateFolder,
    fileCount: extractedFiles.length,
  };
}
