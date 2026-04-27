import type { LaunchTile } from "../types/launch";
import { useEffect, useState } from "react";
import useNow from "../hooks/useNow";
// icons are used in the platform-specific components
import LaunchCardMobile from "./LaunchCardMobile";
import LaunchCardDesktop from "./LaunchCardDesktop";
import { guessTimeZone, epochFromWallTime, missionIdFromLink } from "../utils/launchUtils";

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
  const missionId = missionIdFromLink(launch.link, String(launch.id));

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
