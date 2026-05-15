import express from 'express';
import cors from 'cors';
import { Otakudesu, Animasu, AnimeIndo, Samehadaku, Anoboy, Oploverz, Jikan, AniSkip, Anichin, Nimegami, Mynimeku, KuroNime, Meownime, Doroni, Neonime, Lendrive, NontonAnimeID } from './index.js';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// Cache
const cache = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const getCache = (key: string) => {
  const c = cache.get(key);
  if (c && Date.now() - c.time < CACHE_TTL) return c.data;
  return null;
};
const setCache = (key: string, data: any) => cache.set(key, { data, time: Date.now() });

// Provider instances
const otakudesu = new Otakudesu(); otakudesu.name = 'otakudesu';
const animasu = new Animasu(); animasu.name = 'animasu';
const animeindo = new AnimeIndo(); animeindo.name = 'animeindo';
const samehadaku = new Samehadaku(); samehadaku.name = 'samehadaku';
const anoboy = new Anoboy(); anoboy.name = 'anoboy';
const oploverz = new Oploverz(); oploverz.name = 'oploverz';
const jikan = new Jikan(); jikan.name = 'jikan';
const aniskip = new AniSkip(); aniskip.name = 'aniskip';
const anichin = new Anichin(); anichin.name = 'anichin';
const nimegami = new Nimegami(); nimegami.name = 'nimegami';
const mynimeku = new Mynimeku(); mynimeku.name = 'mynimeku';
const kuronime = new KuroNime(); kuronime.name = 'kuronime';
const meownime = new Meownime(); meownime.name = 'meownime';
const doroni = new Doroni(); doroni.name = 'doroni';
const neonime = new Neonime(); neonime.name = 'neonime';
const lendrive = new Lendrive(); lendrive.name = 'lendrive';
const nontonanimeid = new NontonAnimeID(); nontonanimeid.name = 'nontonanimeid';

const providers: any[] = [otakudesu, animasu, animeindo, samehadaku, anoboy, oploverz, jikan, aniskip, anichin, nimegami, mynimeku, kuronime, meownime, doroni, neonime, lendrive, nontonanimeid];
const streamProviders: any[] = [otakudesu, animasu, animeindo, samehadaku, anoboy, oploverz, anichin, nimegami, mynimeku, kuronime, meownime, doroni, neonime, lendrive, nontonanimeid];

// Helper
const fetchWithTimeout = <T>(promise: Promise<T>, ms = 10000): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))]);

function cleanTitle(title: string): string {
  return title.replace(/subtitle indonesia/gi, '').replace(/sub indo/gi, '').replace(/season \d+/gi, '').replace(/part \d+/gi, '').replace(/episode \d+/gi, '').replace(/batch/gi, '').replace(/bd/gi, '').replace(/\b(serial|tv|movie|ova|ona|special|live action|series)\b/gi, '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
}

const createResponse = (data: any, pagination: any = null) => ({
  status: "success",
  creator: "AnimAPI",
  statusCode: 200,
  message: "",
  ok: true,
  data,
  pagination,
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
    title,
    poster: anime.posterUrl,
    animeId: slug,
    href: `/anime/anime/${slug}`,
    status: anime.status,
    type: anime.type || null,
    score: anime.rating?.toString() || null,
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
    let ongoingList: any[] = [], completedList: any[] = [];
    try {
      const [otOn, otCom] = await Promise.allSettled([
        fetchWithTimeout(otakudesu.search({ filter: { status: 'Ongoing' } })),
        fetchWithTimeout(otakudesu.search({ filter: { status: 'Completed' } }))
      ]);
      ongoingList = (otOn.status === 'fulfilled' ? otOn.value.animes || [] : []).slice(0, 12).map(formatAnimeList).filter(Boolean);
      completedList = (otCom.status === 'fulfilled' ? otCom.value.animes || [] : []).slice(0, 10).map(formatAnimeList).filter(Boolean);
    } catch {}
    const result = createResponse({ ongoing: { animeList: ongoingList }, completed: { animeList: completedList } });
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
    const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
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
    status: "success", creator: "AnimAPI", version: "4.0.0",
    endpoints: {
      home: '/anime/home', ongoing: '/anime/ongoing-anime', completed: '/anime/complete-anime',
      search: '/anime/search/:keyword', detail: '/anime/anime/:slug', episode: '/anime/episode/:slug',
      genre: '/anime/genre', genre_anime: '/anime/genre/:slug', schedule: '/anime/schedule',
      skip: '/anime/skip/:slug?episode=1', batch: '/anime/batch/:slug', server: '/anime/server/:serverId',
      unlimited: '/anime/unlimited'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
