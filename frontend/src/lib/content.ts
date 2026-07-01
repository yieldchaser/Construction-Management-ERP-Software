import fs from "fs/promises";
import path from "path";

export interface ContentItem {
  title: string;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  slug: string;
  category?: string;
  type: string;
  author: string;
  publishDate: string;
  body: string;
}

const CONTENT_DIR = path.join(process.cwd(), "src/content");

async function walkDirectory(dir: string, fileList: string[] = []): Promise<string[]> {
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await walkDirectory(filePath, fileList);
      } else if (file.name.endsWith(".json")) {
        fileList.push(filePath);
      }
    }
  } catch (error) {
    // Directory might not exist yet
  }
  return fileList;
}

export async function getContentItems(type: string): Promise<ContentItem[]> {
  const typeDir = path.join(CONTENT_DIR, type);
  const filePaths = await walkDirectory(typeDir);
  const items: ContentItem[] = [];

  for (const filePath of filePaths) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const parsed: ContentItem = JSON.parse(content);
      items.push(parsed);
    } catch (e) {
      console.error(`Error reading content file ${filePath}:`, e);
    }
  }

  // Sort by publishDate desc
  return items.sort((a, b) => b.publishDate.localeCompare(a.publishDate));
}

export async function getContentItemBySlug(type: string, slug: string): Promise<ContentItem | null> {
  const normalizedSlug = slug.replace(/_/g, "-");
  const targetPath = path.join(CONTENT_DIR, type, `${normalizedSlug}.json`);
  try {
    const content = await fs.readFile(targetPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    // If not found, try index in subdirectory if slug has no file extension
    try {
      const subpath = path.join(CONTENT_DIR, type, normalizedSlug, "index.json");
      const content = await fs.readFile(subpath, "utf-8");
      return JSON.parse(content);
    } catch (subError) {
      return null;
    }
  }
}

export async function searchContentItems(query: string, type?: string): Promise<ContentItem[]> {
  const searchTypes = type ? [type] : ["help", "blog", "products", "resources"];
  const allItems: ContentItem[] = [];

  for (const t of searchTypes) {
    const items = await getContentItems(t);
    allItems.push(...items);
  }

  if (!query) return allItems;

  const lowQuery = query.toLowerCase();
  return allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(lowQuery) ||
      item.body.toLowerCase().includes(lowQuery) ||
      (item.metaDescription && item.metaDescription.toLowerCase().includes(lowQuery))
  );
}
