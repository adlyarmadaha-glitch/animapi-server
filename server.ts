import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';

// Konfigurasi admin
const DATA_DIR = path.join(process.cwd(), 'data');
const configFile = path.join(DATA_DIR, 'config.json');
const requestLogFile = path.join(DATA_DIR, 'requests.json');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(configFile, 'utf-8')); }
  catch { return { bannedIPs: [], adminKey: 'animapi-admin-2025' }; }
}
function saveConfig(config: any) {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}
function isIPBanned(ip: string): boolean {
  return loadConfig().bannedIPs.includes(ip);
}

// Simpan request log (maks 1000 entries)
function logRequest(data: any) {
  try {
    let logs = [];
    try { logs = JSON.parse(fs.readFileSync(requestLogFile, 'utf-8')); } catch {}
    logs.push({ ...data, time: new Date().toISOString() });
    if (logs.length > 1000) logs = logs.slice(-500);
    fs.writeFileSync(requestLogFile, JSON.stringify(logs, null, 2));
  } catch {}
}


const app = express();
const PORT = process.env.PORT || 3000;
const BIND_ADDR = '0.0.0.0';

app.use(cors());
app.use(express.json());

// 🔒 SECURITY MIDDLEWARE
app.use(helmet({ contentSecurityPolicy: false })); // Security headers

// ⏱️ RATE LIMITING (100 request/menit per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { status: 'error', message: 'Too many requests, slow down!' },
  skip: (req) => {
    const ip = req.ip || req.socket.remoteAddress || '';
    if (isIPBanned(ip)) {
      return false; // jangan skip kalau banned
    }
    return req.path.startsWith('/admin'); // skip rate limit untuk admin
  },
});
app.use(limiter);

// 🚫 IP BANNING CHECKER
app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  if (isIPBanned(ip)) {
    return res.status(403).json({ status: 'error', message: 'IP kamu telah diblokir' });
  }
  next();
});

// 📝 REQUEST LOGGER (simpel, tanpa database)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logRequest({
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ip: req.ip || req.socket.remoteAddress,
      duration: Date.now() - start,
      userAgent: req.get('user-agent')?.substring(0, 100) || '',
    });
  });
  next();
});

// 📊 Morgan logger ke console
app.use(morgan(':method :url :status :response-time ms - :remote-addr'));


// Cache
const cache = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const getCache = (key: string) => {
  const c = cache.get(key);
  if (c && Date.now() - c.time < CACHE_TTL) return c.data;
  return null;
};
const setCache = (key: string, data: any) => cache.set(key, { data, time: Date.now() });

// Provider variables
let Otakudesu: any, Animasu: any, AnimeIndo: any, Samehadaku: any, Anoboy: any, Jikan: any, AniSkip: any, Oploverz: any, Anichin: any, Nimegami: any, Mynimeku: any, KuroNime: any, Meownime: any, Doroni: any, Neonime: any, Lendrive: any, NontonAnimeID: any;
const providers: any[] = [];
const streamProviders: any[] = [];

