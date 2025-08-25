import { useEffect, useState, useRef } from "react";
import type { LaunchTile } from "../types/launch";

const API_URL = "/api/spacex/tiles";
const FUTURE_URL = "/api/spacex/future_missions.json";
const MISSIONS_BASE = "/api/spacex/missions";

export function useUpcomingLaunches() {
  const [data, setData] = useState<LaunchTile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const lastSerializedRef = useRef<string | null>(null);
  const initialDoneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let running = false;

    async function fetchData() {
      if (running || cancelled) return;
      running = true;
      const isFirst = !initialDoneRef.current;
      if (isFirst) setLoading(true);
      setError(null);

      try {
        console.debug(`[useUpcomingLaunches] fetching tiles url=${API_URL}`);
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = (await res.json()) as LaunchTile[];

        let futureMap: Record<string, any> | null = null;
        try {
          console.debug(`[useUpcomingLaunches] fetching future map url=${FUTURE_URL}`);
          const fr = await fetch(FUTURE_URL);
          if (fr.ok) futureMap = await fr.json();
        } catch (e) {
          futureMap = null;
        }

        const enriched = await Promise.all(
          json.map(async (item) => {
            const out: any = { ...item };

            // apply future_missions override if present
            try {
              const corr = (item as any).correlationId;
              if (
                corr &&
                futureMap &&
                futureMap[corr] &&
                futureMap[corr].PrimaryLaunchDate &&
                futureMap[corr].PrimaryLaunchDate.Seconds
              ) {
                const secs = Number(futureMap[corr].PrimaryLaunchDate.Seconds);
                if (!Number.isNaN(secs) && secs > 0) {
                  const d = new Date(secs * 1000);
                  const y = d.getUTCFullYear();
                  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
                  const day = String(d.getUTCDate()).padStart(2, "0");
                  const hh = String(d.getUTCHours()).padStart(2, "0");
                  const mins = String(d.getUTCMinutes()).padStart(2, "0");
                  const ss = String(d.getUTCSeconds()).padStart(2, "0");
                  out.launchDate = `${y}-${mm}-${day}`;
                  out.launchTime = `${hh}:${mins}:${ss}`;
                }
              }
            } catch (e) {
              // ignore per-item errors
            }

            // fetch mission details for webcast info
            try {
              const link = (item as any).link;
              if (link) {
                const missionUrl = `${MISSIONS_BASE}/${encodeURIComponent(link)}`;
                console.debug(
                  `[useUpcomingLaunches] fetching mission details for link=${link} url=${missionUrl}`
                );
                const mres = await fetch(missionUrl);
                if (mres.ok) {
                  const mission = await mres.json();
                  const webcasts = mission?.webcasts;
                  if (Array.isArray(webcasts) && webcasts.length > 0 && webcasts[0]?.videoId) {
                    const vid = webcasts[0].videoId;
                    out.webcastUrl = `https://x.com/SpaceX/status/${vid}`;
                  }
                }
              }
            } catch (e) {
              // ignore per-mission errors
            }

            return out;
          })
        );

        const serialized = JSON.stringify(enriched);
        if (!cancelled && serialized !== lastSerializedRef.current) {
          console.info(`[useUpcomingLaunches] data changed - updating state; items=${enriched.length}`);
          lastSerializedRef.current = serialized;
          setData(enriched);
        } else {
          console.debug("[useUpcomingLaunches] fetched data identical to previous; skipping setData");
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "unknown");
      } finally {
        running = false;
        if (isFirst) {
          initialDoneRef.current = true;
          if (!cancelled) setLoading(false);
        }
      }
    }

    fetchData();
    const id = setInterval(() => {
      if (!running && !cancelled) fetchData();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { data, loading, error };
}
