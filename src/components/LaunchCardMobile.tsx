import { Clock, Rocket, Play, MapPin, Pause, Flag } from "lucide-react";
import type { TimelineEntry, LaunchTileWithTimelines } from "../types/launch";
import { useEffect, useState } from "react";
import useNow from "../hooks/useNow";

type Props = {
  launch: LaunchTileWithTimelines;
  desktopImg: string | null;
  mobileImg: string | null;
  display: string;
  userTzLabel: string;
  launchEpoch: number | null;
  countdown: string;
  missionId?: string;
};

export default function LaunchCardMobile({
  launch,
  desktopImg,
  mobileImg,
  display,
  userTzLabel,
  launchEpoch,
  countdown,
  missionId
}: Props) {
  const now = useNow();
  const allTimeline: TimelineEntry[] = [];
  function ensureSignedTime(t?: string | null, isPre = false) {
    if (!t) return t ?? null;
    let s = String(t).trim();
    // normalize cases like "- 00:53:00" or "T- 00:53:00" -> "-00:53:00" / "T-00:53:00"
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

  if (launch.preLaunchTimeline?.timelineEntries) {
    allTimeline.push(...launch.preLaunchTimeline.timelineEntries.map((e) => ({ ...e, time: ensureSignedTime(e.time, true), description: sanitizeDescription(e.description) })));
  } else {
    // If no pre-launch timeline, add synthetic T-0 Liftoff event
    allTimeline.push({
      id: -1,
      time: "T-00:00:00",
      description: "Liftoff",
    });
  }
  if (launch.postLaunchTimeline?.timelineEntries) {
    allTimeline.push(...launch.postLaunchTimeline.timelineEntries.map((e) => ({ ...e, time: ensureSignedTime(e.time, false), description: sanitizeDescription(e.description) })));
  }

  function parseOffsetSeconds(timeStr?: string | null) {
    if (!timeStr) return NaN;
    const s = String(timeStr).trim();
    // Accept formats like T-00:01:12, -00:01:12, +00:01:12, 00:01:12
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

  const nextEvent = (() => {
    if (!launchEpoch || allTimeline.length === 0) return null as null | { entry: TimelineEntry; epoch: number };
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
      future.sort((a, b) => a.epoch - b.epoch);
      return future[0];
    }
    return null;
  })();
  const [pausedSnapshot, setPausedSnapshot] = useState<null | { description?: string | null; time?: string | null }>(null);

  useEffect(() => {
    if (launch.tZeroPaused) {
      if (nextEvent && !pausedSnapshot) {
        setPausedSnapshot({ description: nextEvent.entry.description, time: nextEvent.entry.time });
      }
    } else {
      if (pausedSnapshot) setPausedSnapshot(null);
    }
  }, [launch.tZeroPaused, nextEvent, pausedSnapshot]);
  return (
  <article className="p-4 border rounded-md relative overflow-visible h-full flex flex-col">
      {/* image + mobile-only countdown */}
      {desktopImg || mobileImg ? (
        <div className="overflow-hidden rounded-md">
          <picture className="w-full h-40 block overflow-hidden">
            {desktopImg ? (
              <source media="(min-width:768px)" srcSet={desktopImg} />
            ) : null}
            <img
              src={mobileImg ?? desktopImg ?? ""}
              alt={launch.title}
              className="w-full h-40 object-cover rounded-md"
            />
          </picture>

          {launch.tZeroPaused ? (
            <div className="mt-2 inline-flex w-auto max-w-max items-center gap-2 px-2 py-1 bg-[#ff7a00] text-[#242424] rounded-md text-base">
              <Pause size={14} aria-hidden="false" aria-label="T-Zero paused" />
              <span className="sr-only">T‑Zero Paused</span>
              {launch.tZeroValue ? <span className="font-mono text-base">{launch.tZeroValue}</span> : null}
            </div>
          ) : launchEpoch ? (
            <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-md text-lg text-[#ff7a00]">
              <Clock size={18} />
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
      ) : (
        <div className="w-full h-40 bg-gray-200 rounded-md flex items-center justify-center">
          <Rocket size={28} />
        </div>
      )}

      <div className="mt-1 flex-1">
        <div className="relative z-10 overflow-visible h-full flex flex-col">
          <h2 className="text-lg font-semibold">
            {missionId ? (
              <a href={`/launch/${encodeURIComponent(missionId)}`} className="hover:underline text-inherit">{launch.title}</a>
            ) : (
              launch.title
            )}
          </h2>

          <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
            <Clock size={14} />
            <div className="font-medium">
              {display} {userTzLabel ? <span className="text-xs text-gray-400">({userTzLabel})</span> : null}
            </div>
          </div>

          {launch.launchSite ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
              <MapPin size={14} />
              <span className="text-sm">{launch.launchSite}</span>
            </div>
          ) : null}

          {launch.vehicle && <div className="text-sm text-gray-600 mt-2">Vehicle: {launch.vehicle}</div>}

          {/* Next timeline event (above main countdown) */}
          {nextEvent ? (
            <div className="mt-2">
              <div className="text-xs text-gray-500 flex items-center gap-2"><Flag size={16} /> Next event: </div>
              <div
                className="text-sm font-medium mb-1"
                title={(pausedSnapshot?.description ?? nextEvent.entry.description) ?? ""}
                style={{
                  maxWidth: "36ch",
                  display: "-webkit-box",
                  WebkitLineClamp: 3 as any,
                  WebkitBoxOrient: "vertical" as any,
                  overflow: "hidden",
                }}
              >
                {pausedSnapshot?.description ?? nextEvent.entry.description}
              </div>
              <div className="text-xs font-mono text-gray-500">At: <span className="text-[#ff7a00]">{pausedSnapshot?.time ?? (nextEvent.entry.time ?? "")}</span></div>
              <div className="text-xs font-mono text-gray-500">In: <span className="text-[#ff7a00]">{launch.tZeroPaused ? (launch.tZeroValue ?? (pausedSnapshot?.time ?? formatEventCountdown(nextEvent.epoch, now.getTime()))) : formatEventCountdown(nextEvent.epoch, now.getTime())}</span></div>
              
            </div>
          ) : null}
        </div>

  {/* absolutely positioned watch button at bottom-right; put it under text visually by using lower z-index */}
        <div className="absolute right-4 bottom-4 z-0 flex flex-col items-end">
          {launch.webcastUrl ? (
            <a
              href={launch.webcastUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Watch ${launch.title} webcast`}
              className="inline-flex items-center gap-2 px-3 py-2 bg-[#ff7a00] hover:bg-[#ff8b2a] rounded-md shadow"
              style={{ color: "#242424" }}
            >
              <Play size={18} color="#242424" />
              <span className="font-semibold text-[#242424]">Watch</span>
            </a>
          ) : null}
        </div>
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
  if (days > 0) return `T${sign}${days}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  return `T${sign}${pad(hours)}:${pad(mins)}:${pad(secs)}`;
}
