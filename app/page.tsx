"use client";

import { useEffect, useState } from "react";
import { useEngine } from "@/lib/engine";
import { useAlerts } from "@/lib/alerts";
import { Header } from "@/components/Header";
import { NarrativeWall } from "@/components/NarrativeWall";
import { SignalFeed } from "@/components/SignalFeed";
import { Watchlist } from "@/components/Watchlist";
import { Report } from "@/components/Report";

export default function Home() {
  const { narratives, narrError, signals, hits, stats, clearHistory, fresh, watch, setWatch, graduations, role } =
    useEngine();
  const alerts = useAlerts(signals);
  const solUsd = narratives?.solUsd ?? null;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  return (
    <main>
      <Header stats={stats} solUsd={solUsd} alerts={alerts} graduations={graduations} />
      {role === "standby" && (
        <p role="status" className="border-b border-warn/30 bg-warn/10 px-5 py-2 text-sm text-warn md:px-8">
          The scanner is already running in another tab. This tab shows its signals and takes over if that tab closes.
        </p>
      )}
      <NarrativeWall data={narratives} error={narrError} hits={hits} fresh={fresh} watchWords={watch}>
        <Watchlist words={watch} onChange={setWatch} />
      </NarrativeWall>
      <SignalFeed signals={signals} solUsd={solUsd} ready={!!narratives} onClear={clearHistory} />
      <Report signals={signals} now={now} />
      <footer className="border-t border-line px-5 py-6 text-xs text-muted md:px-8">
        Scanning runs in this tab while it stays open. Signals are not financial advice; most new tokens go to zero.
      </footer>
    </main>
  );
}
