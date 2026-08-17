import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Plugin } from "vite";

const DOCS_DIR = join(process.cwd(), "public", "docs");
const OUT_DIR = join(process.cwd(), "public", "generated");

/** Files that are internal engineering notes, not user-facing guides. */
const EXCLUDE = new Set([
  "appointment-engine-frontend-integration.md",
  "NOTIFICATION_PREFERENCES_FRONTEND_INTEGRATION.md",
]);

export interface DocFrontmatter {
  title: string;
  description?: string;
  product?: string;
  category?: string;
  order?: number;
  icon?: string;
}

export interface DocEntry extends DocFrontmatter {
  /** Route path, e.g. "pharmacy/stock" — mounted under /docs/. */
  slug: string;
  /** Path under public/, e.g. "docs/pharmacy/stock.md". */
  file: string;
  headings: { depth: number; text: string; id: string }[];
  readingMinutes: number;
}

// ─── Frontmatter ─────────────────────────────────────────────────────────────
// Deliberately minimal: our frontmatter is flat scalars only, so a YAML
// dependency would be overkill. Anything richer should move to a real parser.
function parseFrontmatter(raw: string): { data: DocFrontmatter; body: string } {
  if (!raw.startsWith("---\n")) {
    return { data: { title: "" }, body: raw };
  }
  const end = raw.indexOf("\n---", 4);
  if (end === -1) return { data: { title: "" }, body: raw };

  const data: Record<string, string | number> = {};
  for (const line of raw.slice(4, end).split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    data[key] = key === "order" ? Number(value) : value;
  }

  return {
    data: data as unknown as DocFrontmatter,
    body: raw.slice(end + 4).replace(/^\n+/, ""),
  };
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Strips markdown syntax so the search index holds readable prose. */
function toPlainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*>\s?\[![A-Z]+\]\s*/gm, "")
    .replace(/[#*_>|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith(".md") && !EXCLUDE.has(name)) out.push(full);
  }
  return out;
}

export function buildDocsIndex() {
  const registry: DocEntry[] = [];
  const search: { slug: string; title: string; heading: string; text: string }[] = [];

  for (const path of walk(DOCS_DIR)) {
    const relPath = relative(DOCS_DIR, path).split(sep).join("/");
    const { data, body } = parseFrontmatter(readFileSync(path, "utf8"));

    if (!data.title) {
      console.warn(`[docs-registry] missing frontmatter title: docs/${relPath}`);
      continue;
    }

    const slug = relPath.replace(/\.md$/, "").replace(/\/overview$/, "");

    const headings = [...body.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((m) => ({
      depth: m[1].length,
      text: m[2].trim(),
      id: slugifyHeading(m[2].trim()),
    }));

    registry.push({
      ...data,
      slug,
      file: `docs/${relPath}`,
      headings,
      readingMinutes: Math.max(1, Math.round(body.split(/\s+/).length / 200)),
    });

    // One search record per H2 section, so hits deep-link to an anchor.
    const sections = body.split(/^##\s+/m);
    search.push({
      slug,
      title: data.title,
      heading: "",
      text: toPlainText(sections[0]).slice(0, 400),
    });
    for (const section of sections.slice(1)) {
      const heading = section.slice(0, section.indexOf("\n")).trim();
      search.push({
        slug,
        title: data.title,
        heading,
        text: toPlainText(section).slice(0, 400),
      });
    }
  }

  // A duplicate slug means two files fight over one route and one silently
  // wins, so fail the build rather than ship an unreachable page.
  const seen = new Map<string, string>();
  for (const entry of registry) {
    const existing = seen.get(entry.slug);
    if (existing) {
      throw new Error(
        `[docs-registry] duplicate slug "${entry.slug}": ${existing} and ${entry.file}`,
      );
    }
    seen.set(entry.slug, entry.file);
  }

  registry.sort(
    (a, b) => (a.category ?? "").localeCompare(b.category ?? "") || (a.order ?? 0) - (b.order ?? 0),
  );

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, "docs-registry.json"), JSON.stringify(registry, null, 2));
  writeFileSync(join(OUT_DIR, "docs-search-index.json"), JSON.stringify(search));

  return { docs: registry.length, records: search.length };
}

export function docsRegistryPlugin(): Plugin {
  return {
    name: "docs-registry",

    buildStart() {
      const { docs, records } = buildDocsIndex();
      console.log(`[docs-registry] ${docs} docs, ${records} search records`);
    },

    configureServer(server) {
      server.watcher.add(DOCS_DIR);
      const rebuild = (path: string) => {
        if (!path.startsWith(DOCS_DIR) || !path.endsWith(".md")) return;
        buildDocsIndex();
        server.ws.send({ type: "full-reload" });
      };
      server.watcher.on("change", rebuild);
      server.watcher.on("add", rebuild);
      server.watcher.on("unlink", rebuild);
    },
  };
}
