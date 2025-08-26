import { useEffect, useState, useRef } from "react";
import type { LaunchTile, LaunchTileWithTimelines, TimelineBlock } from "../types/launch";

const API_URL = "/api/spacex/tiles";
const FUTURE_URL = "/api/spacex/future_missions.json";
const MISSIONS_BASE = "/api/spacex/missions";

export function useUpcomingLaunches() {
  const [data, setData] = useState<LaunchTileWithTimelines[] | null>(null);
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
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const json = (await res.json()) as LaunchTile[];

        let futureMap: Record<string, any> | null = null;
        try {
          const fr = await fetch(FUTURE_URL);
          if (fr.ok) futureMap = await fr.json();
        } catch (e) {
          futureMap = null;
        }

        const enriched = await Promise.all(
          json.map(async (item) => {
            const out: any = { ...item } as LaunchTileWithTimelines;

            // apply future_missions override if present
            try {
              const corr = (item as any).correlationId;
              if (corr && futureMap && futureMap[corr]) {
                // Prefer PrimaryLaunchDate, fall back to TZeroLaunchDate
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
                const dateObj = futureMap[corr].PrimaryLaunchDate ?? futureMap[corr].TZeroLaunchDate;
                if (dateObj && dateObj.Seconds) {
                  const secsUtc = Number(dateObj.Seconds);
                  if (!Number.isNaN(secsUtc) && secsUtc > 0) {
                    const epochMs = secsUtc * 1000;

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
                // If this is a Starlink mission, try to extract group numbers from the link
                try {
                  const mType = (item as any).missionType ?? futureMap[corr].missionType;
                  if (typeof mType === "string" && mType.toLowerCase() === "starlink") {
                    const linkRaw = String((item as any).link ?? "").toLowerCase();
                    // look for patterns like '10-56' in 'starlinkg10-56' or 'sl-10-11' etc.
                    const m = linkRaw.match(/(\d+)[-_](\d+)/);
                    if (m && m[1] && m[2]) {
                      const group = `${m[1]}-${m[2]}`;
                      if (!String(out.title).includes(`Group ${group}`)) {
                        out.title = `${out.title} (Group ${group})`;
                      }
                    }
                  }
                } catch (e) {
                  // ignore
                }
                // capture paused/stopclock info when available
                try {
                  const paused = Boolean(futureMap[corr].TZeroPaused);
                  out.tZeroPaused = paused;
                  if (paused) {
                    const tval = futureMap[corr].TZeroValue;
                    let display: string | null = null;
                    let tSeconds: number | undefined = undefined;
                    if (typeof tval === "number") {
                      tSeconds = Math.floor(tval);
                      const n = tSeconds;
                      const sign = n >= 0 ? "+" : "-";
                      const abs = Math.abs(n);
                      const hh = String(Math.floor(abs / 3600)).padStart(2, "0");
                      const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
                      const ss = String(abs % 60).padStart(2, "0");
                      display = `T${sign}${hh}:${mm}:${ss}`;
                    } else if (typeof tval === "string") {
                      const s = tval.trim();
                      // If it looks like 'T-18:00:00' or similar, parse it
                      const p = s.match(/^T([+-])(\d{1,2}):(\d{2}):(\d{2})$/i);
                      if (p) {
                        const sign = p[1] === "+" ? 1 : -1;
                        const hh = Number(p[2]);
                        const mmn = Number(p[3]);
                        const ssn = Number(p[4]);
                        tSeconds = sign * (hh * 3600 + mmn * 60 + ssn);
                        display = s;
                      } else {
                        // If it's a numeric string, parse it as seconds
                        const n = Number(s);
                        if (!Number.isNaN(n)) {
                          tSeconds = Math.floor(n);
                          const sign = tSeconds >= 0 ? "+" : "-";
                          const abs = Math.abs(tSeconds);
                          const hh = String(Math.floor(abs / 3600)).padStart(2, "0");
                          const mm = String(Math.floor((abs % 3600) / 60)).padStart(2, "0");
                          const ss = String(abs % 60).padStart(2, "0");
                          display = `T${sign}${hh}:${mm}:${ss}`;
                        } else {
                          display = s || null;
                        }
                      }
                    } else {
                      display = String(tval ?? null);
                    }
                    out.tZeroValue = display;
                    if (typeof tSeconds === "number") {
                      out._tZeroSeconds = tSeconds;
                      try {
                        // compute T epoch from current time and stopclock seconds
                        const nowMs = Date.now();
                        const targetEpochMs = nowMs - tSeconds * 1000;
                        out._epochMs = targetEpochMs;

                        // Recreate dtf for the site's timezone to extract wall-clock parts
                        const dtfTarget = new Intl.DateTimeFormat("en-US", {
                          timeZone: guessTimeZone(site),
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        });
                        const targetParts = dtfTarget.formatToParts(new Date(targetEpochMs));
                        const getTarget = (type: string) => targetParts.find((p: Intl.DateTimeFormatPart) => p.type === type)!.value;
                        const y2 = Number(getTarget("year"));
                        const mm2 = getTarget("month");
                        const day2 = getTarget("day");
                        const hh2 = getTarget("hour");
                        const mins2 = getTarget("minute");
                        const ss2 = getTarget("second");
                        out.launchDate = `${y2}-${mm2}-${day2}`;
                        out.launchTime = `${hh2}:${mins2}:${ss2}`;
                      } catch (e) {
                        // ignore recalculation errors
                      }
                    }
                  } else {
                    out.tZeroValue = null;
                  }
                } catch (e) {
                  // ignore
                }
              }
            } catch (e) {
              // ignore per-item errors
            }
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
                const mres = await fetch(missionUrl);
                if (mres.ok) {
                  const mission = await mres.json();
                  const webcasts = mission?.webcasts;
                  if (Array.isArray(webcasts) && webcasts.length > 0 && webcasts[0]?.videoId) {
                    const vid = webcasts[0].videoId;
                    out.webcastUrl = `https://x.com/SpaceX/status/${vid}`;
                  }

                  // Attach timeline blocks when available. The mission API sometimes
                  // exposes preLaunchTimeline and postLaunchTimeline objects that
                  // contain a timelineEntries array of events.
                  try {
                    const pre: TimelineBlock | null = mission?.preLaunchTimeline ?? null;
                    const post: TimelineBlock | null = mission?.postLaunchTimeline ?? null;
                    if (pre && pre.timelineEntries && Array.isArray(pre.timelineEntries)) {
                      out.preLaunchTimeline = pre;
                    }
                    if (post && post.timelineEntries && Array.isArray(post.timelineEntries)) {
                      out.postLaunchTimeline = post;
                    }
                  } catch (e) {
                    // ignore timeline parsing errors
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
          lastSerializedRef.current = serialized;
          setData(enriched);
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
    }, 10_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return { data, loading, error };
}
