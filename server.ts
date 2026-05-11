import express from 'express';
import cors from 'cors';
import { Otakudesu, Animasu, AnimeIndo, Samehadaku, Anoboy, Jikan } from './index.js';

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
const providers = {
  otakudesu: new Otakudesu(),
  animasu: new Animasu(),
  animeindo: new AnimeIndo(),
  samehadaku: new Samehadaku(),
  anoboy: new Anoboy(),
  jikan: new Jikan(),
};

const allProviders = Object.values(providers);
const streamProviders = [providers.animasu, providers.otakudesu, providers.animeindo, providers.samehadaku, providers.anoboy]; // Jikan tidak ada streaming

// Utility
const fetchWithTimeout = <T>(promise: Promise<T>, ms = 10000): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))]);

const formatAnimeList = (anime: any) => ({
  title: anime.title,
  poster: anime.posterUrl,
  animeId: anime.slug,
  href: `/anime/anime/${anime.slug}`,
  status: anime.status,
  type: anime.type || 'TV',
  score: anime.rating?.toString() || null,
  episodes: anime.episodes?.length || null,
  synopsis: anime.synopsis?.substring(0, 150) || null,
  genreList: (anime.genres || []).map((g: any) => g.name),
  source: anime.source,
});

const createResponse = (data: any, pagination: any = null) => ({
  status: "success",
  creator: "Animapi",
  statusCode: 200,
  message: "",
  ok: true,
  data,
  pagination,
});

// ==================== ENDPOINTS ====================

// Home
app.get('/anime/home', async (req, res) => {
  const key = 'home';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [otOn, otCom] = await Promise.allSettled([
      fetchWithTimeout(providers.otakudesu.search({ filter: { status: 'Ongoing' } })),
      fetchWithTimeout(providers.otakudesu.search({ filter: { status: 'Completed' } }))
    ]);
    const ongoingList = (otOn.status === 'fulfilled' ? otOn.value.animes || [] : []).slice(0, 12).map(formatAnimeList);
    const completedList = (otCom.status === 'fulfilled' ? otCom.value.animes || [] : []).slice(0, 10).map(formatAnimeList);
    const result = createResponse({ ongoing: { animeList: ongoingList }, completed: { animeList: completedList } });
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Ongoing / Completed / Search / Genre — dynamic helper
const listEndpoint = (status: string) => async (req: express.Request, res: express.Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const key = `${status}-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  const results = await Promise.allSettled(
    allProviders.map(p => fetchWithTimeout(p.search({ filter: { status }, page })))
  );
  const all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r.value?.animes || []))
    .map(formatAnimeList);
  const hasNext = results.some(r => r.status === 'fulfilled' && r.value.hasNext);
  const result = createResponse({ animeList: all }, { currentPage: page, hasNextPage: hasNext });
  setCache(key, result);
  res.json(result);
};

app.get('/anime/ongoing-anime', listEndpoint('Ongoing'));
app.get('/anime/complete-anime', listEndpoint('Completed'));

// Search
app.get('/anime/search/:keyword', async (req, res) => {
  const key = `search-${req.params.keyword}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const results = await Promise.allSettled(
    allProviders.map(p => fetchWithTimeout(p.search({ filter: { keyword: req.params.keyword } })))
  );
  const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value?.animes || []).map(formatAnimeList);
  setCache(key, createResponse({ animeList: all }));
  res.json(createResponse({ animeList: all }));
});

