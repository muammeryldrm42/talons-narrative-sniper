"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Signal, Tier } from "@/lib/types";
import { mult, perf } from "@/lib/format";
import { SignalRow } from "./SignalRow";

type Filter = "all" | Tier | "first" | "strong" | "rising" | "graduated";
type Sort = "new" | "score" | "momentum" | "peak";

const filters: { id: Filter; label: string }[] = [
  { id: "rising", label: "Rising" },
  { id: "strong", label: "Strong" },
  { id: "all", label: "All" },
  { id: "hot", label: "Hot" },
  { id: "warm", label: "Warm" },
  { id: "first", label: "First on narrative" },
  { id: "graduated", label: "Graduated" },
];

export function SignalFeed({
  signals,
  solUsd,
  ready,
  onClear,
}: {
  signals: Signal[];
  solUsd: number | null;
  ready: boolean;
  onClear: () => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("new");
  const [hideJunk, setHideJunk] = useState(true);
  useEffect(() => {
    try {
      setHideJunk(localStorage.getItem("tns.hidejunk.v1") !== "0");
    } catch {
      /* default on */
    }
  }, []);
  const toggleJunk = () => {
    setHideJunk((v) => {
      try {
        localStorage.setItem("tns.hidejunk.v1", v ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !v;
    });
  };
  const junkCount = signals.filter((s) => s.junk).length;
  const [now, setNow] = useState(() => Date.now());
  const firstRender = useRef(new Set<string>());
  const [mountedAt] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const shown = useMemo(() => {
    let list = hideJunk ? signals.filter((s) => !s.junk) : signals;
    if (filter === "graduated") list = list.filter((s) => s.graduated);
    else if (filter === "rising") list = list.filter((s) => s.rising);
    else if (filter === "strong") list = list.filter((s) => s.strong);
    else if (filter === "first") list = list.filter((s) => s.copyIndex === 0);
    else if (filter !== "all") list = list.filter((s) => s.tier === filter);
    const key = (s: Signal) =>
      sort === "new"
        ? s.createdAt
        : sort === "score"
          ? s.score
          : sort === "momentum"
            ? (s.rising ? 1000 : 0) + (s.buyers1m ?? 0) * 10 + Math.max(0, s.netSol1m ?? 0)
            : (perf(s)?.peak ?? 0);
    return [...list].sort((a, b) => key(b) - key(a)).slice(0, 150);
  }, [signals, filter, sort, hideJunk]);

  return (
    <section aria-labelledby="feed-title">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8">
        <h2 id="feed-title" className="font-display text-lg font-bold">
          Signals
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div role="group" aria-label="Filter" className="flex gap-1">
            {filters.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`rounded-full px-3 py-1 ${
                  filter === f.id ? "bg-text text-ink" : "text-muted hover:text-text"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-muted" title="Rugged, dumped, insider-heavy, dead or no-effort tokens">
            <input type="checkbox" checked={hideJunk} onChange={toggleJunk} className="accent-[var(--flow)]" />
            Hide junk{junkCount > 0 ? ` (${junkCount})` : ""}
          </label>
          <label className="flex items-center gap-2 text-muted">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-md border border-line bg-panel px-2 py-1 text-text"
            >
              <option value="new">Newest</option>
              <option value="score">Score</option>
              <option value="momentum">Momentum</option>
              <option value="peak">Peak since signal</option>
            </select>
          </label>
          {signals.length > 0 && (
            <button
              type="button"
              onClick={() => exportSignals(signals)}
              title="Download every signal with its checks and performance as JSON"
              className="text-muted underline-offset-4 hover:text-text hover:underline"
            >
              Export
            </button>
          )}
          {signals.length > 0 && (
            <button type="button" onClick={onClear} className="text-muted underline-offset-4 hover:text-text hover:underline">
              Clear history
            </button>
          )}
        </div>
      </div>

      <PerfStrip signals={signals} now={now} />

      {shown.length === 0 ? (
        <div className="px-5 pb-16 pt-6 md:px-8">
          <p className="max-w-prose text-muted">
            {!ready
              ? "Loading narratives before scanning starts."
              : signals.length === 0
                ? "Scanning every new launch. A signal appears here the moment a token's name matches a trending narrative."
                : filter === "strong"
                  ? "No token has passed every check yet. Strong needs a first-on-narrative launch, multi-source trend, real buyers, a dev still holding and a clean RugCheck."
                  : "Nothing in this filter yet. Switch to All to see every match."}
          </p>
        </div>
      ) : (
        <ul className="border-t border-line">
          {shown.map((s) => {
            const fresh = s.createdAt > mountedAt && !firstRender.current.has(s.mint);
            firstRender.current.add(s.mint);
            return <SignalRow key={s.mint} s={s} now={now} solUsd={solUsd} fresh={fresh} />;
          })}
        </ul>
      )}
    </section>
  );
}

// How signals older than 15 minutes actually did. Used to judge whether the filters work.
function PerfStrip({ signals, now }: { signals: Signal[]; now: number }) {
  const settled = signals
    .filter((s) => now - s.createdAt > 15 * 60_000)
    .map((s) => ({ s, p: perf(s) }))
    .filter((x): x is { s: Signal; p: { now: number; peak: number } } => x.p !== null);
  if (settled.length < 5) {
    return (
      <p className="px-5 pb-3 text-xs text-muted md:px-8">
        Performance stats appear once 5 signals are older than 15 minutes.
      </p>
    );
  }
  const peaks = settled.map((x) => x.p.peak).sort((a, b) => a - b);
  const median = peaks[Math.floor(peaks.length / 2)];
  const hit2 = peaks.filter((p) => p >= 2).length;
  const strong = settled.filter((x) => x.s.strong);
  const strong2 = strong.filter((x) => x.p.peak >= 2).length;
  const best = settled.reduce((a, b) => (b.p.peak > a.p.peak ? b : a));
  return (
    <dl className="flex flex-wrap gap-x-6 gap-y-1 px-5 pb-3 text-xs md:px-8">
      <div className="flex gap-1.5">
        <dt className="text-muted">Signals tracked</dt>
        <dd className="tabular-nums">{settled.length}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-muted">Median peak</dt>
        <dd className="tabular-nums">{mult(median)}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-muted">Reached 2x</dt>
        <dd className="tabular-nums text-flow">
          {hit2} ({Math.round((hit2 / settled.length) * 100)}%)
        </dd>
      </div>
      {strong.length > 0 && (
        <div className="flex gap-1.5">
          <dt className="text-muted">Strong reached 2x</dt>
          <dd className="tabular-nums text-flow">
            {strong2} / {strong.length}
          </dd>
        </div>
      )}
      <div className="flex gap-1.5">
        <dt className="text-muted">Best</dt>
        <dd className="tabular-nums">
          ${best.s.symbol} {mult(best.p.peak)}
        </dd>
      </div>
    </dl>
  );
}

// Full signal history as a JSON file, for tuning thresholds against real outcomes.
function exportSignals(signals: Signal[]) {
  const rows = signals.map((s) => {
    const p = perf(s);
    return { ...s, perfNow: p?.now ?? null, perfPeak: p?.peak ?? null };
  });
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), signals: rows }, null, 1)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `narrative-signals-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
