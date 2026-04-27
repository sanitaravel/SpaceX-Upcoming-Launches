import type { LaunchTile } from "../types/launch";
import { useEffect, useState } from "react";
import useNow from "../hooks/useNow";
// icons are used in the platform-specific components
import LaunchCardMobile from "./LaunchCardMobile";
import LaunchCardDesktop from "./LaunchCardDesktop";

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
  // Start with a UTC-based guess for the same numeric components
  let guess = Date.UTC(year, month - 1, day, hour, minute, second);
  // Iterate to adjust for tz offset at the target instant
  for (let i = 0; i < 3; i++) {
    const d = new Date(guess);
    // find the offset (minutes) between UTC and target tz at this instant
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
    const offset = asUTC - d.getTime(); // ms difference
    // The wall time originally represents a UTC timestamp = guess - offset
    guess = Date.UTC(year, month - 1, day, hour, minute, second) - offset;
  }
  return guess;
}

export default function LaunchCard({ launch }: { launch: LaunchTile }) {
  // pick the best available format: large > medium > small > thumbnail
  const pickBest = (formats: any | undefined) =>
    formats?.large?.url ??
    formats?.medium?.url ??
    formats?.small?.url ??
    formats?.thumbnail?.url ??
    null;

  const desktopImg = pickBest(launch.imageDesktop?.formats);
  const mobileImg = pickBest(launch.imageMobile?.formats);

  // Build user-local Date from launch local-site date/time and capture epoch for countdown
  let display = "";
  let userTzLabel = "";
  let launchEpoch: number | null = null;
  try {
    if (launch.launchTime) {
      const [hh, mm, ss] = launch.launchTime.split(":").map((n) => Number(n));
      const [y, m, d] = launch.launchDate.split("-").map((n) => Number(n));
      const tz = guessTimeZone(launch.launchSite);
      const epoch = epochFromWallTime(y, m, d, hh ?? 0, mm ?? 0, ss ?? 0, tz);
      launchEpoch = epoch;
      const userDate = new Date(epoch);
      display = new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(userDate);
      try {
        userTzLabel = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      } catch (e) {
        userTzLabel = "";
      }
    } else {
      const dateOnly = new Date(launch.launchDate);
      launchEpoch = dateOnly.getTime();
      display = dateOnly.toLocaleDateString();
    }
  } catch (err) {
    display = `${launch.launchDate} ${launch.launchTime ?? ""}`;
  }

  // use shared now so Topbar and cards tick in lockstep
  const now = useNow();

  // format countdown string like "T-3d 04:12:05" or "T-04:12:05"; if in the past, show T+...
  const formatCountdown = (targetMs: number | null, nowMs: number) => {
    if (!targetMs) return "";
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
  };

  const [countdown, setCountdown] = useState(() => formatCountdown(launchEpoch, Date.now()));

  useEffect(() => {
    // update whenever shared time or launch epoch change; also respect webcastUrl hiding logic
    if (!launchEpoch) {
      setCountdown("");
      return;
    }
    setCountdown(formatCountdown(launchEpoch, now.getTime()));
  }, [now, launchEpoch, launch.webcastUrl]);

  // Prepare props shared between mobile/desktop variants
  const common = {
    launch,
    desktopImg,
    mobileImg,
    display,
    userTzLabel,
    launchEpoch,
    countdown,
  };

  // derive mission id from the link field (use last path segment)
  function missionIdFromLink(link?: string) {
    if (!link) return String(launch.id);
    try {
      let raw = String(link);
      raw = decodeURIComponent(raw);
      if (raw.includes('/')) {
        const parts = raw.split('/').filter(Boolean);
        raw = parts[parts.length - 1];
      }
      return raw || String(launch.id);
    } catch (e) {
      return String(launch.id);
    }
  }

  const missionId = missionIdFromLink(launch.link);

  return (
    <div className="block w-full">
      <div className="md:hidden">
        <LaunchCardMobile {...common} missionId={missionId} />
      </div>

      <div className="hidden md:block">
        <LaunchCardDesktop {...common} missionId={missionId} />
      </div>
    </div>
  );
}
