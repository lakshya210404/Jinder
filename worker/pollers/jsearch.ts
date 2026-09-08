import { createHash } from "crypto";
import { upsertJobs } from "../db";
import { fetchJson } from "../http";
import { extractTags, isRemoteLocation } from "../normalizer";
import { Country, NormalizedJob } from "../types";

// .trim() guards against a trailing newline/whitespace sneaking into the env
// var (e.g. pasted into Railway's dashboard), which node-fetch/undici reject
// outright with "is not a legal HTTP header value".
const JSEARCH_API_KEY = process.env.JSEARCH_API_KEY?.trim();

// Keep this list short: JSearch's free RapidAPI tier is 200 requests/month
// total. Each cycle makes QUERY_TERMS.length x COUNTRIES.length requests (4
// today), and poller.ts runs this every 6 hours (120 cycles/month) — that's
// already ~480 requests/month, over budget. Cut QUERY_TERMS or COUNTRIES, or
// lengthen JSEARCH_INTERVAL_MS in poller.ts, before raising either list.
const QUERY_TERMS = ["software engineer", "product manager"];
const COUNTRIES: { code: Country; jsearchParam: string }[] = [
  { code: "US", jsearchParam: "us" },
  { code: "CA", jsearchParam: "ca" },
];

interface JSearchJob {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo: string | null;
  job_location: string | null;
  job_country: string | null;
  job_is_remote: boolean;
  job_employment_types: string[] | null;
  job_apply_link: string;
  job_description: string | null;
  job_posted_at_datetime_utc: string | null;
  job_min_salary: number | null;
  job_max_salary: number | null;
}

// As of 2026-09, JSearch's endpoint on RapidAPI is `/search-v2` (the older
// `/search` path 404s even with an active subscription — the API moved).
// Response shape is also nested under `data.jobs`, not `data` directly.
interface JSearchResponse {
  status: string;
  data: { jobs: JSearchJob[]; cursor?: string };
}

/**
 * JSearch's `job_id` is NOT a stable job identifier — it's an opaque result
 * token that changes between search calls even for the exact same posting
 * (confirmed: the same title+company accumulated 30 distinct job_ids across
 * poll cycles). Deriving a content-based fingerprint instead so upsert dedup
 * on (source, external_id) actually works.
 */
function stableJobId(job: Pick<JSearchJob, "employer_name" | "job_title">, country: Country): string {
  const fingerprint = `${job.employer_name}|${job.job_title}|${country}`.toLowerCase().trim();
  return createHash("sha1").update(fingerprint).digest("hex");
}

export async function pollJSearch(): Promise<void> {
  if (!JSEARCH_API_KEY) {
    console.warn("[jsearch] JSEARCH_API_KEY not set, skipping");
    return;
  }

  const allJobs: NormalizedJob[] = [];

  for (const { code, jsearchParam } of COUNTRIES) {
    for (const term of QUERY_TERMS) {
      const query = encodeURIComponent(`${term} full time`);
      const url = `https://jsearch.p.rapidapi.com/search-v2?query=${query}&page=1&num_pages=1&country=${jsearchParam}&employment_types=FULLTIME`;

      const data = await fetchJson<JSearchResponse>(url, {
        "x-rapidapi-key": JSEARCH_API_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      });

      if (!data?.data?.jobs) {
        console.warn(`[jsearch] no data for "${term}" (${code}) — check API subscription/quota`);
        continue;
      }

      for (const job of data.data.jobs) {
        if (!job.job_employment_types?.includes("FULLTIME")) continue;
        // The `country` query param is a hint, not a strict filter — some
        // results leak through from elsewhere, so double-check here.
        if (job.job_country?.toUpperCase() !== code) continue;

        allJobs.push({
          source: "jsearch",
          external_id: stableJobId(job, code),
          title: job.job_title,
          company: job.employer_name,
          company_logo: job.employer_logo,
          location: job.job_location,
          country: code,
          is_remote: job.job_is_remote || isRemoteLocation(job.job_location),
          job_type: "full-time",
          url: job.job_apply_link,
          description: job.job_description,
          tags: extractTags(`${job.job_title} ${job.job_description ?? ""}`),
          salary_min: job.job_min_salary,
          salary_max: job.job_max_salary,
          posted_at: job.job_posted_at_datetime_utc ?? new Date().toISOString(),
        });
      }
    }
  }

  const { count, errors } = await upsertJobs(allJobs);
  console.log(`[jsearch] upserted ${count} jobs (${errors} errors)`);
}