async function loadProviders() {
  // 🔥 PRIORITAS STREAMING: Anoboy & Oploverz (paling stabil)
  try {
    ({ Anoboy } = await import('./provider/anoboy/index.js'));
    const ab = new Anoboy(); ab.name = 'anoboy';
    providers.push(ab); streamProviders.splice(0, 0, ab);
    console.log('✅ Anoboy (prioritas)');
  } catch(e) { console.warn('⚠️ Anoboy:', (e as Error).message); }

  try {
    ({ Oploverz } = await import('./provider/oploverz/index.js'));
    const op = new Oploverz(); op.name = 'oploverz';
    providers.push(op); streamProviders.splice(1, 0, op);
    console.log('✅ Oploverz (prioritas)');
  } catch(e) { console.warn('⚠️ Oploverz:', (e as Error).message); }


  try {
    ({ Otakudesu } = await import('./provider/otakudesu/index.js'));
    const ot = new Otakudesu(); ot.name = 'otakudesu';
    providers.push(ot); streamProviders.push(ot);
    console.log('✅ Otakudesu');
  } catch(e) { console.warn('⚠️ Otakudesu:', (e as Error).message); }





  try {
    ({ Animasu } = await import('./provider/animasu/index.js'));
    const an = new Animasu(); an.name = 'animasu';
    providers.push(an); streamProviders.splice(0, 0, an);
    console.log('✅ Animasu');
  } catch(e) { console.warn('⚠️ Animasu:', (e as Error).message); }

  try {
    ({ AnimeIndo } = await import('./provider/anime-indo/index.js'));
    const ai = new AnimeIndo(); ai.name = 'animeindo';
    providers.push(ai); streamProviders.push(ai);
    console.log('✅ AnimeIndo');
  } catch(e) { console.warn('⚠️ AnimeIndo:', (e as Error).message); }

  try {
    ({ Samehadaku } = await import('./provider/samehadaku/index.js'));
    const sm = new Samehadaku(); sm.name = 'samehadaku';
    providers.push(sm); streamProviders.push(sm);
    console.log('✅ Samehadaku');
  } catch(e) { console.warn('⚠️ Samehadaku:', (e as Error).message); }


  try {
    ({ Jikan } = await import('./provider/jikan/index.js'));
    const jk = new Jikan(); jk.name = 'jikan';
    providers.push(jk);
    console.log('✅ Jikan');
  } catch(e) { console.warn('⚠️ Jikan:', (e as Error).message); }

  try {
    ({ AniSkip } = await import('./provider/aniskip/index.js'));
    const as = new AniSkip(); as.name = 'aniskip';
    providers.push(as);
    console.log('✅ AniSkip');
  } catch(e) { console.warn('⚠️ AniSkip:', (e as Error).message); }


  try {
    ({ Anichin } = await import('./provider/anichin/index.js'));
    const anichin = new Anichin(); anichin.name = 'anichin';
    providers.push(anichin); streamProviders.push(anichin);
    console.log('✅ Anichin');
  } catch(e) { console.warn('⚠️ Anichin:', (e as Error).message); }

  try {
    ({ Nimegami } = await import('./provider/nimegami/index.js'));
    const nimegami = new Nimegami(); nimegami.name = 'nimegami';
    providers.push(nimegami); streamProviders.push(nimegami);
    console.log('✅ Nimegami');
  } catch(e) { console.warn('⚠️ Nimegami:', (e as Error).message); }

  try {
    ({ Mynimeku } = await import('./provider/mynimeku/index.js'));
    const mynimeku = new Mynimeku(); mynimeku.name = 'mynimeku';
    providers.push(mynimeku); streamProviders.push(mynimeku);
    console.log('✅ Mynimeku');
  } catch(e) { console.warn('⚠️ Mynimeku:', (e as Error).message); }

  try {
    ({ KuroNime } = await import('./provider/kuronime/index.js'));
    const kuronime = new KuroNime(); kuronime.name = 'kuronime';
    providers.push(kuronime); streamProviders.push(kuronime);
    console.log('✅ KuroNime');
  } catch(e) { console.warn('⚠️ KuroNime:', (e as Error).message); }

  try {
    ({ Meownime } = await import('./provider/meownime/index.js'));
    const meownime = new Meownime(); meownime.name = 'meownime';
    providers.push(meownime); streamProviders.push(meownime);
    console.log('✅ Meownime');
  } catch(e) { console.warn('⚠️ Meownime:', (e as Error).message); }

  try {
    ({ Doroni } = await import('./provider/doroni/index.js'));
    const doroni = new Doroni(); doroni.name = 'doroni';
    providers.push(doroni); streamProviders.push(doroni);
    console.log('✅ Doroni');
  } catch(e) { console.warn('⚠️ Doroni:', (e as Error).message); }

  try {
    ({ Neonime } = await import('./provider/neonime/index.js'));
    const neonime = new Neonime(); neonime.name = 'neonime';
    providers.push(neonime); streamProviders.push(neonime);
    console.log('✅ Neonime');
  } catch(e) { console.warn('⚠️ Neonime:', (e as Error).message); }

  try {
    ({ Lendrive } = await import('./provider/lendrive/index.js'));
    const lendrive = new Lendrive(); lendrive.name = 'lendrive';
    providers.push(lendrive); streamProviders.push(lendrive);
    console.log('✅ Lendrive');
  } catch(e) { console.warn('⚠️ Lendrive:', (e as Error).message); }

  try {
    ({ AnimeID } = await import('./provider/animeid/index.js'));
    const animeid = new AnimeID(); animeid.name = 'animeid';
    providers.push(animeid); // AnimeID stream dinonaktifkan (IP tidak stabil)
    console.log('✅ AnimeID (154.26.137.28)');
  } catch(e) { console.warn('⚠️ AnimeID:', (e as Error).message); }

  try {
    ({ NontonAnimeID } = await import('./provider/nontonanimeid/index.js'));
    const nontonanimeid = new NontonAnimeID(); nontonanimeid.name = 'nontonanimeid';
    providers.push(nontonanimeid); streamProviders.push(nontonanimeid);
    console.log('✅ NontonAnimeID');
  } catch(e) { console.warn('⚠️ NontonAnimeID:', (e as Error).message); }

  console.log(`🚀 ${providers.length} providers ready`);
}

