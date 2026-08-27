"use client";

import { useEffect, useRef, useState } from "react";
import { X, Check, Newspaper, type LucideIcon } from "lucide-react";

type StatsPayload = {
  claimsReported: number;
  claimsVerified: number;
  sourcesTracked: number;
};

type StatKey = keyof StatsPayload;

const EMPTY_STATS: StatsPayload = {
  claimsReported: 0,
  claimsVerified: 0,
  sourcesTracked: 0,
};

const POLL_INTERVAL_MS = 45_000;
const INITIAL_COUNT_DURATION_MS = 1_300;
const UPDATE_COUNT_DURATION_MS = 750;

function CountUpNumber({
  value,
  duration,
}: {
  value: number;
  duration: number;
}) {
  const previousValue = useRef(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startValue = previousValue.current;
    const targetValue = Math.max(0, value);
    const startTime = performance.now();
    let frameId = 0;

    function tick(now: number) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(startValue + (targetValue - startValue) * eased));

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousValue.current = targetValue;
        setDisplayValue(targetValue);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [duration, value]);

  return <>{displayValue.toLocaleString("en-US")}</>;
}

function StatCard({
  borderClass,
  iconBgClass,
  pulseClass,
  Icon,
  count,
  label,
  duration,
  pulseToken,
}: {
  borderClass: string;
  iconBgClass: string;
  pulseClass: string;
  Icon: LucideIcon;
  count: number;
  label: string;
  duration: number;
  pulseToken: number;
}) {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (pulseToken === 0) return;

    setIsPulsing(false);
    const frameId = requestAnimationFrame(() => setIsPulsing(true));
    return () => cancelAnimationFrame(frameId);
  }, [pulseToken]);

  return (
    <div
      className={`stat-card w-full rounded-2xl border-2 ${borderClass} bg-white px-6 py-7 text-center ${isPulsing ? pulseClass : ""}`}
      onAnimationEnd={() => setIsPulsing(false)}
    >
      <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${iconBgClass} text-white mb-4`}>
        <Icon className="w-6 h-6" strokeWidth={3} />
      </span>
      <p className="font-serif font-bold text-3xl md:text-4xl text-neutral-900">
        <CountUpNumber value={count} duration={duration} />
      </p>
      <p className="font-serif font-bold text-lg text-neutral-900 mt-2">{label}</p>
      <p className="font-sans text-xs text-neutral-500 mt-1">Since August 2026</p>
    </div>
  );
}

export default function ClaimStats() {
  const [stats, setStats] = useState<StatsPayload>(EMPTY_STATS);
  const [countDuration, setCountDuration] = useState(INITIAL_COUNT_DURATION_MS);
  const hasLoadedRef = useRef(false);
  const latestStatsRef = useRef<StatsPayload>(EMPTY_STATS);
  const [pulseTokens, setPulseTokens] = useState<Record<StatKey, number>>({
    claimsReported: 0,
    claimsVerified: 0,
    sourcesTracked: 0,
  });

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      try {
        const response = await fetch("/api/stats", { cache: "no-store" });
        if (!response.ok) return;

        const nextStats = (await response.json()) as StatsPayload;
        if (!isMounted) return;

        const changedKeys = (Object.keys(EMPTY_STATS) as StatKey[]).filter(
          (key) => hasLoadedRef.current && nextStats[key] !== latestStatsRef.current[key],
        );

        setCountDuration(
          hasLoadedRef.current ? UPDATE_COUNT_DURATION_MS : INITIAL_COUNT_DURATION_MS,
        );
        latestStatsRef.current = nextStats;
        setStats(nextStats);
        hasLoadedRef.current = true;

        if (changedKeys.length > 0) {
          setPulseTokens((current) => {
            const next = { ...current };
            for (const key of changedKeys) next[key] += 1;
            return next;
          });
        }
      } catch (error) {
        console.error("[ClaimStats] failed to fetch stats:", error);
      }
    }

    fetchStats();
    const intervalId = window.setInterval(fetchStats, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className="max-w-6xl mx-auto px-6 py-10">
      <hr className="border-t-2 border-neutral-800 mb-10" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
        <StatCard
          borderClass="border-red-700"
          iconBgClass="bg-red-600"
          pulseClass="stat-pulse-red"
          Icon={X}
          count={stats.claimsReported}
          label="Claims Reported"
          duration={countDuration}
          pulseToken={pulseTokens.claimsReported}
        />
        <StatCard
          borderClass="border-emerald-800"
          iconBgClass="bg-emerald-600"
          pulseClass="stat-pulse-green"
          Icon={Check}
          count={stats.claimsVerified}
          label="Claims Verified"
          duration={countDuration}
          pulseToken={pulseTokens.claimsVerified}
        />
        <StatCard
          borderClass="border-blue-700"
          iconBgClass="bg-blue-600"
          pulseClass="stat-pulse-blue"
          Icon={Newspaper}
          count={stats.sourcesTracked}
          label="Active News Sources Tracked"
          duration={countDuration}
          pulseToken={pulseTokens.sourcesTracked}
        />
      </div>
    </section>
  );
}
