import { RequestHandler } from "express";

const unsplashColors: Record<string, { r: number; g: number; b: number }> = {
  black: { r: 30, g: 30, b: 30 },
  white: { r: 245, g: 245, b: 245 },
  yellow: { r: 252, g: 224, b: 23 },
  orange: { r: 249, g: 153, b: 39 },
  red: { r: 220, g: 53, b: 69 },
  purple: { r: 161, g: 73, b: 206 },
  magenta: { r: 214, g: 62, b: 152 },
  green: { r: 96, g: 189, b: 90 },
  teal: { r: 76, g: 188, b: 168 },
  blue: { r: 78, g: 154, b: 226 },
};

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
}

function colorDistance(rgb1: number[], rgb2: { r: number; g: number; b: number }) {
  return Math.sqrt(Math.pow(rgb1[0] - rgb2.r, 2) + Math.pow(rgb1[1] - rgb2.g, 2) + Math.pow(rgb1[2] - rgb2.b, 2));
}

function getClosestUnsplashColor(hex: string) {
  const rgb = hexToRgb(hex);
  let minDistance = Infinity;
  let closest = "any";
  for (const key in unsplashColors) {
    const d = colorDistance(rgb, unsplashColors[key]);
    if (d < minDistance) {
      minDistance = d;
      closest = key;
    }
  }
  return closest;
}

// Simple in-memory cache
const CACHE_TTL = 1000 * 60 * 10; // 10 minutes
const cache = new Map<string, { ts: number; data: any }>();

function hexToRgbArr(hex: string) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function distanceRgb(a: number[], bHex: string) {
  const b = hexToRgbArr(bHex || "#000000");
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export const handleUnsplash: RequestHandler = async (req, res) => {
  try {
    const hex = (req.query.hex as string) || "#000000";
    const page = parseInt((req.query.page as string) || "1", 10);
    const per_page = parseInt((req.query.per_page as string) || "30", 10);

    const key = process.env.UNSPLASH_ACCESS_KEY;
    if (!key) {
      return res.status(500).json({ error: "Unsplash API key not configured" });
    }

    const cacheKey = `${hex.toUpperCase()}-${page}-${per_page}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL) {
      return res.json(cached.data);
    }

    const basicColor = getClosestUnsplashColor(hex);
    const query = "abstract texture gradient background solid color";
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&color=${encodeURIComponent(basicColor)}&per_page=${per_page}&page=${page}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${key}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: text || "Unsplash error" });
    }

    const data = await response.json();

    // Score results by distance to requested hex using result.color when available
    const targetRgb = hexToRgbArr(hex);
    // Optionally perform server-side image analysis for better accuracy
    const ANALYZE = req.query.analyze === '1' || req.query.analyze === 'true';

    async function analyzeImageColor(url: string) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 4000);
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        if (!resp.ok) return null;
        const buf = Buffer.from(await resp.arrayBuffer());
        // dynamic import jpeg-js to avoid loading in runtime if unused
        const jpeg = await import('jpeg-js');
        const decoded = jpeg.decode(buf, { useTArray: true });
        if (!decoded || !decoded.data) return null;
        const dataArr = decoded.data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < dataArr.length; i += 4) {
          r += dataArr[i];
          g += dataArr[i + 1];
          b += dataArr[i + 2];
          count++;
        }
        if (count === 0) return null;
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        const hex = '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
        return hex.toUpperCase();
      } catch (err) {
        return null;
      }
    }

    const resultsWithDistance: any[] = [];

    for (const r of (data.results || [])) {
      let colorHex = r.color || r.dominant_color || null;
      if (ANALYZE) {
        // try analyze small image for more accurate color
        const urls = r.urls || {};
        const imgUrl = urls.small || urls.thumb || urls.raw || urls.regular;
        if (imgUrl) {
          const analyzed = await analyzeImageColor(imgUrl + (imgUrl.includes('?') ? '&' : '?') + 'fm=jpg&q=40&w=200');
          if (analyzed) colorHex = analyzed;
        }
      }
      const dist = distanceRgb(targetRgb, colorHex || '#000000');
      resultsWithDistance.push({ ...r, _distance: dist });
    }

    resultsWithDistance.sort((a, b) => a._distance - b._distance);
    const out = { ...data, results: resultsWithDistance };

    cache.set(cacheKey, { ts: now, data: out });

    return res.json(out);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Unknown error" });
  }
};
