import { upsertJobs } from "../db";
import { fetchJson, stripHtml } from "../http";
import { extractTags, isRemoteLocation, normalizeJobType } from "../normalizer";
import { Country, NormalizedJob } from "../types";

// .trim() guards against a trailing newline/whitespace from a pasted env var
// (see the same issue on JSEARCH_API_KEY, worker/pollers/jsearch.ts).
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID?.trim();
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY?.trim();

// NOTE ON QUOTA: this is 10 terms x 2 countries x up to 5 pages = up to 100
// requests per cycle. At the specified 30-min interval that's ~4,800
// requests/day. Adzuna doesn't publish an exact free-tier limit, but every
// third-party estimate found (from "hundreds/day" down to ~33/day) is well
// under that. Check the actual quota shown in your Adzuna dashboard before
// leaving this running unattended — reduce QUERY_TERMS, PAGES_PER_QUERY, or
// lengthen the interval in poller.ts if you're at risk of exceeding it.
const QUERY_TERMS = [
  "software engineer",
  "software developer",
  "product manager",
  "data engineer",
  "data scientist",
  "devops engineer",
  "frontend developer",
  "backend developer",
  "mobile developer",
  "full stack developer",
];

// gb intentionally excluded — this product is CA/US only.
const COUNTRIES: { code: Country; adzunaCountry: string }[] = [
  { code: "US", adzunaCountry: "us" },
  { code: "CA", adzunaCountry: "ca" },
];

const PAGES_PER_QUERY = 5;
const RESULTS_PER_PAGE = 50;

interface AdzunaJob {
  id: string;
  title: string;
  company: { display_name: string } | null;
  location: { display_name: string } | null;
  description: string | null;
  redirect_url: string;
  salary_min: number | null;
  salary_max: number | null;
  contract_time: string | null;
  created: string;
  category: { label: string } | null;
}

interface AdzunaResponse {
  count: number;
  results: AdzunaJob[];
}

export async function pollAdzuna(): Promise<void> {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    console.warn("[adzuna] ADZUNA_APP_ID / ADZUNA_APP_KEY not set, skipping");
    return;
  }

  const allJobs: NormalizedJob[] = [];

  for (const { code, adzunaCountry } of COUNTRIES) {
    for (const term of QUERY_TERMS) {
      for (let page = 1; page <= PAGES_PER_QUERY; page++) {
        const url =
          `https://api.adzuna.com/v1/api/jobs/${adzunaCountry}/search/${page}` +
          `?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&results_per_page=${RESULTS_PER_PAGE}` +
          `&what=${encodeURIComponent(term)}&content-type=application/json&full_time=1`;

        const data = await fetchJson<AdzunaResponse>(url);
        if (!data?.results?.length) break; // no more pages, or request failed

        for (const job of data.results) {
          if (!job.company?.display_name) continue;

          // full_time=1 is a request-side filter, not always strictly
          // enforced server-side — double-check defensively.
          const jobType = normalizeJobType(job.contract_time) ?? "full-time";
          if (jobType !== "full-time") continue;

          const location = job.location?.display_name ?? null;
          const description = stripHtml(job.description);

          allJobs.push({
            source: "adzuna",
            external_id: job.id,
            title: job.title,
            company: job.company.display_name,
            company_logo: null,
            location,
            country: code,
            is_remote: isRemoteLocation(location) || isRemoteLocation(job.title),
            job_type: "full-time",
            url: job.redirect_url,
            description,
            tags: extractTags(`${job.title} ${job.category?.label ?? ""} ${description ?? ""}`),
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            posted_at: job.created,
          });
        }

        if (data.results.length < RESULTS_PER_PAGE) break; // last real page
      }
    }
  }

  const { count, errors } = await upsertJobs(allJobs);
  console.log(`[adzuna] upserted ${count} jobs (${errors} errors)`);
}
