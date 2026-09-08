import { upsertJobs } from "../db";
import { fetchJson, stripHtml } from "../http";
import { extractTags, normalizeJobType } from "../normalizer";
import { Country, NormalizedJob } from "../types";

// Jobicy caps results at 200 regardless of the `count` param requested.
const RESULT_COUNT = 200;

const COUNTRIES: { code: Country; geoParam: string }[] = [
  { code: "US", geoParam: "usa" },
  { code: "CA", geoParam: "canada" },
];

interface JobicyJob {
  id: number;
  jobTitle: string;
  companyName: string;
  companyLogo: string | null;
  jobType: string[];
  jobGeo: string; // e.g. "Canada,  USA" — a remote job can list multiple eligible countries
  jobExcerpt: string | null;
  jobDescription: string | null;
  jobIndustry: string[];
  url: string;
  pubDate: string;
}

interface JobicyResponse {
  jobs: JobicyJob[];
}

export async function pollJobicy(): Promise<void> {
  const allJobs: NormalizedJob[] = [];

  for (const { code, geoParam } of COUNTRIES) {
    const url = `https://jobicy.com/api/v2/remote-jobs?count=${RESULT_COUNT}&geo=${geoParam}`;
    const data = await fetchJson<JobicyResponse>(url, {
      "User-Agent": "Mozilla/5.0 (compatible; JinderBot/1.0; +https://jinder.app)",
    });

    if (!data?.jobs) {
      console.warn(`[jobicy] no data for geo=${geoParam}`);
      continue;
    }

    for (const job of data.jobs) {
      const jobType = normalizeJobType(job.jobType?.[0]);
      if (jobType !== "full-time") continue;

      const description = stripHtml(job.jobDescription) ?? stripHtml(job.jobExcerpt);

      allJobs.push({
        // Jobicy job IDs are shared across countries when a listing is open
        // to multiple regions (jobGeo can be "Canada, USA") — suffix by
        // country so it surfaces under both instead of colliding on upsert.
        source: "jobicy",
        external_id: `${job.id}-${code}`,
        title: job.jobTitle,
        company: job.companyName,
        company_logo: job.companyLogo,
        location: job.jobGeo,
        country: code,
        is_remote: true,
        job_type: jobType,
        url: job.url,
        description,
        tags: extractTags(`${job.jobTitle} ${job.jobIndustry.join(" ")} ${description ?? ""}`),
        salary_min: null,
        salary_max: null,
        posted_at: job.pubDate,
      });
    }
  }

  const { count, errors } = await upsertJobs(allJobs);
  console.log(`[jobicy] upserted ${count} jobs (${errors} errors)`);
}
