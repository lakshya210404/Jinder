import { GREENHOUSE_COMPANIES } from "../companies";
import { upsertJobs } from "../db";
import { fetchJson, logoUrl, stripHtml } from "../http";
import { detectCountry, guessJobTypeFromText, makeNormalizedJob } from "../normalizer";
import { NormalizedJob } from "../types";

interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location: { name: string } | null;
  content: string | null;
  updated_at: string;
  first_published: string | null;
}

interface GreenhouseBoardResponse {
  jobs: GreenhouseJob[];
}

export async function pollGreenhouse(): Promise<void> {
  const allJobs: NormalizedJob[] = [];

  for (const company of GREENHOUSE_COMPANIES) {
    const data = await fetchJson<GreenhouseBoardResponse>(
      `https://boards-api.greenhouse.io/v1/boards/${company.slug}/jobs?content=true`
    );
    if (!data?.jobs) continue;

    for (const job of data.jobs) {
      const locationName = job.location?.name ?? null;
      const country = detectCountry(locationName);
      if (country !== "CA" && country !== "US") continue;

      const description = stripHtml(job.content);
      const jobType = guessJobTypeFromText(`${job.title} ${description ?? ""}`);
      if (jobType !== "full-time") continue;

      allJobs.push(
        makeNormalizedJob({
          source: "greenhouse",
          external_id: String(job.id),
          title: job.title,
          company: company.name,
          company_logo: logoUrl(company.domain),
          location: locationName,
          country,
          job_type: jobType,
          url: job.absolute_url,
          description,
          posted_at: job.first_published ?? job.updated_at,
        })
      );
    }
  }

  const { count, errors } = await upsertJobs(allJobs);
  console.log(`[greenhouse] upserted ${count} jobs (${errors} errors) across ${GREENHOUSE_COMPANIES.length} companies`);
}