// Helpers
const fetchWithTimeout = <T>(promise: Promise<T>, ms = 10000): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))]);

function cleanTitle(title: string): string {
  return title
    .replace(/subtitle indonesia/gi, '').replace(/sub indo/gi, '')
    .replace(/season \d+/gi, '').replace(/part \d+/gi, '')
    .replace(/episode \d+/gi, '').replace(/batch/gi, '').replace(/bd/gi, '')
    .replace(/\b(serial|tv|movie|ova|ona|special|live action|series)\b/gi, '')
    .replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
}

const createResponse = (data: any, pagination: any = null) => ({
  status: "success", creator: "Animapi", statusCode: 200, message: "", ok: true, data, pagination,
});

const seenSlugs = new Set<string>();
const resetSeenSlugs = () => seenSlugs.clear();

function cleanText(t: string): string {
  return t?.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim() || '';
}

const formatAnimeList = (anime: any) => {
  const title = cleanText(anime.title);
  const slug = cleanText(anime.slug || anime.animeId || '');
  if (!slug || !title) return null;
  if (seenSlugs.has(slug)) return null;
  seenSlugs.add(slug);
  return {
    title, poster: anime.posterUrl, animeId: slug,
    href: `/anime/anime/${slug}`, status: anime.status,
    type: anime.type || null, score: anime.rating?.toString() || null,
    episodes: anime.episodes?.length || null,
    synopsis: anime.synopsis?.substring(0, 150) || null,
    genreList: (anime.genres || []).map((g: any) => typeof g === 'string' ? g : g.name).filter(Boolean),
    source: anime.source,
  };
};

// ==================== ENDPOINTS ====================

