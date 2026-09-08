import path from "path";
import dotenv from "dotenv";

// process.cwd() (not __dirname) so this resolves correctly whether running
// via ts-node from worker/ or the compiled dist/poller.js — __dirname would
// shift by one level once compiled into dist/.
dotenv.config({ path: path.resolve(process.cwd(), "../.env.local") });

import { pollAmazon } from "./pollers/amazon";
import { pollAshby } from "./pollers/ashby";
import { pollGreenhouse } from "./pollers/greenhouse";
import { pollJobBank } from "./pollers/jobbank";
// JSearch disabled: free RapidAPI tier hit 85% of its 200 req/month quota.
// Re-enable (uncomment the import above, the constant below, and the
// schedule(...) call in main()) only after upgrading to a paid plan.
// import { pollJSearch } from "./pollers/jsearch";
import { pollJobicy } from "./pollers/jobicy";
import { pollLever } from "./pollers/lever";
import { pollRemoteOk } from "./pollers/remoteok";
import { pollTheMuse } from "./pollers/themuse";

// const JSEARCH_INTERVAL_MS = 6 * 60 * 60 * 1000; // unused while JSearch is disabled, see import above
const ATS_INTERVAL_MS = 20 * 60 * 1000; // company boards change slowly; 20 min is plenty
const REMOTEOK_INTERVAL_MS = 10 * 60 * 1000;
const JOBBANK_INTERVAL_MS = 15 * 60 * 1000;
const MUSE_INTERVAL_MS = 30 * 60 * 1000; // bigger fetch (up to 40 requests/cycle), so a longer interval
const JOBICY_INTERVAL_MS = 15 * 60 * 1000;

type PollerFn = () => Promise<void>;

/** Wraps a poller so a thrown error (bad API, network blip) never kills the process or other schedules. */
function safe(name: string, fn: PollerFn): PollerFn {
  return async () => {
    const start = Date.now();
    try {
      await fn();
    } catch (err) {
      console.error(`[poller] ${name} crashed:`, err);
    } finally {
      console.log(`[poller] ${name} finished in ${Date.now() - start}ms`);
    }
  };
}

function schedule(name: string, fn: PollerFn, intervalMs: number): void {
  const wrapped = safe(name, fn);
  wrapped(); // run once immediately on boot
  setInterval(wrapped, intervalMs);
}

function main(): void {
  console.log("[poller] Jinder worker starting…");

  schedule("amazon", pollAmazon, ATS_INTERVAL_MS);
  schedule("greenhouse", pollGreenhouse, ATS_INTERVAL_MS);
  schedule("lever", pollLever, ATS_INTERVAL_MS);
  schedule("ashby", pollAshby, ATS_INTERVAL_MS);
  // schedule("jsearch", pollJSearch, JSEARCH_INTERVAL_MS); // disabled — see import comment above
  schedule("remoteok", pollRemoteOk, REMOTEOK_INTERVAL_MS);
  schedule("jobbank", pollJobBank, JOBBANK_INTERVAL_MS);
  schedule("themuse", pollTheMuse, MUSE_INTERVAL_MS);
  schedule("jobicy", pollJobicy, JOBICY_INTERVAL_MS);
}

main();
