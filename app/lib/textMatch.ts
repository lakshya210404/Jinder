function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Word-boundary match so short keywords (e.g. "ai", "qa") don't false-positive inside unrelated words. */
export function matchesAnyKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => {
    const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(kw.toLowerCase())}(?![a-z0-9])`, "i");
    return pattern.test(lower);
  });
}
