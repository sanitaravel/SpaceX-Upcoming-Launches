import type { LaunchTile } from "../types/launch";
import { Clock, Rocket, Play, MapPin } from "lucide-react";

type Props = {
  launch: LaunchTile;
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
  return (
    <article className="hidden md:flex p-5 border rounded-md items-center justify-between">
      <div className="flex items-center gap-6 flex-1">
        {desktopImg || mobileImg ? (
          <picture className="w-56 h-36 flex-shrink-0 overflow-hidden rounded-md">
            {desktopImg ? <source media="(min-width:768px)" srcSet={desktopImg} /> : null}
            <img src={desktopImg ?? mobileImg ?? ""} alt={launch.title} className="w-full h-full object-cover" />
          </picture>
        ) : (
          <div className="w-56 h-36 bg-gray-200 rounded-md flex items-center justify-center">
            <Rocket size={28} />
          </div>
        )}

        <div className="flex-1 text-left">
          <h2 className="text-xl font-semibold">{launch.title}</h2>

          <div className="text-base text-gray-500 flex items-center gap-2 mt-1">
            <Clock size={16} />
            <div className="font-medium">
              {display} {userTzLabel ? <span className="text-sm text-gray-400">({userTzLabel})</span> : null}
            </div>
          </div>

          {launch.launchSite ? (
            <div className="flex items-center gap-2 text-base text-gray-500 mt-1">
              <MapPin size={16} />
              <span className="text-base">{launch.launchSite}</span>
            </div>
          ) : null}
          {launch.vehicle && <div className="text-base text-gray-600 mt-2">Vehicle: {launch.vehicle}</div>}

          {launchEpoch ? (
            <div className="flex items-center gap-2 text-base text-[#ff7a00] mt-1">
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

      {launch.webcastUrl ? (
        <div className="ml-6 flex-shrink-0 flex flex-col items-center">
          <a
            href={launch.webcastUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Watch ${launch.title} webcast`}
            className="w-25 h-25 bg-[#ff7a00] hover:bg-[#ff8b2a] rounded-md shadow flex flex-col items-center justify-center"
            style={{ color: "#fff" }}
          >
            <Play size={30} color="#fff" />
            <span className="text-xl font-semibold leading-tight text-white">Watch</span>
          </a>
        </div>
      ) : null}
    </article>
  );
}
