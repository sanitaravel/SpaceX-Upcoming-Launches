import { useMemo, useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useUpcomingLaunches } from "../hooks/useUpcomingLaunches";
import useNow from "../hooks/useNow";
import type { TimelineEntry } from "../types/launch";
import { Pause, Clock } from "lucide-react";

function ensureSignedTime(t?: string | null, isPre = false) {
  if (!t) return t ?? null;
  let s = String(t).trim();
  s = s.replace(/^T([+-])\s+/, "T$1").replace(/^([+-])\s+/, "$1");
  s = s.replace(/\s+/g, " ").trim();
  if (/^[Tt][+-]/.test(s) || /^[+-]/.test(s)) return s.replace(/^([Tt]?)([+-])\s*/, "$1$2");
  if (/^[Tt]\d/.test(s)) return (isPre ? "T-" : "T+") + s.slice(1);
  return (isPre ? "T-" : "T+") + s;
}

function sanitizeDescription(d?: string | null) {
  if (!d) return d ?? null;
  let s = String(d).replace(/\bSpaceX\b/gi, "");
  s = s.replace(/[\s\u00A0]+/g, " ").trim();
  s = s.replace(/^[\s:–—-]+/, "");
  return s || null;
}

function parseOffsetSeconds(timeStr?: string | null) {
  if (!timeStr) return NaN;
  const s = String(timeStr).trim();
  const m = s.match(/^T?([+-])?(\d{1,2}:)?(\d{1,2}):(\d{2})$/);
  if (!m) return NaN;
  const sign = m[1] === "-" ? -1 : 1;
  const parts = s.replace(/^T/, "").replace(/^\+/, "").replace(/^\-/, "").split(":");
  let hh = 0;
  let mmn = 0;
  let ss = 0;
  if (parts.length === 3) {
    hh = Number(parts[0]);
    mmn = Number(parts[1]);
    ss = Number(parts[2]);
  } else if (parts.length === 2) {
    mmn = Number(parts[0]);
    ss = Number(parts[1]);
  }
  if ([hh, mmn, ss].some((n) => Number.isNaN(n))) return NaN;
  return sign * (hh * 3600 + mmn * 60 + ss);
}

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

// Given wall-clock components and an IANA timeZone, compute epoch ms for that wall time.
function epochFromWallTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
) {
  let guess = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i++) {
    const d = new Date(guess);
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = dtf.formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)!.value;
    const y = Number(get("year"));
    const m = Number(get("month"));
    const dayp = Number(get("day"));
    const h = Number(get("hour"));
    const min = Number(get("minute"));
    const sec = Number(get("second"));
    const asUTC = Date.UTC(y, m - 1, dayp, h, min, sec);
    const offset = asUTC - d.getTime();
    guess = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
  }
  return guess;
}

function missionIdFromLink(link?: string, fallback?: string) {
  if (!link) return fallback ?? "";
  try {
    let raw = String(link);
    raw = decodeURIComponent(raw);
    if (raw.includes('/')) {
      const parts = raw.split('/').filter(Boolean);
      raw = parts[parts.length - 1];
    }
    return raw || String(fallback ?? "");
  } catch (e) {
    return String(fallback ?? "");
  }
}

