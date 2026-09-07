import { ASHBY_COMPANIES } from "../companies";
import { upsertJobs } from "../db";
import { fetchJson, logoUrl, stripHtml } from "../http";
import { detectCountry, extractTags } from "../normalizer";
import { Country, JobType, NormalizedJob } from "../types";

interface AshbyJob {
  id: string;
  title: string;
  employmentType: string; // "FullTime" | "PartTime" | "Contract" | "Intern" | "Temporary"
  location: string | null;
  isRemote: boolean;
  publishedAt: string;
  jobUrl: string;
  applyUrl: string;
  descriptionHtml: string | null;
  address?: {
    postalAddress?: {
      addressCountry?: string;
    };
  };
}

interface AshbyBoardResponse {
  jobs: AshbyJob[];
}

function mapEmploymentType(raw: string): JobType | null {
  switch (raw) {
    case "FullTime":
      return "full-time";
    case "PartTime":
      return "part-time";
    case "Contract":
    case "Temporary":
      return "contract";
    default:
      return null; // e.g. "Intern"
  }
}

function mapAshbyCountry(addressCountry: string | undefined, location: string | null): Country | null {
  if (addressCountry) {
    if (/canada/i.test(addressCountry)) return "CA";
    if (/united states/i.test(addressCountry)) return "US";
  }
  return detectCountry(location);
}

export async function pollAshby(): Promise<void> {
  const allJobs: NormalizedJob[] = [];

  for (const company of ASHBY_COMPANIES) {
    const data = await fetchJson<AshbyBoardResponse>(
      `https://api.ashbyhq.com/posting-api/job-board/${company.slug}`
    );
    if (!data?.jobs) continue;

    for (const job of data.jobs) {
      const jobType = mapEmploymentType(job.employmentType);
      if (jobType !== "full-time") continue;

      const country = mapAshbyCountry(job.address?.postalAddress?.addressCountry, job.location);
      if (country !== "CA" && country !== "US") continue;

      const description = stripHtml(job.descriptionHtml);

      allJobs.push({
        source: "ashby",
        external_id: job.id,
        title: job.title,
        company: company.name,
        company_logo: logoUrl(company.domain),
        location: job.location,
        country,
        is_remote: job.isRemote ?? false,
        job_type: jobType,
        url: job.jobUrl || job.applyUrl,
        description,
        tags: extractTags(`${job.title} ${description ?? ""}`),
        salary_min: null,
        salary_max: null,
        posted_at: job.publishedAt,
      });
    }
  }

  const { count, errors } = await upsertJobs(allJobs);
  console.log(`[ashby] upserted ${count} jobs (${errors} errors) across ${ASHBY_COMPANIES.length} companies`);
}
