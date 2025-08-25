export const config = {
  runtime: 'edge',
};

// Vercel Edge proxy for SpaceX content and the Azure future_missions.json asset.
// - Accepts requests under /api/spacex/*
// - Forwards to the canonical upstreams
// - Adds CORS response headers to allow the site origin to fetch the data

const SPACE_X_BASE = 'https://content.spacex.com';
const FUTURE_MISSIONS_HOST = 'https://sxcontent9668.azureedge.us';

function makeCorsHeaders(origin: string | null) {
  const allowOrigin = origin ?? '*';
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', allowOrigin);
  headers.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type,Accept');
  return headers;
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const originHeader = req.headers.get('origin');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: makeCorsHeaders(originHeader) });
  }

  // incoming path is like /api/spacex/tiles or /api/spacex/missions/<id>
  const path = url.pathname.replace(/^\/api\/spacex\/?/, '');
  const search = url.search || '';

  let target: string = '';

  if (path === 'tiles' || path === 'tiles/' || path === 'tiles') {
    target = `${SPACE_X_BASE}/api/spacex-website/launches-page-tiles/upcoming${search}`;
  } else if (path.startsWith('missions')) {
    // /api/spacex/missions/<rest>
    const rest = path.replace(/^missions\/?/, '');
    target = `${SPACE_X_BASE}/api/spacex-website/missions/${rest}${search}`;
  } else if (path === 'future_missions.json') {
    target = `${FUTURE_MISSIONS_HOST}/cms-assets/future_missions.json${search}`;
  } else {
    // fallback: attempt to forward to SpaceX base
    target = `${SPACE_X_BASE}/${path}${search}`;
  }

  try {
    if (!target) throw new Error('no target resolved');
    const upstreamRes = await fetch(target, {
      method: req.method,
      headers: {
        // copy only the most relevant headers
        accept: req.headers.get('accept') ?? '*/*',
        'user-agent': req.headers.get('user-agent') ?? 'vercel-proxy',
      },
    });

    // clone headers and append CORS
    const responseHeaders = new Headers(upstreamRes.headers);
    const cors = makeCorsHeaders(originHeader);
    cors.forEach((v, k) => responseHeaders.set(k, v));

    const body = upstreamRes.body;
    return new Response(body, { status: upstreamRes.status, headers: responseHeaders });
  } catch (err: any) {
    const headers = makeCorsHeaders(originHeader);
    return new Response(JSON.stringify({ error: String(err) }), { status: 502, headers });
  }
}
