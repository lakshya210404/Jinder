import Parser from "rss-parser";
import { upsertJobs } from "../db";
import { extractTags, guessJobTypeFromText, isRemoteLocation } from "../normalizer";
import { NormalizedJob } from "../types";

const QUERY_TERMS = ["software engineer", "product manager", "data analyst"];

interface JobBankItem {
  title: string;
  link: string;
  id: string;
  isoDate?: string;
  pubDate?: string;
  summary: string;
}

const parser: Parser<unknown, JobBankItem> = new Parser({
  customFields: { item: ["summary"] },
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; JinderBot/1.0; +https://jinder.app)",
    Accept: "application/atom+xml, application/xml, text/xml, */*",
  },
});

function extractField(summary: string, label: string): string | null {
  const match = summary.match(new RegExp(`<strong>${label}:<\\/strong>\\s*([^<]*)`, "i"));
  return match ? match[1].trim() : null;
}

function extractAnnualSalary(salaryText: string | null): { min: number | null; max: number | null } {
  if (!salaryText || !/annual|yearly|\/\s*year/i.test(salaryText)) return { min: null, max: null };
  const numbers = salaryText.replace(/,/g, "").match(/\d+(\.\d+)?/g);
  if (!numbers?.length) return { min: null, max: null };
  const values = numbers.map(Number);
  return { min: Math.min(...values), max: Math.max(...values) };
}

function extractPostingId(link: string, id: string): string {
  return link.match(/jobposting\/(\d+)/)?.[1] ?? id;
}

export async function pollJobBank(): Promise<void> {
  const allJobs: NormalizedJob[] = [];

  for (const term of QUERY_TERMS) {
    const url = `https://www.jobbank.gc.ca/jobsearch/feed/jobSearchRSSfeed?term=${encodeURIComponent(
      term
    )}&sort=D&rows=100`;

    let feed;
    try {
      feed = await parser.parseURL(url);
    } catch (err) {
      console.warn(`[jobbank] failed to fetch feed for "${term}":`, (err as Error).message);
      continue;
    }

    for (const item of feed.items) {
      const summary = item.summary ?? "";
      const location = extractField(summary, "Location");
      const employer = extractField(summary, "Employer");
      const salaryText = extractField(summary, "Salary");
      if (!employer) continue;

      const jobType = guessJobTypeFromText(`${item.title} ${summary}`);
      if (jobType !== "full-time") continue;

      const { min, max } = extractAnnualSalary(salaryText);

      allJobs.push({
        source: "jobbank",
        external_id: extractPostingId(item.link, item.id),
        title: item.title,
        company: employer,
        company_logo: null,
        location,
        country: "CA",
        is_remote: isRemoteLocation(location) || /remote|t[ée]l[ée]travail/i.test(summary),
        job_type: jobType,
        url: item.link,
        description: null,
        tags: extractTags(item.title),
        salary_min: min,
        salary_max: max,
        posted_at: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      });
    }
  }

  const { count, errors } = await upsertJobs(allJobs);
  console.log(`[jobbank] upserted ${count} jobs (${errors} errors)`);
}
