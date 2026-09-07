import { LEVER_COMPANIES } from "../companies";
import { upsertJobs } from "../db";
import { fetchJson, logoUrl, stripHtml } from "../http";
import { detectCountry, extractTags, normalizeJobType } from "../normalizer";
import { NormalizedJob } from "../types";

interface LeverJob {
  id: string;
  text: string; // title
  hostedUrl: string;
  createdAt: number; // epoch ms
  descriptionPlain: string | null;
  workplaceType: string | null; // "remote" | "hybrid" | "onsite"
  categories: {
    commitment?: string; // "Full-time", "Part-time", "Contract", "Intern"
    location?: string;
    team?: string;
  };
}

export async function pollLever(): Promise<void> {
  const allJobs: NormalizedJob[] = [];

  for (const company of LEVER_COMPANIES) {
    const data = await fetchJson<LeverJob[]>(
      `https://api.lever.co/v0/postings/${company.slug}?mode=json`
    );
    if (!data) continue;

    for (const job of data) {
      const jobType = normalizeJobType(job.categories.commitment);
      if (jobType !== "full-time") continue;

      const locationName = job.categories.location ?? null;
      const isRemote = job.workplaceType === "remote" || /remote/i.test(locationName ?? "");
      const country = detectCountry(locationName);
      if (country !== "CA" && country !== "US") continue;

      const description = stripHtml(job.descriptionPlain);

      allJobs.push({
        source: "lever",
        external_id: job.id,
        title: job.text,
        company: company.name,
        company_logo: logoUrl(company.domain),
        location: locationName,
        country,
        is_remote: isRemote,
        job_type: jobType,
        url: job.hostedUrl,
        description,
        tags: extractTags(`${job.text} ${description ?? ""}`),
        salary_min: null,
        salary_max: null,
        posted_at: new Date(job.createdAt).toISOString(),
      });
    }
  }

  const { count, errors } = await upsertJobs(allJobs);
  console.log(`[lever] upserted ${count} jobs (${errors} errors) across ${LEVER_COMPANIES.length} companies`);
}
