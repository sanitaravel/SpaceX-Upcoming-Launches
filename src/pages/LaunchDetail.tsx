import { useMemo } from "react";
import { useRoute } from "wouter";
import { useUpcomingLaunches } from "../hooks/useUpcomingLaunches";
import useNow from "../hooks/useNow";
import type { LaunchTileWithTimelines, TimelineEntry } from "../types/launch";
import { Play } from "lucide-react";

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

  if (loading) return <main className="p-6">Loading...</main>;
  if (error) return <main className="p-6 text-red-600">Error: {error}</main>;
  if (!launch) return <main className="p-6">Launch not found.</main>;

  // build timeline
  const timeline: { entry: TimelineEntry; epoch: number }[] = [];
  const timelineEntries: TimelineEntry[] = [];
  if (launch.preLaunchTimeline?.timelineEntries) {
    timelineEntries.push(...launch.preLaunchTimeline.timelineEntries.map((e) => ({ ...e, time: ensureSignedTime(e.time, true), description: sanitizeDescription(e.description) })));
  } else {
    timelineEntries.push({ id: -1, time: "T-00:00:00", description: "Liftoff" });
  }
  if (launch.postLaunchTimeline?.timelineEntries) {
    timelineEntries.push(...launch.postLaunchTimeline.timelineEntries.map((e) => ({ ...e, time: ensureSignedTime(e.time, false), description: sanitizeDescription(e.description) })));
  }

  // compute launch epoch if possible from launch.launchDate/launch.launchTime using UTC fallback
  let launchEpoch: number | null = null;
  try {
    if (launch.launchTime) {
      const [hh, mm, ss] = launch.launchTime.split(":").map((n) => Number(n));
      const [y, m, d] = launch.launchDate.split("-").map((n) => Number(n));
      launchEpoch = Date.UTC(y, m - 1, d, hh ?? 0, mm ?? 0, ss ?? 0);
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

  const nextEvent = (() => {
    if (!timeline || timeline.length === 0) return null;
    const future = timeline.filter((t) => t.epoch >= now.getTime());
    if (future.length === 0) return null;
    future.sort((a, b) => a.epoch - b.epoch);
    return future[0];
  })();

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
      <header className="mb-6">
        <h1 className="text-2xl font-bold">{launch.title}</h1>
        <p className="text-sm text-gray-500 mt-1">Mission ID: {missionIdFromLink(launch.link, String(launch.id))}</p>
      </header>

      <section aria-labelledby="countdown" className="mb-6">
        <h2 id="countdown" className="text-lg font-semibold">Countdown</h2>
        <div className="mt-2 text-xl font-mono text-[#ff7a00]">
          {launchEpoch ? formatCountdown(launchEpoch) : "Date unknown"}
        </div>
      </section>

      <section aria-labelledby="next-event" className="mb-6">
        <h3 id="next-event" className="text-lg font-semibold">Next Event</h3>
        {nextEvent ? (
          <article className="mt-2 p-4 border rounded-md">
            <div className="text-sm text-gray-600">{nextEvent.entry.description}</div>
            <div className="mt-2 text-xs font-mono text-gray-500">{nextEvent.entry.time} • {formatCountdown(nextEvent.epoch)}</div>
          </article>
        ) : (
          <div className="mt-2 text-gray-500">No upcoming timeline events.</div>
        )}
      </section>

      <section aria-labelledby="timeline" className="mb-6">
        <h3 id="timeline" className="text-lg font-semibold">Timeline</h3>
        <div className="mt-3 space-y-2">
          {timelineEntries.map((e) => {
            const offset = parseOffsetSeconds(e.time ?? null);
            const epoch = launchEpoch && !Number.isNaN(offset) ? launchEpoch + offset * 1000 : null;
            const pct = epoch && launchEpoch ? Math.max(0, Math.min(100, Math.round(((epoch - launchEpoch) / (24 * 3600 * 1000)) * 100))) : 0;
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

      <section aria-labelledby="info" className="mb-6">
        <h3 id="info" className="text-lg font-semibold">Launch Information</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-sm text-gray-700">
          <div>
            <dt className="font-medium">Vehicle</dt>
            <dd>{launch.vehicle ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium">Launch Site</dt>
            <dd>{launch.launchSite ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium">Local Date</dt>
            <dd>{launch.launchDate ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-medium">Local Time</dt>
            <dd>{launch.launchTime ?? "—"}</dd>
          </div>
        </dl>

        {launch.webcastUrl ? (
          <div className="mt-4">
            <a href={launch.webcastUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-[#ff7a00] rounded-md text-sm font-semibold" style={{ color: "#242424" }}>
              <Play size={16} /> Watch Webcast
            </a>
          </div>
        ) : null}
      </section>
    </main>
  );
}
