import type { EngineStats } from "@/lib/types";

const wsLabel: Record<EngineStats["ws"], string> = {
  open: "Live",
  connecting: "Connecting",
  closed: "Reconnecting",
};

export function Header({
  stats,
  solUsd,
  alerts,
  graduations = 0,
}: {
  stats: EngineStats;
  solUsd: number | null;
  alerts?: { enabled: boolean; toggle: () => void; permission: string };
  graduations?: number;
}) {
  const live = stats.ws === "open";
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-4 md:px-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold leading-none tracking-tight md:text-3xl">
          Talons Narrative Sniper
        </h1>
        <p className="mt-1 text-sm text-muted">Every new Solana token, checked against today&apos;s headlines.</p>
      </div>
      <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${live ? "bg-flow shadow-[0_0_10px_var(--flow)]" : "bg-warn"}`}
            aria-hidden
          />
          <dt className="sr-only">Stream</dt>
          <dd>{wsLabel[stats.ws]}</dd>
        </div>
        <Stat label="New tokens / min" value={stats.perMin.toLocaleString()} />
        <Stat label="Scanned" value={stats.seen.toLocaleString()} />
        <Stat label="Matched" value={stats.matched.toLocaleString()} />
        <Stat label="SOL" value={solUsd ? `$${solUsd.toFixed(2)}` : "-"} />
        {graduations > 0 && <Stat label="Graduated" value={String(graduations)} />}
        {alerts && (
          <div>
            <button
              type="button"
              onClick={alerts.toggle}
              aria-pressed={alerts.enabled}
              title={
                alerts.permission === "denied"
                  ? "Browser notifications are blocked for this site, sound still works"
                  : "Sound and notification when a signal turns Rising, Strong or Graduated"
              }
              className={`rounded-full border px-3 py-1 text-sm ${
                alerts.enabled ? "border-flow bg-flow text-ink" : "border-line text-muted hover:text-text"
              }`}
            >
              {alerts.enabled ? "Alerts on" : "Alerts off"}
            </button>
          </div>
        )}
      </dl>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="font-display font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
