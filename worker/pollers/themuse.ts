import { upsertJobs } from "../db";
import { fetchJson, stripHtml } from "../http";
import { detectCountry, extractTags, guessJobTypeFromText, isRemoteLocation } from "../normalizer";
import { Country, NormalizedJob } from "../types";

// The Muse's public API is unauthenticated and has no documented rate limit,
// but pulling its full pool (6,000+ jobs per country) every cycle would be
// excessive. This caps it to a bounded, "most relevant first" slice per
// cycle — bump PAGES_PER_COUNTRY for more depth if the interval is long enough.
const PAGE_SIZE = 20; // fixed by the API, not configurable via query param
const PAGES_PER_COUNTRY = 20; // 20 x 20 = up to 400 jobs per country per cycle

const COUNTRIES: { code: Country; museLocation: string }[] = [
  { code: "US", museLocation: "United States" },
  { code: "CA", museLocation: "Canada" },
];

interface MuseJob {
  id: number;
  name: string;
  contents: string | null;
  publication_date: string;
  locations: { name: string }[];
  categories: { name: string }[];
  company: { name: string } | null;
  refs: { landing_page: string };
}

interface MuseResponse {
  page: number;
  page_count: number;
  total: number;
  results: MuseJob[];
}

export async function pollTheMuse(): Promise<void> {
  const allJobs: NormalizedJob[] = [];

  for (const { code, museLocation } of COUNTRIES) {
    for (let page = 0; page < PAGES_PER_COUNTRY; page++) {
      const url = `https://www.themuse.com/api/public/jobs?page=${page}&location=${encodeURIComponent(museLocation)}`;
      const data = await fetchJson<MuseResponse>(url, {
        "User-Agent": "Mozilla/5.0 (compatible; JinderBot/1.0; +https://jinder.app)",
      });

      if (!data?.results?.length) break; // no more pages, or request failed

      for (const job of data.results) {
        if (!job.company) continue;

        const title = job.name.trim();
        const jobType = guessJobTypeFromText(title);
        if (jobType !== "full-time") continue;

        const locationNames = job.locations.map((l) => l.name);
        const locationText = locationNames.join(", ") || null;
        const isRemote = locationNames.some((l) => isRemoteLocation(l) || /flexible/i.test(l));

        // The API's location filter is the primary country signal; fall back
        // to text detection on the specific location strings if ambiguous.
        const country = locationNames.some((l) => detectCountry(l) === code) || locationNames.length === 0
          ? code
          : detectCountry(locationText) ?? code;
        if (country !== "CA" && country !== "US") continue;

        const description = stripHtml(job.contents);

        allJobs.push({
          source: "themuse",
          external_id: String(job.id),
          title,
          company: job.company.name,
          company_logo: null,
          location: locationText,
          country,
          is_remote: isRemote,
          job_type: jobType,
          url: job.refs.landing_page,
          description,
          tags: extractTags(`${title} ${job.categories.map((c) => c.name).join(" ")} ${description ?? ""}`),
          salary_min: null,
          salary_max: null,
          posted_at: job.publication_date,
        });
      }

      if (page + 1 >= data.page_count) break; // reached the last real page
    }
  }

  const { count, errors } = await upsertJobs(allJobs);
  console.log(`[themuse] upserted ${count} jobs (${errors} errors)`);
}
