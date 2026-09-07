import { Country, JobType, NormalizedJob, Source } from "./types";

/** Keywords scanned for in title + description to build the `tags` array. */
const TAG_KEYWORDS = [
  "javascript", "typescript", "python", "java", "golang", "go", "rust", "c++",
  "c#", "ruby", "php", "kotlin", "swift", "scala", "elixir",
  "react", "next.js", "nextjs", "vue", "angular", "svelte", "node.js", "nodejs",
  "django", "flask", "fastapi", "rails", "spring", "express",
  "aws", "gcp", "azure", "kubernetes", "docker", "terraform", "graphql",
  "postgres", "postgresql", "mysql", "mongodb", "redis", "kafka", "sql",
  "machine learning", "ml", "ai", "data engineering", "data science",
  "ios", "android", "react native", "flutter",
  "frontend", "backend", "full stack", "full-stack", "devops", "sre",
  "product manager", "product management", "design", "ux", "ui",
];

const CA_PROVINCES = [
  "ON", "BC", "AB", "QC", "MB", "SK", "NS", "NB", "NL", "PE", "YT", "NT", "NU",
];
const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractTags(text: string | null | undefined): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const kw of TAG_KEYWORDS) {
    // Word-boundary match so short keywords (e.g. "go", "ai", "ui") don't
    // false-positive inside unrelated words like "going" or "google".
    const pattern = new RegExp(`(?<![a-z0-9])${escapeRegExp(kw)}(?![a-z0-9])`, "i");
    if (pattern.test(lower)) found.add(kw);
  }
  return Array.from(found);
}

export function isRemoteLocation(location: string | null | undefined): boolean {
  if (!location) return false;
  return /remote/i.test(location);
}

/** Best-effort CA/US detection from a free-text location string. Returns null if ambiguous. */
export function detectCountry(location: string | null | undefined): Country | null {
  if (!location) return null;
  const text = location.trim();
  if (/canada/i.test(text)) return "CA";
  if (/united states|u\.s\.a?\.?|usa\b/i.test(text)) return "US";

  const parts = text.split(/[,\s]+/).map((p) => p.trim().toUpperCase());
  for (const part of parts) {
    if (CA_PROVINCES.includes(part)) return "CA";
  }
  for (const part of parts) {
    if (US_STATES.includes(part)) return "US";
  }
  return null;
}

/** Normalizes a wide variety of raw "employment type" strings to our enum. Returns null to filter out. */
export function normalizeJobType(raw: string | null | undefined): JobType | null {
  if (!raw) return null;
  const t = raw.toLowerCase().replace(/[_-]/g, " ");
  if (t.includes("full")) return "full-time";
  if (t.includes("part")) return "part-time";
  if (t.includes("contract") || t.includes("temp")) return "contract";
  return null;
}

/**
 * For sources with no explicit employment-type field (e.g. Greenhouse), guesses
 * from title/description text. Defaults to full-time unless another type or an
 * internship is clearly signaled (internships are excluded, not mapped to a type).
 */
export function guessJobTypeFromText(text: string): JobType | null {
  const t = text.toLowerCase();
  if (/\bintern(ship)?\b/.test(t)) return null;
  if (/\bcontract(or)?\b|\bfreelance\b|\btemporary\b|\btemp\b/.test(t)) return "contract";
  if (/\bpart[\s-]?time\b/.test(t)) return "part-time";
  return "full-time";
}

export function makeNormalizedJob(params: {
  source: Source;
  external_id: string;
  title: string;
  company: string;
  company_logo?: string | null;
  location?: string | null;
  country: Country;
  is_remote?: boolean;
  job_type: JobType;
  url: string;
  description?: string | null;
  tags?: string[];
  salary_min?: number | null;
  salary_max?: number | null;
  posted_at: string;
}): NormalizedJob {
  return {
    source: params.source,
    external_id: params.external_id,
    title: params.title,
    company: params.company,
    company_logo: params.company_logo ?? null,
    location: params.location ?? null,
    country: params.country,
    is_remote: params.is_remote ?? isRemoteLocation(params.location),
    job_type: params.job_type,
    url: params.url,
    description: params.description ?? null,
    tags: params.tags ?? extractTags(`${params.title} ${params.description ?? ""}`),
    salary_min: params.salary_min ?? null,
    salary_max: params.salary_max ?? null,
    posted_at: params.posted_at,
  };
}