export default function LaunchDetail() {
  const [, params] = useRoute("/launch/:id");
  const id = params?.id ?? "";
  const { data, loading, error } = useUpcomingLaunches();
  const now = useNow();

  const launch = useMemo(() => {
    if (!data) return null;
    return data.find((l) => missionIdFromLink(l.link, String(l.id)) === id || String(l.id) === id) ?? null;
  }, [data, id]);

  const [pausedSnapshot, setPausedSnapshot] = useState<null | { description?: string | null; time?: string | null }>(null);

  // build timeline (safe to run even if `launch` is null)
  const timeline: { entry: TimelineEntry; epoch: number }[] = [];
  const timelineEntries: TimelineEntry[] = [];
  let launchEpoch: number | null = null;
  if (launch) {
    if (launch.preLaunchTimeline?.timelineEntries) {
      timelineEntries.push(...launch.preLaunchTimeline.timelineEntries.map((e) => ({ ...e, time: ensureSignedTime(e.time, true), description: sanitizeDescription(e.description) })));
    } else {
      timelineEntries.push({ id: -1, time: "T-00:00:00", description: "Liftoff" });
    }
    if (launch.postLaunchTimeline?.timelineEntries) {
      timelineEntries.push(...launch.postLaunchTimeline.timelineEntries.map((e) => ({ ...e, time: ensureSignedTime(e.time, false), description: sanitizeDescription(e.description) })));
    }

    try {
      if ((launch as any)._epochMs && typeof (launch as any)._epochMs === "number") {
        launchEpoch = (launch as any)._epochMs as number;
      } else if (launch.launchTime) {
        const [hh, mm, ss] = launch.launchTime.split(":").map((n) => Number(n));
        const [y, m, d] = launch.launchDate.split("-").map((n) => Number(n));
        const tz = guessTimeZone(launch.launchSite);
        launchEpoch = epochFromWallTime(y, m, d, hh ?? 0, mm ?? 0, ss ?? 0, tz);
      } else {
        launchEpoch = new Date(launch.launchDate).getTime();
      }
    } catch (e) {
      launchEpoch = null;
    }

    if (launchEpoch) {
      for (const e of timelineEntries) {
        const offset = parseOffsetSeconds(e.time ?? null);
        if (Number.isNaN(offset)) continue;
        timeline.push({ entry: e, epoch: launchEpoch + offset * 1000 });
      }
    }
  }

  const nextEvent = (() => {
    if (!timeline || timeline.length === 0) return null;
    const future = timeline.filter((t) => t.epoch >= now.getTime());
    if (future.length === 0) return null;
    future.sort((a, b) => a.epoch - b.epoch);
    return future[0];
  })();

  useEffect(() => {
    if (launch?.tZeroPaused) {
      if (nextEvent && !pausedSnapshot) {
        setPausedSnapshot({ description: nextEvent.entry.description, time: nextEvent.entry.time });
      }
    } else {
      if (pausedSnapshot) setPausedSnapshot(null);
    }
  }, [launch?.tZeroPaused, nextEvent, pausedSnapshot]);

  if (loading) return <main className="p-6">Loading...</main>;
  if (error) return <main className="p-6 text-red-600">Error: {error}</main>;
  if (!launch) return <main className="p-6">Launch not found.</main>;

  

  function formatCountdown(targetMs: number | null) {
    if (!targetMs) return "";
    const diff = targetMs - now.getTime();
    const sign = diff >= 0 ? "-" : "+";
    const abs = Math.abs(Math.floor(diff / 1000));
    const days = Math.floor(abs / 86400);
    const hours = Math.floor((abs % 86400) / 3600);
    const mins = Math.floor((abs % 3600) / 60);
    const secs = abs % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    if (days > 0) return `T${sign}${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    return `T${sign}${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }

  return (
    <main className="p-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{launch.title}</h1>
          <div className="mt-2 text-sm text-gray-700">
            <dl className="space-y-1">
              <div>
                <dt className="font-medium">Vehicle</dt>
                <dd>{launch.vehicle ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium">Launch Site</dt>
                <dd>{launch.launchSite ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-medium">Launch Time</dt>
                <dd>{launchEpoch ? new Date(launchEpoch).toLocaleString() : "—"}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="flex-shrink-0 text-right">
          <div className="text-sm font-semibold text-gray-600">Countdown</div>

          {launch.tZeroPaused ? (
            <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-[#ff7a00] text-[#242424] rounded-md text-base justify-end">
              <Pause size={16} aria-hidden="false" aria-label="T-Zero paused" />
              <span className="sr-only">T‑Zero Paused</span>
              {launch.tZeroValue ? <span className="font-mono">{launch.tZeroValue}</span> : null}
            </div>
          ) : launchEpoch ? (
            <div className="mt-2 text-xl font-mono text-[#ff7a00] flex items-center justify-end gap-2">
              <Clock size={18} />
              <span>{formatCountdown(launchEpoch)}</span>
            </div>
          ) : (
            <div className="mt-2 text-xl font-mono text-[#ff7a00]">Date unknown</div>
          )}

          <div className="mt-4 text-left w-64 ml-auto">
            <h3 className="text-sm font-semibold">Next Event</h3>
            {nextEvent ? (
              <article className="mt-2 p-3 border rounded-md bg-white/5">
                <div className="text-sm text-gray-600">{pausedSnapshot?.description ?? nextEvent.entry.description}</div>
                <div className="mt-2 text-xs font-mono text-gray-500">{pausedSnapshot?.time ?? nextEvent.entry.time} • {launch.tZeroPaused ? (launch.tZeroValue ?? formatCountdown(nextEvent.epoch)) : formatCountdown(nextEvent.epoch)}</div>
              </article>
            ) : (
              <div className="mt-2 text-gray-500">No upcoming timeline events.</div>
            )}
          </div>
        </div>
      </header>

      {/* Countdown and next event moved into header */}

      <section aria-labelledby="timeline" className="mb-6">
        <h3 id="timeline" className="text-lg font-semibold">Timeline</h3>
        <div className="mt-3 space-y-2">
          {timelineEntries.map((e) => {
            const offset = parseOffsetSeconds(e.time ?? null);
            const epoch = launchEpoch && !Number.isNaN(offset) ? launchEpoch + offset * 1000 : null;
            
            return (
              <div key={e.id} className="flex items-start gap-4">
                <div className="w-3 flex-shrink-0">
                  <div className="h-3 w-3 rounded-full bg-[#ff7a00] mt-1" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{e.description}</div>
                  <div className="text-xs text-gray-500 font-mono">{e.time} {epoch ? <span>• {new Date(epoch).toLocaleString()}</span> : null}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Launch Information section removed per design: details moved into header */}
    </main>
  );
}
