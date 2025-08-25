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

export default function LaunchCardMobile({
  launch,
  desktopImg,
  mobileImg,
  display,
  userTzLabel,
  launchEpoch,
  countdown,
}: Props) {
  return (
  <article className="p-4 border rounded-md relative overflow-visible">
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

          {launchEpoch ? (
            <div className="mt-2 flex items-center gap-2 text-lg text-[#ff7a00]">
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

      <div className="mt-1">
        <div className="relative z-10 overflow-visible">
          <h2 className="text-lg font-semibold">{launch.title}</h2>

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
        </div>

        {/* absolutely positioned watch button at bottom-right; put it under text visually by using lower z-index */}
        {launch.webcastUrl ? (
          <div className="absolute right-4 bottom-4 z-0">
            <a
              href={launch.webcastUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Watch ${launch.title} webcast`}
              className="inline-flex items-center gap-2 px-3 py-2 bg-[#ff7a00] hover:bg-[#ff8b2a] text-white rounded-md shadow"
            >
              <Play size={18} color="#fff" />
              <span className="font-semibold text-white">Watch</span>
            </a>
          </div>
        ) : null}
      </div>
    </article>
  );
}
