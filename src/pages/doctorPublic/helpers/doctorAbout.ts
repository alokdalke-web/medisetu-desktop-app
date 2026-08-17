export interface AboutBlock {
  heading?: string;
  body: string;
}

/**
 * Headings doctors commonly type into the free-text `about` field. Many paste
 * the content without line breaks, and HTML collapses whitespace — so the whole
 * profile renders as one unreadable paragraph. When there are no newlines to
 * work with, we split before these labels instead.
 */
const KNOWN_HEADINGS = [
  "Qualifications & Training",
  "Qualifications and Training",
  "Qualifications",
  "Specialization / Fellowship",
  "Specialization",
  "Board Certification / Memberships",
  "Board Certification",
  "Memberships",
  "Areas of Expertise",
  "Professional Experience",
  "Experience",
  "Awards & Recognition",
  "Languages Spoken",
  "Research & Publications",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Groups sentences into paragraphs so an unstructured blob still breathes. */
function groupSentences(text: string, perParagraph = 3): AboutBlock[] {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
  if (!sentences || sentences.length <= perParagraph) {
    return [{ body: text }];
  }

  const blocks: AboutBlock[] = [];
  for (let i = 0; i < sentences.length; i += perParagraph) {
    const body = sentences
      .slice(i, i + perParagraph)
      .join("")
      .trim();
    if (body) blocks.push({ body });
  }
  return blocks;
}

export function parseAboutSections(about: string): AboutBlock[] {
  const text = about.trim();
  if (!text) return [];

  // 1. Author gave us real line breaks — trust them.
  const lines = text
    .split(/\n{1,}/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines.map((line) => {
      const match = KNOWN_HEADINGS.find((h) =>
        line.toLowerCase().startsWith(h.toLowerCase()),
      );
      if (match && line.length > match.length) {
        return {
          heading: match,
          body: line.slice(match.length).replace(/^[\s:–-]+/, "").trim(),
        };
      }
      return match ? { heading: match, body: "" } : { body: line };
    });
  }

  // 2. One long line — split before any known heading.
  const pattern = new RegExp(`(?=(?:${KNOWN_HEADINGS.map(escapeRegExp).join("|")}))`, "gi");
  const chunks = text
    .split(pattern)
    .map((c) => c.trim())
    .filter(Boolean);

  if (chunks.length > 1) {
    return chunks.map((chunk) => {
      const match = KNOWN_HEADINGS.find((h) =>
        chunk.toLowerCase().startsWith(h.toLowerCase()),
      );
      if (!match) return { body: chunk };
      return {
        heading: match,
        body: chunk.slice(match.length).replace(/^[\s:–-]+/, "").trim(),
      };
    });
  }

  // 3. No structure at all — at least break the wall into paragraphs.
  return groupSentences(text);
}