// Detail
app.get('/anime/anime/:slug', async (req, res) => {
  const slug = req.params.slug;
  const key = `detail-${slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  let data: any;
  for (const p of allProviders) {
    try { data = await fetchWithTimeout(p.detail(slug)); if (data?.title) break; } catch {}
  }
  if (!data?.title) return res.status(404).json({ status: "error", message: "Anime tidak ditemukan" });
  const detail = {
    title: data.title,
    poster: data.posterUrl,
    animeId: data.slug,
    synopsis: data.synopsis,
    score: data.rating?.toString() || null,
    status: data.status,
    type: data.type,
    studios: data.studios || [],
    genres: (data.genres || []).map((g: any) => g.name),
    episodeList: (data.episodes || []).map((e: any) => ({ title: e.name, episodeId: e.slug, href: `/anime/episode/${e.slug}` })),
  };
  const result = createResponse(detail);
  setCache(key, result);
  res.json(result);
});

// Episode
app.get('/anime/episode/:slug', async (req, res) => {
  const slug = req.params.slug;
  const results = await Promise.allSettled(
    streamProviders.map(p => fetchWithTimeout(p.streams(slug)))
  );
  const allStreams: any[] = [];
  results.forEach((r, idx) => {
    if (r.status === 'fulfilled') {
      const raw = r.value;
      const streams = Array.isArray(raw) ? raw : (raw?.streams || []);
      streams.forEach((s: any) => allStreams.push({ ...s, provider: s.source || streamProviders[idx].name }));
    }
  });
  if (!allStreams.length) return res.status(502).json({ status: "error", message: "Stream tidak tersedia" });
  const qualities = Array.from(
    allStreams.reduce((map, s) => {
      const qual = s.name || 'Unknown';
      if (!map.has(qual)) map.set(qual, []);
      map.get(qual)!.push({ title: s.provider, url: s.url });
      return map;
    }, new Map<string, any[]>())
  ).map(([title, serverList]) => ({ title, serverList }));
  res.json(createResponse({ animeId: slug, defaultStreamingUrl: allStreams[0]?.url || '', server: { qualities } }));
});

// Genre list (optimized, no duplicates)
app.get('/anime/genre', async (req, res) => {
  const key = 'genre';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const results = await Promise.allSettled([
    providers.otakudesu.genres(), providers.animasu.genres(), providers.anoboy.genres(), providers.jikan.genres()
  ]);
  const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value || []);
  const unique = all.filter((g: any, i: number, arr: any[]) => arr.findIndex(x => x.slug === g.slug) === i);
  const result = createResponse({ genreList: unique.map((g: any) => ({ title: g.name, genreId: g.slug })) });
  setCache(key, result);
  res.json(result);
});

// Anime by genre
app.get('/anime/genre/:slug', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const key = `genre-${req.params.slug}-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const results = await Promise.allSettled(
    allProviders.map(p => fetchWithTimeout(p.search({ filter: { genres: [req.params.slug] }, page })))
  );
  const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value?.animes || []).map(formatAnimeList);
  res.json(createResponse({ animeList: all }, { currentPage: page }));
});

// Schedule
app.get('/anime/schedule', async (req, res) => {
  const key = 'schedule';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    const schedule = await Promise.all(days.map(async (day) => {
      try {
        const slugs: string[] = await (providers.otakudesu as any).searchByDay(day);
        const animes = await Promise.all(slugs.map(slug => (providers.otakudesu as any).detail(slug).catch(() => null)));
        return {
          day: day.charAt(0).toUpperCase() + day.slice(1),
          anime_list: animes.filter(Boolean).map((a: any) => ({ title: a.title, slug: a.slug, poster: a.posterUrl })),
        };
      } catch { return { day, anime_list: [] }; }
    }));
    setCache(key, createResponse({ schedule }));
    res.json(createResponse({ schedule }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Batch, Server, Unlimited
app.get('/anime/batch/:slug', async (req, res) => {
  try {
    let data = await providers.otakudesu.detail(req.params.slug).catch(() => null);
    if (!data?.title) data = await providers.animasu.detail(req.params.slug).catch(() => null);
    res.json(createResponse({ title: data?.title, animeId: data?.slug || req.params.slug, batches: data?.batches || [] }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

app.get('/anime/server/:serverId', (req, res) => {
  res.json(createResponse({ embedUrl: req.params.serverId }));
});

app.get('/anime/unlimited', async (req, res) => {
  const key = 'unlimited';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const results = await Promise.allSettled(
    allProviders.map(p => fetchWithTimeout(p.search({ filter: { keyword: '' } })))
  );
  const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value?.animes || []).map(formatAnimeList);
  setCache(key, createResponse({ animeList: all }));
  res.json(createResponse({ animeList: all }));
});

app.get('/', (req, res) => {
  res.json({
    status: "success",
    creator: "Animapi",
    endpoints: ['/anime/home', '/anime/ongoing-anime', '/anime/complete-anime', '/anime/search/:keyword', '/anime/anime/:slug', '/anime/episode/:slug', '/anime/genre', '/anime/genre/:slug', '/anime/schedule', '/anime/batch/:slug', '/anime/server/:serverId', '/anime/unlimited']
  });
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
