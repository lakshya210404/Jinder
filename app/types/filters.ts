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

export interface FilterState {
  keyword: string;
  location: string;
  remoteOnly: boolean;
  country: CountryFilter;
  jobType: JobTypeFilter;
  datePosted: DatePostedFilter;
  roleType: RoleType;
  techOnly: boolean;
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
};
