"use client";

import { useState } from "react";
import { Job } from "@/types/job";
import { timeAgo } from "@/lib/timeAgo";

const JOB_TYPE_LABEL: Record<Job["job_type"], string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
};

function CompanyLogo({ job }: { job: Job }) {
  const [failed, setFailed] = useState(false);

  if (!job.company_logo || failed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-tag text-sm font-semibold text-white">
        {job.company.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={job.company_logo}
        alt={`${job.company} logo`}
        className="h-full w-full object-contain p-1.5"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export default function JobCard({ job }: { job: Job }) {
  const locationLabel = job.is_remote
    ? job.location
      ? `Remote · ${job.location}`
      : "Remote"
    : job.location ?? "—";

  return (
    <div className="job-card-enter flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-card p-4 transition-colors hover:border-white/25">
      <div className="flex items-start gap-3">
        <CompanyLogo job={job} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-white">{job.title}</h3>
          <p className="truncate text-sm text-ink-secondary">{job.company}</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-tag px-2 py-1 text-[11px] font-medium text-ink-secondary">
          {job.country}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
        <span>{locationLabel}</span>
        <span className="text-white/20">•</span>
        <span>{JOB_TYPE_LABEL[job.job_type]}</span>
        {(job.salary_min || job.salary_max) && (
          <>
            <span className="text-white/20">•</span>
            <span>
              {job.salary_min && job.salary_max
                ? `$${job.salary_min.toLocaleString()}–$${job.salary_max.toLocaleString()}`
                : `$${(job.salary_min ?? job.salary_max)!.toLocaleString()}+`}
            </span>
          </>
        )}
      </div>

      {job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-surface-tag px-2 py-0.5 text-[11px] text-white"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between">
        <span className="text-xs text-ink-secondary">{timeAgo(job.posted_at)}</span>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-black transition-opacity hover:opacity-80"
        >
          Apply
        </a>
      </div>
    </div>
  );
}
