export type Country = "CA" | "US";
export type JobType = "full-time" | "part-time" | "contract";

export type Source =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "jsearch"
  | "remoteok"
  | "jobbank"
  | "amazon"
  | "themuse"
  | "jobicy"
  | "adzuna";

/** Common shape every poller normalizes its source's response into before upsert. */
export interface NormalizedJob {
  source: Source;
  external_id: string;
  title: string;
  company: string;
  company_logo: string | null;
  location: string | null;
  country: Country;
  is_remote: boolean;
  job_type: JobType;
  url: string;
  description: string | null;
  tags: string[];
  salary_min: number | null;
  salary_max: number | null;
  posted_at: string; // ISO timestamp
}
