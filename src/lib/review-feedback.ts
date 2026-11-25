export const REVIEW_SECTIONS = {
  basics: "Public basics",
  socials: "Social accounts and followers",
  content: "Content and categories",
  portfolio: "Portfolio and engagement evidence",
  collaborations: "Collaboration preferences",
  contact: "Business contact and consent",
} as const;

export type ReviewSectionKey = keyof typeof REVIEW_SECTIONS;
export type SectionFeedback = { section: ReviewSectionKey; label: string; note: string };

export function serialiseSectionFeedback(items: SectionFeedback[]) {
  return JSON.stringify({ version: 1, sections: items });
}

export function parseSectionFeedback(value: string | null | undefined): SectionFeedback[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as { version?: number; sections?: SectionFeedback[] };
    if (parsed.version !== 1 || !Array.isArray(parsed.sections)) return [];
    return parsed.sections.filter((item) => item && item.section in REVIEW_SECTIONS && typeof item.note === "string");
  } catch {
    return [];
  }
}
