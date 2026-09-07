import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { NormalizedJob } from "./types";

// process.cwd() (not __dirname) so this resolves correctly whether running
// via ts-node from worker/ or the compiled dist/poller.js — __dirname would
// shift by one level once compiled into dist/.
dotenv.config({ path: path.resolve(process.cwd(), "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check jinder/.env.local"
  );
}

// Service-role client: bypasses RLS, used only by the worker for writes.
export const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const UPSERT_BATCH_SIZE = 200;

/**
 * Upserts jobs deduped on (source, external_id). Existing rows are updated
 * (e.g. salary/description changes) without touching discovered_at.
 */
export async function upsertJobs(jobs: NormalizedJob[]): Promise<{ count: number; errors: number }> {
  if (jobs.length === 0) return { count: 0, errors: 0 };

  // A single upsert statement can't touch the same (source, external_id) row
  // twice (Postgres: "ON CONFLICT DO UPDATE command cannot affect row a second
  // time"). Overlapping search queries within one poller run (e.g. Job Bank's
  // multiple terms matching the same posting) can produce exactly that, so
  // dedupe before batching, keeping the last (most complete) occurrence.
  const deduped = Array.from(
    new Map(jobs.map((job) => [`${job.source}:${job.external_id}`, job])).values()
  );

  let count = 0;
  let errors = 0;

  for (let i = 0; i < deduped.length; i += UPSERT_BATCH_SIZE) {
    const batch = deduped.slice(i, i + UPSERT_BATCH_SIZE);
    const { error, count: affected } = await supabase
      .from("jobs")
      .upsert(batch, { onConflict: "source,external_id", count: "exact" });

    if (error) {
      errors += batch.length;
      console.error(`[db] upsert batch failed (${batch.length} rows):`, error.message);
    } else {
      count += affected ?? batch.length;
    }
  }

  return { count, errors };
}