app.get('/anime/home', async (req, res) => {
  resetSeenSlugs();
  const cached = getCache('home');
  if (cached) return res.json(cached);
  try {
    const ot = streamProviders.find((p: any) => p.name === 'otakudesu');
    let ongoing: any[] = [], completed: any[] = [];
    if (ot) {
      const [on, com] = await Promise.allSettled([
        fetchWithTimeout(ot.search({ filter: { status: 'Ongoing' } })),
        fetchWithTimeout(ot.search({ filter: { status: 'Completed' } }))
      ]);
      ongoing = (on.status === 'fulfilled' ? on.value.animes || [] : []).slice(0, 12).map(formatAnimeList).filter(Boolean);
      completed = (com.status === 'fulfilled' ? com.value.animes || [] : []).slice(0, 10).map(formatAnimeList).filter(Boolean);
    }
    const result = createResponse({ ongoing: { animeList: ongoing }, completed: { animeList: completed } });
    setCache('home', result);
    res.json(result);
  } catch(e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

const listEndpoint = (status: string) => async (req: express.Request, res: express.Response) => {
  resetSeenSlugs();
  const page = parseInt(req.query.page as string) || 1;
  const key = `${status}-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const results = await Promise.allSettled(
    providers.filter((p: any) => p.search).map((p: any) => fetchWithTimeout(p.search({ filter: { status }, page })).catch(() => undefined))
  );
  const all = results.filter((r: any) => r.status === 'fulfilled').flatMap((r: any) => r.value?.animes || []).map(formatAnimeList).filter(Boolean);
  const hasNext = results.some((r: any) => r.status === 'fulfilled' && r.value?.hasNext);
  const result = createResponse({ animeList: all }, { currentPage: page, hasNextPage: hasNext });
  setCache(key, result);
  res.json(result);
};

app.get('/anime/ongoing-anime', listEndpoint('Ongoing'));
app.get('/anime/complete-anime', listEndpoint('Completed'));

app.get('/anime/search/:keyword', async (req, res) => {
  resetSeenSlugs();
  const key = `search-${req.params.keyword}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const results = await Promise.allSettled(
    providers.filter((p: any) => p.search).map((p: any) => fetchWithTimeout(p.search({ filter: { keyword: req.params.keyword } })).catch(() => undefined))
  );
  const all = results.filter((r: any) => r.status === 'fulfilled').flatMap((r: any) => r.value?.animes || []).map(formatAnimeList).filter(Boolean);
  setCache(key, createResponse({ animeList: all }));
  res.json(createResponse({ animeList: all }));
});

app.get('/anime/anime/:slug', async (req, res) => {
  const slug = req.params.slug;
  const key = `detail-${slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  let data: any;
  for (const p of providers.filter((pp: any) => pp.detail)) {
    try { data = await fetchWithTimeout(p.detail(slug)); if (data?.title) break; } catch {}
  }
  if (!data?.title) return res.status(404).json({ status: "error", message: "Anime tidak ditemukan" });
  const result = createResponse({
    title: data.title, poster: data.posterUrl, animeId: data.slug,
    synopsis: data.synopsis, score: data.rating?.toString() || null,
    status: data.status, type: data.type, studios: data.studios || [],
    genres: (data.genres || []).map((g: any) => typeof g === 'string' ? g : g.name),
    episodeList: (data.episodes || []).map((e: any) => ({ title: e.name, episodeId: e.slug, href: `/anime/episode/${e.slug}` })),
  });
  setCache(key, result);
  res.json(result);
});

app.get('/anime/episode/:slug', async (req, res) => {
  const slug = req.params.slug;
  const results = await Promise.allSettled(
    streamProviders.map((p: any) => fetchWithTimeout(p.streams(slug)).catch(() => undefined))
  );
  const allStreams: any[] = [];
  results.forEach((r: any, idx: number) => {
    if (r.status === 'fulfilled') {
      const raw = r.value;
      const streams = Array.isArray(raw) ? raw : (raw?.streams || []);
      streams.forEach((s: any) => allStreams.push({ ...s, provider: s.source || streamProviders[idx].name }));
    }
  });
  if (!allStreams.length) return res.status(502).json({ status: "error", message: "Stream tidak tersedia" });
  const qualities = Array.from(
    allStreams.reduce((map: any, s: any) => {
      const qual = s.name || 'Unknown';
      if (!map.has(qual)) map.set(qual, []);
      map.get(qual)!.push({ title: s.provider, url: s.url });
      return map;
    }, new Map<string, any[]>())
  ).map(([title, serverList]: any) => ({ title, serverList }));
  res.json(createResponse({ animeId: slug, defaultStreamingUrl: allStreams[0]?.url || '', server: { qualities } }));
});

app.get('/anime/genre', async (req, res) => {
  const key = 'genre';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const genreProvs = providers.filter((p: any) => p.genres && p.name !== 'jikan');
  const results = await Promise.allSettled(genreProvs.map((p: any) => p.genres().catch(() => [])));
  const all = results.filter((r: any) => r.status === 'fulfilled').flatMap((r: any) => r.value || []);
  const unique = all.filter((g: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.slug === g.slug) === i);
  const result = createResponse({
    genreList: unique.map((g: any) => ({ title: g.name, genreId: g.slug, href: `/anime/genre/${g.slug}` }))
  });
  setCache(key, result);
  res.json(result);
});

app.get('/anime/genre/:slug', async (req, res) => {
  resetSeenSlugs();
  const page = parseInt(req.query.page as string) || 1;
  const key = `genre-${req.params.slug}-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const results = await Promise.allSettled(
    providers.filter((p: any) => p.search).map((p: any) => fetchWithTimeout(p.search({ filter: { genres: [req.params.slug] }, page })).catch(() => undefined))
  );
  const all = results.filter((r: any) => r.status === 'fulfilled').flatMap((r: any) => r.value?.animes || []).map(formatAnimeList).filter(Boolean);
  res.json(createResponse({ animeList: all }, { currentPage: page }));
});

app.get('/anime/schedule', async (req, res) => {
  const key = 'schedule';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const ot = streamProviders.find((p: any) => p.name === 'otakudesu');
    if (!ot) throw new Error('Otakudesu not available');
    const days = ['senin','selasa','rabu','kamis','jumat','sabtu','minggu'];
    const schedule = await Promise.all(days.map(async (day: string) => {
      try {
        const slugs: string[] = await ot.searchByDay(day);
        const animes = await Promise.all(slugs.map((s: string) => ot.detail(s).catch(() => null)));
        return {
          day: day.charAt(0).toUpperCase() + day.slice(1),
          anime_list: animes.filter(Boolean).map((a: any) => ({ title: a.title, slug: a.slug, poster: a.posterUrl })),
        };
      } catch { return { day, anime_list: [] }; }
    }));
    setCache(key, createResponse({ schedule }));
    res.json(createResponse({ schedule }));
  } catch(e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

app.get('/anime/skip/:slug', async (req, res) => {
  const slug = req.params.slug;
  const episode = parseInt(req.query.episode as string) || 1;
  let animeTitle = '', cleanName = '';
  for (const p of providers.filter((pp: any) => pp.detail && pp.name !== 'jikan' && pp.name !== 'aniskip')) {
    try {
      const detail = await fetchWithTimeout(p.detail(slug));
      if (detail?.title) { animeTitle = detail.title; cleanName = cleanTitle(detail.title).toLowerCase(); break; }
    } catch {}
  }
  if (!animeTitle) return res.status(404).json({ status: 'error', message: 'Anime tidak ditemukan' });
  const malIdDB: Record<string, number> = { "one piece": 21, "naruto": 20, "demon slayer": 38000, "jujutsu kaisen": 40748, "attack on titan": 16498 };
  let malId = malIdDB[cleanName] || null;
  if (!malId) return res.status(404).json({ status: 'error', message: 'MAL ID tidak ditemukan', searched: cleanName });
  const aniskip = providers.find((p: any) => p.name === 'aniskip');
  if (!aniskip) return res.status(502).json({ status: 'error', message: 'AniSkip tidak tersedia' });
  try {
    const timestamps = await aniskip.getTimestamps(malId, episode);
    res.json(createResponse({ mal_id: malId, episode, title: animeTitle, skip_times: timestamps || [] }));
  } catch(e: any) { res.status(502).json({ status: 'error', message: 'Gagal ambil timestamp' }); }
});

app.get('/anime/batch/:slug', async (req, res) => {
  try {
    const ot = streamProviders.find((p: any) => p.name === 'otakudesu');
    let data = ot ? await ot.detail(req.params.slug).catch(() => null) : null;
    res.json(createResponse({ title: data?.title, animeId: data?.slug || req.params.slug, batches: data?.batches || [] }));
  } catch(e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

app.get('/anime/server/:serverId', (req, res) => {
  res.json(createResponse({ embedUrl: req.params.serverId }));
});

app.get('/anime/unlimited', async (req, res) => {
  resetSeenSlugs();
  const results = await Promise.allSettled(
    providers.filter((p: any) => p.search).map((p: any) => fetchWithTimeout(p.search({ filter: { keyword: '' } })).catch(() => undefined))
  );
  const all = results.filter((r: any) => r.status === 'fulfilled').flatMap((r: any) => r.value?.animes || []).map(formatAnimeList).filter(Boolean);
  res.json(createResponse({ animeList: all }));
});

app.get('/', (req, res) => {
  res.json({
    status: "success", creator: "Animapi", version: "3.0.0",
    endpoints: {
      home: '/anime/home', ongoing: '/anime/ongoing-anime', completed: '/anime/complete-anime',
      search: '/anime/search/:keyword', detail: '/anime/anime/:slug', episode: '/anime/episode/:slug',
      genre: '/anime/genre', genre_anime: '/anime/genre/:slug', schedule: '/anime/schedule',
      skip: '/anime/skip/:slug?episode=1', batch: '/anime/batch/:slug', server: '/anime/server/:serverId',
      unlimited: '/anime/unlimited'
    }
  });
});

loadProviders().then(() => {
  
// ==================== ADMIN DASHBOARD ====================
app.get('/admin', (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  const config = loadConfig();
  
  // Baca log request
  let requestLogs = [];
  try { requestLogs = JSON.parse(fs.readFileSync(requestLogFile, 'utf-8')); } catch {}
  
  // Hitung statistik
  const totalRequests = requestLogs.length;
  const uniqueIPs = [...new Set(requestLogs.map((l: any) => l.ip))].length;
  const lastRequests = requestLogs.slice(-20).reverse();
  const bannedIPs = config.bannedIPs || [];

  res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AnimAPI - Admin Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0f; color: #e0e0e0; font-family: 'Segoe UI', sans-serif; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a0033, #0d0d2b); padding: 30px; border-radius: 16px; margin-bottom: 20px; border: 1px solid #2a2a4a; }
    .header h1 { font-size: 2em; background: linear-gradient(90deg, #e94560, #a855f7, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .header p { color: #888; margin-top: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .card { background: #0d0d2b; border: 1px solid #2a2a4a; border-radius: 12px; padding: 20px; text-align: center; }
    .card .number { font-size: 2.5em; font-weight: 700; color: #a855f7; }
    .card .label { color: #666; font-size: 0.85em; margin-top: 4px; }
    .section { background: #0d0d2b; border: 1px solid #2a2a4a; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .section h2 { color: #a855f7; margin-bottom: 12px; font-size: 1.1em; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85em; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #1a1a3a; }
    th { color: #888; font-weight: 600; }
    td { color: #ccc; }
    .badge { padding: 3px 10px; border-radius: 12px; font-size: 0.75em; font-weight: 600; }
    .badge-success { background: #0f2d1a; color: #22c55e; }
    .badge-error { background: #2d0f0f; color: #ef4444; }
    .badge-warn { background: #2d2a0f; color: #eab308; }
    .btn { padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.85em; transition: all 0.2s; }
    .btn-danger { background: #ef4444; color: white; }
    .btn-success { background: #22c55e; color: white; }
    .btn-warn { background: #eab308; color: black; }
    .btn:hover { opacity: 0.8; transform: translateY(-1px); }
    .ip-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .ip-tag { background: #1a1a3a; padding: 6px 14px; border-radius: 20px; font-size: 0.8em; display: flex; align-items: center; gap: 8px; }
    .ip-tag .unban { color: #22c55e; cursor: pointer; font-weight: 700; }
    .ip-tag .unban:hover { color: #4ade80; }
    form { display: flex; gap: 10px; margin-top: 12px; }
    input { flex: 1; padding: 10px 14px; border: 1px solid #2a2a4a; border-radius: 8px; background: #0a0a15; color: #e0e0e0; font-size: 0.9em; }
    input:focus { outline: none; border-color: #a855f7; }
    .refresh { color: #888; font-size: 0.8em; margin-top: 16px; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ AnimAPI Admin Dashboard</h1>
    <p>Monitoring • Security • IP Management | IP kamu: ${ip}</p>
  </div>

  <div class="grid">
    <div class="card">
      <div class="number">${totalRequests}</div>
      <div class="label">Total Requests</div>
    </div>
    <div class="card">
      <div class="number">${uniqueIPs}</div>
      <div class="label">Unique IPs</div>
    </div>
    <div class="card">
      <div class="number">${bannedIPs.length}</div>
      <div class="label">Banned IPs</div>
    </div>
    <div class="card">
      <div class="number">${providers.length}</div>
      <div class="label">Providers</div>
    </div>
  </div>

  <div class="section">
    <h2>🚫 IP Management</h2>
    <form action="/admin/ban" method="POST">
      <input type="text" name="ip" placeholder="IP Address (e.g., 192.168.1.1)" required>
      <button type="submit" class="btn btn-danger">🔒 Ban IP</button>
    </form>
    <div class="ip-list" style="margin-top: 12px;">
      ${bannedIPs.length === 0 ? '<span style="color:#666">Tidak ada IP yang dibanned</span>' : ''}
      ${bannedIPs.map((ip: string) => `
        <div class="ip-tag">
          🚫 ${ip}
          <a href="/admin/unban?ip=${ip}" class="unban">✕</a>
        </div>
      `).join('')}
    </div>
  </div>

  <div class="section">
    <h2>📊 Request Terakhir (20)</h2>
    <table>
      <thead>
        <tr><th>Method</th><th>Path</th><th>Status</th><th>IP</th><th>Duration</th><th>Time</th></tr>
      </thead>
      <tbody>
        ${lastRequests.map((r: any) => `
          <tr>
            <td><span class="badge ${r.method === 'GET' ? 'badge-success' : r.method === 'POST' ? 'badge-warn' : 'badge-error'}">${r.method}</span></td>
            <td>${r.path?.substring(0, 50)}</td>
            <td>${r.status}</td>
            <td>${r.ip}</td>
            <td>${r.duration}ms</td>
            <td>${r.time?.substring(11, 19) || ''}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="refresh">Auto-refresh setiap 30 detik | AnimAPI v4.0</div>

  <script>
    setTimeout(() => location.reload(), 30000);
  </script>
</body>
</html>
`);
});

// Ban IP endpoint
app.post('/admin/ban', (req, res) => {
  const ip = (req.body?.ip || req.query?.ip || '').trim();
  if (!ip) return res.redirect('/admin?error=IP+required');
  
  const config = loadConfig();
  if (!config.bannedIPs.includes(ip)) {
    config.bannedIPs.push(ip);
    saveConfig(config);
  }
  res.redirect('/admin?msg=IP+' + encodeURIComponent(ip) + '+banned');
});

// Unban IP endpoint
app.get('/admin/unban', (req, res) => {
  const ip = (req.query?.ip || '').trim();
  if (!ip) return res.redirect('/admin?error=IP+required');
  
  const config = loadConfig();
  config.bannedIPs = config.bannedIPs.filter((i: string) => i !== ip);
  saveConfig(config);
  res.redirect('/admin?msg=IP+' + encodeURIComponent(ip) + '+unbanned');
});

// API endpoint untuk cek status (JSON)
app.get('/admin/status', (req, res) => {
  let logs = [];
  try { logs = JSON.parse(fs.readFileSync(requestLogFile, 'utf-8')); } catch {}
  
  res.json({
    uptime: process.uptime(),
    providers: providers.length,
    totalRequests: logs.length,
    bannedIPs: loadConfig().bannedIPs,
    memory: process.memoryUsage(),
    lastRequests: logs.slice(-10).reverse(),
  });
});


app.listen(PORT, BIND_ADDR, () => console.log(`🚀 Server on port ${PORT}`));
}).catch((err: Error) => {
  console.error('Fatal:', err);
  process.exit(1);
});
