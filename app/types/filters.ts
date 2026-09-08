import { matchesAnyKeyword } from "@/lib/textMatch";

export type CountryFilter = "all" | "CA" | "US";
export type JobTypeFilter = "all" | "full-time" | "part-time" | "contract";
export type DatePostedFilter = "all" | "24h" | "3d" | "7d" | "30d";
export type RoleType =
  | "all"
  | "software-engineering"
  | "product"
  | "data-analytics"
  | "design"
  | "devops-cloud"
  | "mobile"
  | "security";

export const ROLE_TYPE_LABEL: Record<RoleType, string> = {
  all: "All roles",
  "software-engineering": "Software Engineering",
  product: "Product",
  "data-analytics": "Data & Analytics",
  design: "Design",
  "devops-cloud": "DevOps & Cloud",
  mobile: "Mobile",
  security: "Security",
};

/** Title keywords per role category, used by the "Role type" dropdown to narrow within tech roles. */
export const ROLE_TYPE_KEYWORDS: Record<Exclude<RoleType, "all">, string[]> = {
  "software-engineering": [
    "engineer", "developer", "software", "backend", "frontend", "fullstack", "full-stack", "sde",
  ],
  product: ["product manager", "product owner", "product"],
  "data-analytics": ["data", "analyst", "data scientist", "data engineer", "machine learning", "ai", "ml"],
  design: ["designer", "design", "ux", "ui"],
  "devops-cloud": ["devops", "cloud", "sre", "site reliability", "infrastructure", "platform engineer"],
  mobile: ["mobile", "ios", "android", "react native", "flutter"],
  security: ["security", "appsec", "infosec", "cybersecurity"],
};

/** The default "tech roles only" keyword set shown on first load. */
export const DEFAULT_TECH_KEYWORDS = [
  "engineer", "developer", "software", "product manager", "data", "analyst", "designer",
  "devops", "backend", "frontend", "fullstack", "machine learning", "ai", "cloud", "security",
  "mobile", "ios", "android", "qa",
];

export type ExperienceLevel = "all" | "entry" | "mid" | "senior" | "manager";

export const LEVEL_LABEL: Record<ExperienceLevel, string> = {
  all: "Any level",
  entry: "Entry / New Grad",
  mid: "Mid Level",
  senior: "Senior",
  manager: "Manager",
};

/** Title keywords per experience level, used by the "Level" dropdown. */
export const LEVEL_KEYWORDS: Record<Exclude<ExperienceLevel, "all">, string[]> = {
  entry: ["junior", "entry", "new grad", "associate", "graduate", "0-2 years", "early career"],
  mid: ["mid", "intermediate", "II", "2-5 years", "3+ years"],
  senior: ["senior", "sr.", "lead", "principal", "staff", "III"],
  manager: ["manager", "director", "head of", "VP"],
};

/** Union of every level keyword — used to detect titles with no level signal at all. */
const ALL_LEVEL_KEYWORDS = Object.values(LEVEL_KEYWORDS).flat();

export function matchesLevel(title: string, level: ExperienceLevel): boolean {
  if (level === "all") return true;
  if (matchesAnyKeyword(title, LEVEL_KEYWORDS[level])) return true;
  // Titles with no level indicator at all are assumed open to entry-level candidates.
  return level === "entry" && !matchesAnyKeyword(title, ALL_LEVEL_KEYWORDS);
}

export interface FilterState {
  keyword: string;
  location: string;
  remoteOnly: boolean;
  country: CountryFilter;
  jobType: JobTypeFilter;
  datePosted: DatePostedFilter;
  roleType: RoleType;
  techOnly: boolean;
  level: ExperienceLevel;
}

export const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  location: "",
  remoteOnly: false,
  country: "all",
  jobType: "all",
  datePosted: "all",
  roleType: "all",
  techOnly: true,
  level: "all",
};
