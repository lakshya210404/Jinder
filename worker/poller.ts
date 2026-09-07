import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { pollAmazon } from "./pollers/amazon";
import { pollAshby } from "./pollers/ashby";
import { pollGreenhouse } from "./pollers/greenhouse";
import { pollJobBank } from "./pollers/jobbank";
import { pollJSearch } from "./pollers/jsearch";
import { pollLever } from "./pollers/lever";
import { pollRemoteOk } from "./pollers/remoteok";

const JSEARCH_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 5 * 60 * 1000; // every 5 min per spec
const ATS_INTERVAL_MS = 20 * 60 * 1000; // company boards change slowly; 20 min is plenty
const REMOTEOK_INTERVAL_MS = 10 * 60 * 1000;
const JOBBANK_INTERVAL_MS = 15 * 60 * 1000;

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
  schedule("jsearch", pollJSearch, JSEARCH_INTERVAL_MS);
  schedule("remoteok", pollRemoteOk, REMOTEOK_INTERVAL_MS);
  schedule("jobbank", pollJobBank, JOBBANK_INTERVAL_MS);
}

main();
