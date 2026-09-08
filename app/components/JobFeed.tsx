"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Job } from "@/types/job";
import { DEFAULT_FILTERS, DEFAULT_TECH_KEYWORDS, FilterState, matchesLevel, ROLE_TYPE_KEYWORDS } from "@/types/filters";
import { matchesAnyKeyword } from "@/lib/textMatch";
import JobCard from "./JobCard";
import Filters from "./Filters";

const INITIAL_LOAD_LIMIT = 300;
const DATE_POSTED_MS: Record<Exclude<FilterState["datePosted"], "all">, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "3d": 3 * 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
};

export default function JobFeed() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialJobs() {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("posted_at", { ascending: false })
        .limit(INITIAL_LOAD_LIMIT);

      if (cancelled) return;
      if (error) {
        setError(error.message);
      } else {
        setJobs(data as Job[]);
      }
      setLoading(false);
    }

    loadInitialJobs();

    const channel = supabase
      .channel("jobs-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "jobs" },
        (payload) => {
          const newJob = payload.new as Job;
          setJobs((current) => {
            if (current.some((j) => j.id === newJob.id)) return current;
            return [newJob, ...current];
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const keyword = filters.keyword.trim().toLowerCase();
    const location = filters.location.trim().toLowerCase();

    return jobs.filter((job) => {
      if (filters.country !== "all" && job.country !== filters.country) return false;
      if (filters.jobType !== "all" && job.job_type !== filters.jobType) return false;
      if (filters.remoteOnly && !job.is_remote) return false;

      // Default view restricts to tech roles by title; "Show all jobs" clears it.
      if (filters.techOnly && !matchesAnyKeyword(job.title, DEFAULT_TECH_KEYWORDS)) return false;

      // Role type dropdown narrows further within (or independent of) techOnly.
      if (filters.roleType !== "all" && !matchesAnyKeyword(job.title, ROLE_TYPE_KEYWORDS[filters.roleType])) {
        return false;
      }

      if (!matchesLevel(job.title, filters.level)) return false;

      if (location) {
        const isRemoteQuery = location === "remote";
        const matchesLocation = job.location?.toLowerCase().includes(location);
        if (isRemoteQuery ? !job.is_remote : !matchesLocation) return false;
      }

      if (filters.datePosted !== "all") {
        const age = Date.now() - new Date(job.posted_at).getTime();
        if (age > DATE_POSTED_MS[filters.datePosted]) return false;
      }

      if (keyword) {
        const haystack = `${job.title} ${job.company} ${job.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }

      return true;
    });
  }, [jobs, filters]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-surface-border bg-black/90 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm font-bold text-black">
            J
          </div>
          <h1 className="text-lg font-semibold text-white">Jinder</h1>
        </div>
        <span className="text-xs text-ink-secondary">Real-time jobs · Canada &amp; USA</span>
      </header>

      <Filters filters={filters} onChange={setFilters} resultCount={filteredJobs.length} />

      <main className="flex-1 px-6 py-6">
        {error && (
          <p className="rounded-lg border border-white/20 bg-surface-card px-4 py-3 text-sm text-white">
            Failed to load jobs: {error}
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-surface-card" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <p className="py-20 text-center text-sm text-ink-secondary">
            No jobs match your filters yet. Try widening your search.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
