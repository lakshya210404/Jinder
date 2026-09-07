export type Country = "CA" | "US";
export type JobType = "full-time" | "part-time" | "contract";

export interface Job {
  id: string;
  source: string;
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
  posted_at: string;
  discovered_at: string;
}
