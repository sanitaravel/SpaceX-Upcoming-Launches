// Shared helper utilities for launch date/time and mission id parsing
export function ensureSignedTime(t?: string | null, isPre = false) {
  if (!t) return t ?? null;
  let s = String(t).trim();
  s = s.replace(/^T([+-])\s+/, "T$1").replace(/^([+-])\s+/, "$1");
  s = s.replace(/\s+/g, " ").trim();
  if (/^[Tt][+-]/.test(s) || /^[+-]/.test(s)) return s.replace(/^([Tt]?)([+-])\s*/, "$1$2");
  if (/^[Tt]\d/.test(s)) return (isPre ? "T-" : "T+") + s.slice(1);
  return (isPre ? "T-" : "T+") + s;
}

export function sanitizeDescription(d?: string | null) {
  if (!d) return d ?? null;
  let s = String(d).replace(/\bSpaceX\b/gi, "");
  s = s.replace(/[\s\u00A0]+/g, " ").trim();
  s = s.replace(/^[\s:–—-]+/, "");
  return s || null;
}

export function parseOffsetSeconds(timeStr?: string | null) {
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

export function guessTimeZone(site?: string) {
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
export function epochFromWallTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
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

export function missionIdFromLink(link?: string, fallback?: string) {
  if (!link) return fallback ?? "";
  try {
    let raw = String(link);
    raw = decodeURIComponent(raw);
    if (raw.includes("/")) {
      const parts = raw.split("/").filter(Boolean);
      raw = parts[parts.length - 1];
    }
    return raw || String(fallback ?? "");
  } catch (e) {
    return String(fallback ?? "");
  }
}
