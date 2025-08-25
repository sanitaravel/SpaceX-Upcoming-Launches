import { useEffect, useState, useRef } from "react";
import type { LaunchTile } from "../types/launch";

// Proxied endpoints through Vite dev server to avoid CORS during development
const API_URL = "/api/spacex/tiles";
const FUTURE_URL = "/api/spacex/future_missions.json";

export function useUpcomingLaunches(useMock = false) {
  const [data, setData] = useState<LaunchTile[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // keep last serialized payload to avoid unnecessary state updates
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
        console.debug(
          `[useUpcomingLaunches] fetching tiles - useMock=${useMock} url=${
            !useMock ? "/api_response_mokup.json" : API_URL
          } `
        );
        const res = !useMock
          ? await fetch("/api_response_mokup.json")
          : await fetch(API_URL);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = (await res.json()) as LaunchTile[];
        // try to fetch future missions map (correlationId -> PrimaryLaunchDate)
        let futureMap: Record<string, any> | null = null;
        try {
          console.debug(
            `[useUpcomingLaunches] fetching future map - useMock=${useMock} url=${
              !useMock ? "/api_future_missions.json" : FUTURE_URL
            }`
          );
          const fr = !useMock
            ? await fetch("/api_future_missions.json")
            : await fetch(FUTURE_URL);
          if (fr.ok) futureMap = await fr.json();
        } catch (e) {
          // ignore missing future map
          futureMap = null;
        }

        // Enrich each item: apply future_missions date (by correlationId) and fetch mission details for webcasts
        const enriched = await Promise.all(
          json.map(async (item) => {
            let out: any = { ...item };

            // apply future_missions date override when available
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
                  // set launchDate in YYYY-MM-DD and launchTime in HH:MM:SS (UTC)
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

            // fetch mission details to extract webcasts[0].videoId
            try {
              const link = (item as any).link;
              if (link) {
                const missionUrl = !useMock
                  ? "/api_mission.json"
                  : `/api/spacex/missions/${encodeURIComponent(link)}`;
                console.debug(
                  `[useUpcomingLaunches] fetching mission details for link=${link} url=${missionUrl}`
                );
                const mres = !useMock
                  ? await fetch("/api_mission.json")
                  : await fetch(
                      `/api/spacex/missions/${encodeURIComponent(link)}`
                    );
                if (mres.ok) {
                  const mission = await mres.json();
                  const webcasts = mission?.webcasts;
                  if (
                    Array.isArray(webcasts) &&
                    webcasts.length > 0 &&
                    webcasts[0]?.videoId
                  ) {
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

        // Only update state when the payload changed
        const serialized = JSON.stringify(enriched);
        if (!cancelled && serialized !== lastSerializedRef.current) {
          console.info(
            `[useUpcomingLaunches] data changed - updating state; items=${enriched.length}`
          );
          lastSerializedRef.current = serialized;
          setData(enriched);
        } else {
          console.debug(
            "[useUpcomingLaunches] fetched data identical to previous; skipping setData"
          );
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

    // initial fetch and periodic polling every 60s
    fetchData();
    const id = setInterval(() => {
      if (!running && !cancelled) fetchData();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [useMock]);

  return { data, loading, error };
}
