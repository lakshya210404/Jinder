"use client";

import { DEFAULT_FILTERS, ExperienceLevel, FilterState, LEVEL_LABEL, ROLE_TYPE_LABEL, RoleType } from "@/types/filters";

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  resultCount: number;
}

const selectClass =
  "rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-white outline-none focus:border-white/40";

const ROLE_TYPE_OPTIONS = Object.keys(ROLE_TYPE_LABEL) as RoleType[];
const LEVEL_OPTIONS = Object.keys(LEVEL_LABEL) as ExperienceLevel[];

export default function Filters({ filters, onChange, resultCount }: Props) {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...filters, [key]: value });

  const hasActiveFilters =
    filters.keyword ||
    filters.location ||
    filters.remoteOnly ||
    filters.country !== "all" ||
    filters.jobType !== "all" ||
    filters.datePosted !== "all" ||
    filters.roleType !== "all" ||
    filters.level !== "all" ||
    !filters.techOnly;

  return (
    <div className="sticky top-[65px] z-10 flex flex-col gap-3 border-b border-surface-border bg-black/90 px-6 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search title, company, or tag…"
          value={filters.keyword}
          onChange={(e) => set("keyword", e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-white placeholder-ink-secondary outline-none focus:border-white/40"
        />

        <input
          type="text"
          placeholder="City or 'remote'"
          value={filters.location}
          onChange={(e) => set("location", e.target.value)}
          className="w-40 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-white placeholder-ink-secondary outline-none focus:border-white/40"
        />

        <select
          value={filters.roleType}
          onChange={(e) => set("roleType", e.target.value as RoleType)}
          className={selectClass}
        >
          {ROLE_TYPE_OPTIONS.map((role) => (
            <option key={role} value={role}>
              {ROLE_TYPE_LABEL[role]}
            </option>
          ))}
        </select>

        <select
          value={filters.level}
          onChange={(e) => set("level", e.target.value as ExperienceLevel)}
          className={selectClass}
        >
          {LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {LEVEL_LABEL[level]}
            </option>
          ))}
        </select>

        <select
          value={filters.country}
          onChange={(e) => set("country", e.target.value as FilterState["country"])}
          className={selectClass}
        >
          <option value="all">CA & US</option>
          <option value="CA">Canada</option>
          <option value="US">United States</option>
        </select>

        <select
          value={filters.jobType}
          onChange={(e) => set("jobType", e.target.value as FilterState["jobType"])}
          className={selectClass}
        >
          <option value="all">Any job type</option>
          <option value="full-time">Full-time</option>
          <option value="part-time">Part-time</option>
          <option value="contract">Contract</option>
        </select>

        <select
          value={filters.datePosted}
          onChange={(e) => set("datePosted", e.target.value as FilterState["datePosted"])}
          className={selectClass}
        >
          <option value="all">Any time</option>
          <option value="24h">Past 24 hours</option>
          <option value="3d">Past 3 days</option>
          <option value="7d">Past 7 days</option>
          <option value="30d">Past 30 days</option>
        </select>

        <label className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-raised px-3 py-2 text-sm text-white">
          <input
            type="checkbox"
            checked={filters.remoteOnly}
            onChange={(e) => set("remoteOnly", e.target.checked)}
            className="accent-white"
          />
          Remote only
        </label>

        {hasActiveFilters && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="rounded-lg px-3 py-2 text-sm text-ink-secondary hover:text-white"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-ink-secondary">
          <input
            type="checkbox"
            checked={filters.techOnly}
            onChange={(e) => set("techOnly", e.target.checked)}
            className="accent-white"
          />
          Tech roles only
          {filters.techOnly && (
            <button
              onClick={() => set("techOnly", false)}
              className="ml-1 underline decoration-dotted underline-offset-2 hover:text-white"
            >
              show all jobs
            </button>
          )}
        </label>
        <p className="text-xs text-ink-secondary">{resultCount.toLocaleString()} jobs</p>
      </div>
    </div>
  );
}
