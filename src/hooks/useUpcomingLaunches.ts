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
              // console.debug(`[useUpcomingLaunches] processing item id=${item.id} name=${item.link}`);
              const corr = (item as any).correlationId;
              if (corr && futureMap && futureMap[corr]) {
                // Prefer PrimaryLaunchDate, fall back to TZeroLaunchDate
                const dateObj = futureMap[corr].PrimaryLaunchDate ?? futureMap[corr].TZeroLaunchDate;
                if (dateObj && dateObj.Seconds) {
                  const secsUtc = Number(dateObj.Seconds);
                  if (!Number.isNaN(secsUtc) && secsUtc > 0) {
                    const epochMs = secsUtc * 1000;

                    // guess time zone from launch site (same heuristics as LaunchCard)
                    const site: string | undefined = (item as any).launchSite;
                    function guessTimeZone(site?: string) {
                      if (!site) return "UTC";
                      const s = site.toLowerCase();
                      if (s.includes("starbase")) return "America/Chicago";
                      if (
                        s.includes("lc-39a") ||
                        s.includes("launch complex 39") ||
                        s.includes("kennedy") ||
                        s.includes("florida")
                      )
                        return "America/New_York";
                      if (s.includes("slc-40") || s.includes("cape")) return "America/New_York";
                      if (s.includes("vandenberg") || s.includes("sbc") || s.includes("santa"))
                        return "America/Los_Angeles";
                      if (s.includes("vandy") || s.includes("sls") || s.includes("california"))
                        return "America/Los_Angeles";
                      if (s.includes("california")) return "America/Los_Angeles";
                      return "UTC";
                    }

                    const tz = guessTimeZone(site);

                    // Use Intl.DateTimeFormat to get the site's wall-clock components for the epoch
                    const dtf = new Intl.DateTimeFormat("en-US", {
                      timeZone: tz,
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    });
                    const parts = dtf.formatToParts(new Date(epochMs));
                    const get = (type: string) => parts.find((p) => p.type === type)!.value;
                    const y = Number(get("year"));
                    const mm = get("month");
                    const day = get("day");
                    const hh = get("hour");
                    const mins = get("minute");
                    const ss = get("second");

                    out.launchDate = `${y}-${mm}-${day}`;
                    out.launchTime = `${hh}:${mins}:${ss}`;
                  }
                }
              }
            } catch (e) {
              // ignore per-item errors
            }
            console.log(out)
            // fetch mission details for webcast info
            try {
              const link = (item as any).link;
              if (link) {
                // Normalize link into a single mission slug. Tiles sometimes contain
                // values like "missions/starlinkg10-56" or "/missions/starlinkg10-56".
                // We want just "starlinkg10-56" to avoid double "missions/" or
                // encoded slashes which lead to upstream 404s.
                let raw = String(link);
                try {
                  raw = decodeURIComponent(raw);
                } catch (e) {
                  // ignore decode errors and keep raw
                }
                if (raw.includes('/')) {
                  const parts = raw.split('/').filter(Boolean);
                  raw = parts[parts.length - 1];
                }
                const missionId = raw;
                const missionUrl = `${MISSIONS_BASE}/${encodeURIComponent(missionId)}`;
                console.debug(
                  `[useUpcomingLaunches] fetching mission details for link=${link} missionId=${missionId} url=${missionUrl}`
                );
                const mres = await fetch(missionUrl);
                if (mres.ok) {
                  const mission = await mres.json();
                  const webcasts = mission?.webcasts;
                  if (Array.isArray(webcasts) && webcasts.length > 0 && webcasts[0]?.videoId) {
                    const vid = webcasts[0].videoId;
                    out.webcastUrl = `https://x.com/SpaceX/status/${vid}`;
                  }
                } else {
                  console.debug(`[useUpcomingLaunches] mission fetch failed status=${mres.status} url=${missionUrl}`);
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
