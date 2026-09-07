import { upsertJobs } from "../db";
import { fetchJson, logoUrl, stripHtml } from "../http";
import { extractTags, guessJobTypeFromText, isRemoteLocation } from "../normalizer";
import { Country, NormalizedJob } from "../types";

// Amazon's own site calls this endpoint (unauthenticated) to power job search
// on amazon.jobs. There's no official pagination cap in the docs, so this is
// a deliberately conservative default — bump PAGES_PER_COUNTRY for more depth.
const RESULT_LIMIT = 100;
const PAGES_PER_COUNTRY = 5; // 5 x 100 = up to 500 jobs per country per cycle

const COUNTRIES: { code: Country; amazonCode: string }[] = [
  { code: "US", amazonCode: "USA" },
  { code: "CA", amazonCode: "CAN" },
];

interface AmazonJob {
  id: string;
  title: string;
  job_path: string;
  normalized_location: string;
  country_code: string;
  job_schedule_type: string; // e.g. "full-time" — note: also mislabels internships
  description: string | null;
  posted_date: string | null; // e.g. "August  7, 2026"
}

interface AmazonSearchResponse {
  hits: number;
  jobs: AmazonJob[];
}

function parsePostedDate(raw: string | null): string {
  if (!raw) return new Date().toISOString();
  const parsed = new Date(raw.replace(/\s+/g, " ").trim());
  return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

export async function pollAmazon(): Promise<void> {
  const allJobs: NormalizedJob[] = [];

  for (const { code, amazonCode } of COUNTRIES) {
    for (let page = 0; page < PAGES_PER_COUNTRY; page++) {
      const offset = page * RESULT_LIMIT;
      const url = `https://www.amazon.jobs/en/search.json?offset=${offset}&result_limit=${RESULT_LIMIT}&normalized_country_code[]=${amazonCode}`;

      const data = await fetchJson<AmazonSearchResponse>(url, {
        "User-Agent": "Mozilla/5.0 (compatible; JinderBot/1.0; +https://jinder.app)",
      });
      if (!data?.jobs?.length) break; // no more pages

      for (const job of data.jobs) {
        // Amazon's job_schedule_type mislabels internships as "full-time", so
        // titles still need the text heuristic on top of the schedule-type check.
        if (job.job_schedule_type !== "full-time") continue;
        const jobType = guessJobTypeFromText(job.title);
        if (jobType !== "full-time") continue;

        const description = stripHtml(job.description);

        allJobs.push({
          source: "amazon",
          external_id: job.id,
          title: job.title,
          company: "Amazon",
          company_logo: logoUrl("amazon.com"),
          location: job.normalized_location,
          country: code,
          is_remote: isRemoteLocation(job.normalized_location) || isRemoteLocation(job.title),
          job_type: "full-time",
          url: `https://www.amazon.jobs${job.job_path}`,
          description,
          tags: extractTags(`${job.title} ${description ?? ""}`),
          salary_min: null,
          salary_max: null,
          posted_at: parsePostedDate(job.posted_date),
        });
      }

      if (data.jobs.length < RESULT_LIMIT) break; // last page for this country
    }
  }

  const { count, errors } = await upsertJobs(allJobs);
  console.log(`[amazon] upserted ${count} jobs (${errors} errors)`);
}
