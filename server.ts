import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const configFile = path.join(DATA_DIR, 'config.json');
const requestLogFile = path.join(DATA_DIR, 'requests.json');

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(configFile, 'utf-8')); }
  catch { return { adminUser: 'admin', adminPass: 'animapi2025', bannedIPs: [], adminKey: 'animapi-admin-secret' }; }
}
function saveConfig(cfg: any) { fs.writeFileSync(configFile, JSON.stringify(cfg, null, 2)); }
function isIPBanned(ip: string): boolean { return (loadConfig().bannedIPs || []).includes(ip); }
function isAdmin(req: any): boolean { return req.cookies?.adminAuth === loadConfig().adminKey; }

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
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet({ contentSecurityPolicy: false }));

const limiter = rateLimit({ windowMs: 60000, max: 100, message: { status: 'error', message: 'Too many requests!' }, skip: (req) => req.path.startsWith('/admin') || req.path === '/' });
app.use(limiter);

app.use((req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  if (isIPBanned(ip)) return res.status(403).json({ status: 'error', message: 'IP kamu telah diblokir' });
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => logRequest({ method: req.method, path: req.originalUrl, status: res.statusCode, ip: req.ip || req.socket.remoteAddress || '', duration: Date.now() - start }));
  next();
});

app.use(morgan(':method :url :status :response-time ms'));

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
  const baseUrl = req.protocol + '://' + req.get('host');
  res.send('<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>AnimAPI</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#06060f;color:#d0d0d0;font-family:system-ui,sans-serif}.hero{background:linear-gradient(135deg,#0a0020,#000530,#0a0020);padding:60px 20px 40px;text-align:center;border-bottom:2px solid #1a1a4a}.hero h1{font-size:3em;background:linear-gradient(90deg,#e94560,#a855f7,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.container{max-width:900px;margin:30px auto;padding:0 20px}.section{background:#0a0a1a;border:1px solid #1a1a3a;border-radius:14px;padding:20px;margin-bottom:20px}.section h2{color:#a855f7;margin-bottom:14px}.endpoint{display:flex;gap:12px;padding:12px;background:#0d0d22;border:1px solid #15153a;border-radius:10px;margin-bottom:8px}.method{background:#22c55e;color:#000;padding:4px 10px;border-radius:6px;font-size:.7em;font-weight:700}.path{color:#60a5fa;font-family:monospace}.desc{color:#666;font-size:.78em;margin-top:3px}.base-url{background:#0d0d22;border:1px solid #e94560;border-radius:10px;padding:14px;text-align:center;font-family:monospace;color:#e94560;margin-bottom:20px}footer{text-align:center;padding:30px;color:#333;border-top:1px solid #1a1a2e}.admin-link{color:#a855f7;text-decoration:none;font-weight:600}</style></head><body><div class="hero"><h1>🎌 AnimAPI</h1><p>REST API Streaming Anime Indonesia — Multi-Provider, Gratis & Mandiri</p></div><div class="container"><div class="base-url">🔗 ' + baseUrl + '</div><div class="section"><h2>📋 Endpoint API</h2>' + ['/anime/home','/anime/ongoing-anime','/anime/complete-anime','/anime/search/:keyword','/anime/anime/:slug','/anime/episode/:slug','/anime/genre','/anime/genre/:slug','/anime/schedule','/anime/skip/:slug?episode=1'].map(p => '<div class="endpoint"><span class="method">GET</span><div class="info"><div class="path">' + p + '</div></div></div>').join('') + '</div></div><footer>AnimAPI v4.0 | <a href="/admin" class="admin-link">Admin Panel</a></footer></body></html>');
});
});

