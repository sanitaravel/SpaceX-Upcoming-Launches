import type { LaunchTile } from "../types/launch";
import { useEffect, useState } from "react";
import useNow from "../hooks/useNow";
import { Clock, Rocket, Play, MapPin } from "lucide-react";

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

  return (
    <article className="p-5 border rounded-md flex items-center justify-between">
      <div className="flex items-center gap-6 flex-1">
        {desktopImg || mobileImg ? (
          // Use a picture element to prefer desktop image on larger screens and mobile image otherwise
          // eslint-disable-next-line @next/next/no-img-element
          <picture className="w-40 h-28 md:w-56 md:h-36 flex-shrink-0 overflow-hidden rounded-md">
            {desktopImg ? (
              <source media="(min-width:768px)" srcSet={desktopImg} />
            ) : null}
            {/* fallback to mobileImg then desktopImg */}
            <img
              src={mobileImg ?? desktopImg ?? ""}
              alt={launch.title}
              className="w-full h-full object-cover"
            />
          </picture>
        ) : (
          <div className="w-40 h-28 md:w-56 md:h-36 bg-gray-200 rounded-md flex items-center justify-center">
            <Rocket size={28} />
          </div>
        )}

        <div className="flex-1 text-left">
          <h2 className="text-lg md:text-xl font-semibold">{launch.title}</h2>
          <div className="text-sm md:text-base text-gray-500 flex items-center gap-2 mt-1">
            <Clock size={16} />
            <div>
              <div className="text-sm md:text-base font-medium">
                {display}{" "}
                {userTzLabel ? (
                  <span className="text-xs md:text-sm text-gray-400">
                    ({userTzLabel})
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {launch.launchSite ? (
            <div className="flex items-center gap-2 text-sm md:text-base text-gray-500 mt-1">
              <MapPin size={16} />
              <span className="text-sm md:text-base">{launch.launchSite}</span>
            </div>
          ) : null}
          {launch.vehicle && (
            <div className="text-sm md:text-base text-gray-600 mt-2">
              Vehicle: {launch.vehicle}
            </div>
          )}

          {/* If there's a launch epoch and NO webcastUrl, show countdown in the right column */}
          {launchEpoch ? (
            <div className="flex items-center gap-2 text-xl md:text-base text-[#ff7a00] mt-1">
            <Clock size={20} />
              <span
                className="text-xl md:text-base text-[#ff7a00]"
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

      {launch.webcastUrl ? (
        <div className="ml-6 flex-shrink-0 flex flex-col items-center">
          <a
            href={launch.webcastUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Watch ${launch.title} webcast`}
            className="w-14 h-14 md:w-25 md:h-25 bg-[#ff7a00] hover:bg-[#ff8b2a] rounded-md shadow flex flex-col items-center justify-center"
            style={{ color: "#fff" }}
          >
            <Play size={30} color="#fff" />
            <span className="text-md md:text-xl font-semibold leading-tight text-white">
              Watch
            </span>
          </a>
        </div>
      ) : null}
    </article>
  );
}
