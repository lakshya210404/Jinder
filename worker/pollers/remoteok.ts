import { upsertJobs } from "../db";
import { fetchJson, stripHtml } from "../http";
import { detectCountry, extractTags, guessJobTypeFromText } from "../normalizer";
import { NormalizedJob } from "../types";

interface RemoteOkJob {
  id: string;
  slug: string;
  epoch: number;
  date: string;
  company: string;
  company_logo: string | null;
  logo: string | null;
  position: string;
  tags: string[];
  description: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  apply_url: string | null;
  url: string | null;
}

// RemoteOK's first array element is a metadata/legal notice object, not a job.
type RemoteOkResponse = (RemoteOkJob | { legal?: string })[];

export async function pollRemoteOk(): Promise<void> {
  const data = await fetchJson<RemoteOkResponse>("https://remoteok.com/api", {
    "User-Agent": "Mozilla/5.0 (compatible; JinderBot/1.0; +https://jinder.app)",
  });

  if (!data) {
    console.warn("[remoteok] no data returned");
    return;
  }

  const allJobs: NormalizedJob[] = [];

  for (const entry of data) {
    if (!("id" in entry) || !("position" in entry)) continue; // skip the legal-notice entry
    const job = entry as RemoteOkJob;

    // RemoteOK is remote-first and often global; only keep postings explicitly
    // scoped to CA or US since our schema (and product) is CA/US only.
    const country = detectCountry(job.location);
    if (country !== "CA" && country !== "US") continue;

    const description = stripHtml(job.description);
    const jobType = guessJobTypeFromText(`${job.position} ${description ?? ""}`);
    if (jobType !== "full-time") continue;

    allJobs.push({
      source: "remoteok",
      external_id: job.id,
      title: job.position,
      company: job.company,
      company_logo: job.company_logo || job.logo || null,
      location: job.location,
      country,
      is_remote: true,
      job_type: jobType,
      url: job.apply_url || job.url || `https://remoteok.com/remote-jobs/${job.slug}`,
      description,
      tags: job.tags?.length ? job.tags : extractTags(`${job.position} ${description ?? ""}`),
      salary_min: job.salary_min || null,
      salary_max: job.salary_max || null,
      posted_at: job.date ?? new Date(job.epoch * 1000).toISOString(),
    });
  }

  const { count, errors } = await upsertJobs(allJobs);
  console.log(`[remoteok] upserted ${count} jobs (${errors} errors)`);
}