loadProviders().then(() => {
  
app.get('/admin/login', (req, res) => {
  res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Login Admin</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#06060f;display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:system-ui}.login-box{background:#0a0a1a;border:1px solid #2a2a4a;border-radius:16px;padding:40px;width:380px;text-align:center}.login-box h1{font-size:2em;background:linear-gradient(90deg,#e94560,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:20px}input{width:100%;padding:12px;margin-bottom:12px;border:1px solid #2a2a4a;border-radius:8px;background:#0a0a15;color:#e0e0e0}input:focus{outline:none;border-color:#a855f7}button{width:100%;padding:12px;background:#a855f7;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer}button:hover{background:#9333ea}.error{color:#ef4444;margin-bottom:10px}</style></head><body><div class="login-box"><h1>🛡️ Admin</h1>' + (req.query.error ? '<div class="error">' + req.query.error + '</div>' : '') + '<form action="/admin/login" method="POST"><input name="username" placeholder="Username" required><input name="password" type="password" placeholder="Password" required><button>Login</button></form></div></body></html>');
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const config = loadConfig();
  if (username === config.adminUser && password === config.adminPass) {
    res.cookie('adminAuth', config.adminKey, { maxAge: 86400000, httpOnly: true });
    return res.redirect('/admin');
  }
  res.redirect('/admin/login?error=Username+atau+password+salah');
});

app.get('/admin', (req, res) => {
  if (!isAdmin(req)) return res.redirect('/admin/login');
  const ip = req.ip || req.socket.remoteAddress || '';
  const config = loadConfig();
  let logs = [];
  try { logs = JSON.parse(fs.readFileSync(requestLogFile, 'utf-8')); } catch {}
  const totalRequests = logs.length;
  const uniqueIPs = [...new Set(logs.map(l => l.ip))].length;
  const lastRequests = logs.slice(-20).reverse();
  const bannedIPs = config.bannedIPs || [];
  const ipCount = {};
  logs.forEach(l => { ipCount[l.ip] = (ipCount[l.ip] || 0) + 1; });
  const topIPs = Object.entries(ipCount).sort((a, b) => b[1] - a[1]).slice(0, 15);

  res.send('<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Admin Dashboard</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#06060f;color:#d0d0d0;font-family:system-ui;padding:20px}.header{background:linear-gradient(135deg,#1a0033,#0d0d2b);padding:25px;border-radius:14px;margin-bottom:20px;border:1px solid #2a2a4a;display:flex;justify-content:space-between;align-items:center}.header h1{font-size:1.6em;background:linear-gradient(90deg,#e94560,#a855f7,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.logout{color:#ef4444;text-decoration:none;font-weight:600}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:20px}.card{background:#0d0d22;border:1px solid #2a2a4a;border-radius:12px;padding:20px;text-align:center}.card .number{font-size:2.2em;font-weight:700;color:#a855f7}.card .label{color:#666;font-size:.8em;margin-top:4px}.section{background:#0d0d22;border:1px solid #2a2a4a;border-radius:12px;padding:20px;margin-bottom:20px}.section h2{color:#a855f7;font-size:1em;margin-bottom:12px}table{width:100%;border-collapse:collapse;font-size:.82em}th,td{padding:10px;text-align:left;border-bottom:1px solid #1a1a3a}th{color:#777}.btn{padding:7px 14px;border:none;border-radius:7px;cursor:pointer;font-weight:600;font-size:.82em;text-decoration:none}.btn-danger{background:#ef4444;color:#fff}.btn-success{background:#22c55e;color:#fff}.btn:hover{opacity:.8}.ip-tag{display:inline-flex;align-items:center;gap:8px;background:#1a1a3a;padding:4px 12px;border-radius:15px;font-size:.78em;margin:3px}.ip-tag a{color:#22c55e;text-decoration:none;font-weight:700}form{display:flex;gap:8px;margin-top:10px}input{flex:1;padding:10px;border:1px solid #2a2a4a;border-radius:8px;background:#0a0a15;color:#e0e0e0}</style></head><body><div class="header"><div><h1>🛡️ AnimAPI Admin</h1><span style="color:#666;font-size:.8em;">IP: ' + ip + '</span></div><a href="/admin/logout" class="logout">🚪 Logout</a></div><div class="grid"><div class="card"><div class="number">' + totalRequests + '</div><div class="label">Total Requests</div></div><div class="card"><div class="number">' + uniqueIPs + '</div><div class="label">Unique IPs</div></div><div class="card"><div class="number">' + bannedIPs.length + '</div><div class="label">Banned</div></div><div class="card"><div class="number">' + providers.length + '</div><div class="label">Providers</div></div></div><div class="section"><h2>🌐 Top IPs</h2><table><tr><th>IP</th><th>Req</th><th>Aksi</th></tr>' + topIPs.map(([ip, count]) => '<tr><td>' + ip + '</td><td>' + count + '</td><td>' + (bannedIPs.includes(ip) ? '<a href="/admin/unban?ip=' + ip + '" class="btn btn-success">Unban</a>' : '<a href="/admin/ban?ip=' + ip + '" class="btn btn-danger">Ban</a>') + '</td></tr>').join('') + '</table></div><div class="section"><h2>📝 Request Terakhir</h2><table><tr><th>Method</th><th>Path</th><th>IP</th><th>Time</th></tr>' + lastRequests.map(r => '<tr><td>' + r.method + '</td><td>' + (r.path||'').substring(0,50) + '</td><td>' + r.ip + '</td><td>' + (r.time||'').substring(11,19) + '</td></tr>').join('') + '</table></div><div class="section"><h2>🚫 Banned IPs</h2>' + (bannedIPs.length === 0 ? '<span style="color:#666">Tidak ada</span>' : bannedIPs.map(ip => '<span class="ip-tag">🚫 ' + ip + ' <a href="/admin/unban?ip=' + ip + '">✕</a></span>').join('')) + '<form action="/admin/ban"><input name="ip" placeholder="IP address..."><button class="btn btn-danger">Ban</button></form></div><div style="text-align:center;color:#444;margin-top:20px;">AnimAPI v4.0</div></body></html>');
});

app.get('/admin/logout', (req, res) => { res.clearCookie('adminAuth'); res.redirect('/admin/login'); });
app.get('/admin/ban', (req, res) => { if (!isAdmin(req)) return res.redirect('/admin/login'); const ip = (req.query.ip||'').trim(); if (ip) { const cfg = loadConfig(); if (!cfg.bannedIPs.includes(ip)) { cfg.bannedIPs.push(ip); saveConfig(cfg); } } res.redirect('/admin'); });
app.get('/admin/unban', (req, res) => { if (!isAdmin(req)) return res.redirect('/admin/login'); const ip = (req.query.ip||'').trim(); if (ip) { const cfg = loadConfig(); cfg.bannedIPs = cfg.bannedIPs.filter(i => i !== ip); saveConfig(cfg); } res.redirect('/admin'); });


app.listen(PORT, BIND_ADDR, () => console.log(`🚀 Server on port ${PORT}`));
}).catch((err: Error) => {
  console.error('Fatal:', err);
  process.exit(1);
});
