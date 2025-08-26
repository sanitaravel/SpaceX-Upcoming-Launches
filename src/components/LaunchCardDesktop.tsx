import { Clock, Rocket, Play, MapPin, Pause, Flag } from "lucide-react";
import type { TimelineEntry, LaunchTileWithTimelines } from "../types/launch";
import useNow from "../hooks/useNow";

type Props = {
  launch: LaunchTileWithTimelines;
  desktopImg: string | null;
  mobileImg: string | null;
  display: string;
  userTzLabel: string;
  launchEpoch: number | null;
  countdown: string;
};

export default function LaunchCardDesktop({
  launch,
  desktopImg,
  mobileImg,
  display,
  userTzLabel,
  launchEpoch,
  countdown,
}: Props) {
  // compute next upcoming timeline event (relative to launchEpoch)
  const now = useNow();
  const allTimeline: TimelineEntry[] = [];
  function ensureSignedTime(t?: string | null, isPre = false) {
    if (!t) return t ?? null;
    const s = String(t).trim();
    // If already has explicit sign (T+ / T- / + / -), keep as-is
    if (/^[Tt][+-]/.test(s) || /^[+-]/.test(s)) return s;
    // If starts with 'T' but no sign (e.g. 'T00:01:12'), add sign
    if (/^[Tt]\d/.test(s)) return (isPre ? "T-" : "T+") + s.slice(1);
    // Otherwise prefix with explicit T- or T+
    return (isPre ? "T-" : "T+") + s;
  }

  function sanitizeDescription(d?: string | null) {
    if (!d) return d ?? null;
    // remove the standalone word "SpaceX" (case-insensitive), collapse spaces, trim
    let s = String(d).replace(/\bSpaceX\b/gi, "");
    s = s.replace(/[\s\u00A0]+/g, " ").trim();
    // remove leading punctuation leftover like ':' or '-'
    s = s.replace(/^[\s:–—-]+/, "");
    return s || null;
  }

  if (launch.preLaunchTimeline?.timelineEntries) {
    allTimeline.push(
      ...launch.preLaunchTimeline.timelineEntries.map((e) => ({
        ...e,
        time: ensureSignedTime(e.time, true),
        description: sanitizeDescription(e.description),
      }))
    );
  }
  if (launch.postLaunchTimeline?.timelineEntries) {
    allTimeline.push(
      ...launch.postLaunchTimeline.timelineEntries.map((e) => ({
        ...e,
        time: ensureSignedTime(e.time, false),
        description: sanitizeDescription(e.description),
      }))
    );
  }
  function parseOffsetSeconds(timeStr?: string | null) {
    if (!timeStr) return NaN;
    const s = String(timeStr).trim();
    // Accept formats like T-00:01:12, -00:01:12, +00:01:12, 00:01:12
    const m = s.match(/^T?([+-])?(\d{1,2}:)?(\d{1,2}):(\d{2})$/);
    if (!m) return NaN;
    const sign = m[1] === "-" ? -1 : 1;
    // m[2] may be like '01:' so better to split by ':'
    const parts = s
      .replace(/^T/, "")
      .replace(/^\+/, "")
      .replace(/^\-/, "")
      .split(":");
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
  

  const nextEvent = (() => {
    if (!launchEpoch || allTimeline.length === 0)
      return null as null | { entry: TimelineEntry; epoch: number };
    const entriesWithEpoch = allTimeline
      .map((e) => {
        const offset = parseOffsetSeconds(e.time ?? null);
        if (Number.isNaN(offset)) return null;
        return { entry: e, epoch: launchEpoch + offset * 1000 };
      })
      .filter(Boolean) as { entry: TimelineEntry; epoch: number }[];
    if (entriesWithEpoch.length === 0) return null;
    const future = entriesWithEpoch.filter((x) => x.epoch >= now.getTime());
    if (future.length > 0) {
      // choose the soonest
      future.sort((a, b) => a.epoch - b.epoch);
      return future[0];
    }
    return null;
  })();
  return (
    <article className="hidden md:flex p-5 border rounded-md items-center justify-between h-full">
      <div className="flex items-center gap-6 flex-1">
        {desktopImg || mobileImg ? (
          <picture className="w-56 h-60 flex-shrink-0 overflow-hidden rounded-md">
            {desktopImg ? (
              <source media="(min-width:768px)" srcSet={desktopImg} />
            ) : null}
            <img
              src={desktopImg ?? mobileImg ?? ""}
              alt={launch.title}
              className="w-full h-full object-cover"
            />
          </picture>
        ) : (
          <div className="w-56 h-60 bg-gray-200 rounded-md flex items-center justify-center">
            <Rocket size={28} />
          </div>
        )}

        <div className="text-left flex flex-col">
          <h2 className="text-xl font-semibold">{launch.title}</h2>

          <div className="text-base text-gray-500 flex items-center gap-2 mt-1">
            <Clock size={16} />
            <div className="font-medium">
              {display}{" "}
              {userTzLabel ? (
                <span className="text-sm text-gray-400">({userTzLabel})</span>
              ) : null}
            </div>
          </div>

          {launch.launchSite ? (
            <div className="flex items-center gap-2 text-base text-gray-500 mt-1">
              <MapPin size={16} />
              <span className="text-base">{launch.launchSite}</span>
            </div>
          ) : null}
          {launch.vehicle && (
            <div className="text-base text-gray-600 mt-2">
              Vehicle: {launch.vehicle}
            </div>
          )}

          {/* Render next timeline description/time under the title; countdown is shown on the right */}
          {nextEvent ? (
            <div className="mt-2 flex items-start justify-between gap-4">
              <div className="flex-1" style={{ maxWidth: "48ch" }}>
                <div className="text-gray-500 flex items-center gap-2"><Flag size={16} /> Next event: </div>
                <div
                  className="text-sm font-medium"
                  title={nextEvent.entry.description ?? ""}
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2 as any,
                    WebkitBoxOrient: "vertical" as any,
                    overflow: "hidden",
                  }}
                >
                  {nextEvent.entry.description}
                </div>
                <div className="text-xs font-mono text-gray-500 mt-1">
                  At:{" "}
                  <span className="text-[#ff7a00]">
                    {nextEvent.entry.time ?? ""}
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-500 mt-1">
                  In:{" "}
                  <span className="text-[#ff7a00]">
                    {formatEventCountdown(nextEvent.epoch, now.getTime())}
                  </span>
                </div>
              </div>

            
            </div>
          ) : null}

          {launch.tZeroPaused ? (
            <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-[#ff7a00] text-[#242424] rounded-md text-base">
              <Pause size={16} aria-hidden="false" aria-label="T-Zero paused" />
              <span className="sr-only">T‑Zero Paused</span>
              {launch.tZeroValue ? (
                <span className="font-mono">{launch.tZeroValue}</span>
              ) : null}
            </div>
          ) : launchEpoch ? (
            <div className="mt-2 inline-flex items-center gap-2 py-1 rounded-md text-base text-[#ff7a00]">
              <Clock size={20} />
              <span
                className="text-base text-[#ff7a00]"
                style={{
                  fontFamily:
                    "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
                }}
              >
                {countdown}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="ml-6 flex-shrink-0 flex flex-col items-center">
        {launch.webcastUrl ? (
          <a
            href={launch.webcastUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Watch ${launch.title} webcast`}
            className="w-25 h-25 bg-[#ff7a00] hover:bg-[#ff8b2a] rounded-md shadow flex flex-col items-center justify-center"
            style={{ color: "#242424" }}
          >
            <Play size={30} color="#242424" />
            <span className="text-xl font-semibold leading-tight text-[#242424]">
              Watch
            </span>
          </a>
        ) : null}
      </div>
    </article>
  );
}

function formatEventCountdown(targetMs: number, nowMs: number) {
  const diff = targetMs - nowMs;
  const sign = diff >= 0 ? "-" : "+";
  const abs = Math.abs(Math.floor(diff / 1000));
  const days = Math.floor(abs / 86400);
  const hours = Math.floor((abs % 86400) / 3600);
  const mins = Math.floor((abs % 3600) / 60);
  const secs = abs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (days > 0)
    return `T${sign}${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  return `T${sign}${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}
