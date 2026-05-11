import express from 'express';
import cors from 'cors';
import { Otakudesu, Animasu, AnimeIndo, Samehadaku, Anoboy } from './index.js';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const cache = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const getCache = (key: string) => {
  const c = cache.get(key);
  if (c && Date.now() - c.time < CACHE_TTL) return c.data;
  return null;
};
const setCache = (key: string, data: any) => cache.set(key, { data, time: Date.now() });

const otakudesu = new Otakudesu();
const animasu = new Animasu();
const animeindo = new AnimeIndo();
const samehadaku = new Samehadaku();
const anoboy = new Anoboy();

const fetchWithTimeout = <T>(promise: Promise<T>, ms = 12000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
  ]);

const formatAnimeList = (anime: any) => ({
  title: anime.title,
  poster: anime.posterUrl,
  animeId: anime.slug,
  href: `/anime/anime/${anime.slug}`,
  status: anime.status,
  type: anime.type || null,
  score: anime.rating?.toString() || null,
  episodes: anime.episodes?.length || null,
  releaseDay: null,
  latestReleaseDate: null,
  otakudesuUrl: anime.source === 'otakudesu' ? `https://otakudesu.blog/anime/${anime.slug}/` : null,
  studios: anime.studios || [],
  season: anime.season || null,
  synopsis: anime.synopsis?.substring(0, 150) || null,
  genreList: (anime.genres || []).map((g: any) => g.name),
});

const formatDetail = (anime: any) => ({
  title: anime.title,
  poster: anime.posterUrl,
  animeId: anime.slug,
  japanese: anime.titleAlt || null,
  score: anime.rating?.toString() || null,
  producers: anime.producers?.join(', ') || null,
  type: anime.type,
  status: anime.status,
  episodes: anime.episodes?.length || null,
  duration: anime.duration,
  aired: anime.aired,
  studios: anime.studios?.join(', '),
  batch: anime.batches?.length ? anime.batches[0] : null,
  synopsis: anime.synopsis,
  genreList: anime.genres?.map((g: any) => ({
    title: g.name,
    genreId: g.slug,
    href: `/anime/genre/${g.slug}`,
    otakudesuUrl: `https://otakudesu.blog/genres/${g.slug}/`,
  })) || [],
  episodeList: anime.episodes?.map((e: any) => ({
    title: e.name,
    eps: e.slug?.match(/\d+/)?.[0] || null,
    date: null,
    episodeId: e.slug,
    href: `/anime/episode/${e.slug}`,
    otakudesuUrl: `https://otakudesu.blog/episode/${e.slug}/`,
  })) || [],
  recommendedAnimeList: [],
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

// ========== HOME ==========
app.get('/anime/home', async (req, res) => {
  const key = 'home';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    let ongoingList: any[] = [];
    let completedList: any[] = [];
    try {
      const [otOn, otCom] = await Promise.all([
        fetchWithTimeout(otakudesu.search({ filter: { status: 'Ongoing' } })),
        fetchWithTimeout(otakudesu.search({ filter: { status: 'Completed' } }))
      ]);
      ongoingList = (otOn.animes || []).slice(0, 15).map(formatAnimeList);
      completedList = (otCom.animes || []).slice(0, 10).map(formatAnimeList);
    } catch {
      // fallback ke provider lain
      const [otOn, anOn, aiOn, smOn, abOn] = await Promise.allSettled([
        fetchWithTimeout(otakudesu.search({ filter: { status: 'Ongoing' } })),
        fetchWithTimeout(animasu.search({ filter: { status: 'Ongoing' } })),
        fetchWithTimeout(animeindo.search({ filter: { status: 'Ongoing' } })),
        fetchWithTimeout(samehadaku.search({ filter: { status: 'Ongoing' } })),
        fetchWithTimeout(anoboy.search({ filter: { status: 'Ongoing' } }))
      ]);
      ongoingList = [
        ...(otOn.status === 'fulfilled' ? (otOn.value.animes || []) : []),
        ...(anOn.status === 'fulfilled' ? (anOn.value.animes || []) : []),
        ...(aiOn.status === 'fulfilled' ? (aiOn.value.animes || []) : []),
        ...(smOn.status === 'fulfilled' ? (smOn.value.animes || []) : []),
        ...(abOn.status === 'fulfilled' ? (abOn.value.animes || []) : []),
      ].slice(0, 15).map(formatAnimeList);
    }
    const result = createResponse({
      ongoing: { href: "/anime/ongoing-anime", animeList: ongoingList },
      completed: { href: "/anime/complete-anime", animeList: completedList },
    });
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// ========== ONGOING ==========
app.get('/anime/ongoing-anime', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const key = `ongoing-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const providers = [otakudesu, animasu, animeindo, samehadaku, anoboy];
  const results = await Promise.allSettled(
    providers.map(p => fetchWithTimeout(p.search({ filter: { status: 'Ongoing' }, page })))
  );
  const all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r.value?.animes || []))
    .map(formatAnimeList);
  const hasNext = results.some(r => r.status === 'fulfilled' && r.value.hasNext);
  const result = createResponse({ animeList: all }, { currentPage: page, hasNextPage: hasNext });
  setCache(key, result);
  res.json(result);
});

// ========== COMPLETED ==========
app.get('/anime/complete-anime', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const key = `complete-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const providers = [otakudesu, animasu, animeindo, samehadaku, anoboy];
  const results = await Promise.allSettled(
    providers.map(p => fetchWithTimeout(p.search({ filter: { status: 'Completed' }, page })))
  );
  const all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r.value?.animes || []))
    .map(formatAnimeList);
  const hasNext = results.some(r => r.status === 'fulfilled' && r.value.hasNext);
  const result = createResponse({ animeList: all }, { currentPage: page, hasNextPage: hasNext });
  setCache(key, result);
  res.json(result);
});

// ========== SEARCH ==========
app.get('/anime/search/:keyword', async (req, res) => {
  const key = `search-${req.params.keyword}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const providers = [otakudesu, animasu, animeindo, samehadaku, anoboy];
  const results = await Promise.allSettled(
    providers.map(p => fetchWithTimeout(p.search({ filter: { keyword: req.params.keyword } })))
  );
  const all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r.value?.animes || []))
    .map(formatAnimeList);
  res.json(createResponse({ animeList: all }));
});

// ========== DETAIL ==========
app.get('/anime/anime/:slug', async (req, res) => {
  const slug = req.params.slug;
  const key = `detail-${slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  let data: any;
  const fetchers = [otakudesu, animasu, animeindo, samehadaku, anoboy];
  for (const p of fetchers) {
    try { data = await fetchWithTimeout(p.detail(slug)); if (data?.title) break; } catch {}
  }
  if (!data?.title) return res.status(404).json({ status: "error", message: "Anime tidak ditemukan" });
  const result = createResponse(formatDetail(data));
  setCache(key, result);
  res.json(result);
});

// ========== EPISODE ==========
app.get('/anime/episode/:slug', async (req, res) => {
  const slug = req.params.slug;
  const providers = [animasu, otakudesu, animeindo, samehadaku, anoboy];
  const results = await Promise.allSettled(
    providers.map(p => fetchWithTimeout(p.streams(slug)))
  );
  const allStreams: any[] = [];
  results.forEach((r, idx) => {
    if (r.status === 'fulfilled') {
      const raw = r.value;
      const streams = Array.isArray(raw) ? raw : (raw?.streams || []);
      streams.forEach((s: any) => allStreams.push({ ...s, provider: s.source || providers[idx].name }));
    }
  });
  if (!allStreams.length) return res.status(502).json({ status: "error", message: "Stream tidak tersedia" });
  const qualities = Array.from(
    allStreams.reduce((map, s) => {
      const qual = s.name || 'Unknown';
      if (!map.has(qual)) map.set(qual, []);
      map.get(qual)!.push({ title: s.provider, url: s.url, source: s.provider });
      return map;
    }, new Map<string, any[]>())
  ).map(([title, serverList]) => ({ title, serverList }));
  res.json(createResponse({
    animeId: slug,
    defaultStreamingUrl: allStreams[0]?.url || '',
    server: { qualities },
  }));
});

// ========== GENRE LIST ==========
app.get('/anime/genre', async (req, res) => {
  const key = 'genre';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const results = await Promise.allSettled([
    otakudesu.genres(), animasu.genres(), anoboy.genres()
  ]);
  const all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r.value || []));
  const unique = all.filter((g: any, i: number, arr: any[]) => arr.findIndex(x => x.slug === g.slug) === i);
  const result = createResponse({
    genreList: unique.map((g: any) => ({
      title: g.name,
      genreId: g.slug,
      href: `/anime/genre/${g.slug}`,
    })),
  });
  setCache(key, result);
  res.json(result);
});

// ========== ANIME BY GENRE ==========
app.get('/anime/genre/:slug', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const key = `genre-${req.params.slug}-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const providers = [otakudesu, animasu, animeindo, samehadaku, anoboy];
  const results = await Promise.allSettled(
    providers.map(p => fetchWithTimeout(p.search({ filter: { genres: [req.params.slug] }, page })))
  );
  const all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r.value?.animes || []))
    .map(formatAnimeList);
  res.json(createResponse({ animeList: all }, { currentPage: page }));
});

// ========== SCHEDULE ==========
app.get('/anime/schedule', async (req, res) => {
  const key = 'schedule';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    const schedule = await Promise.all(days.map(async (day) => {
      try {
        const slugs: string[] = await (otakudesu as any).searchByDay(day);
        const animes = await Promise.all(slugs.map(slug => (otakudesu as any).detail(slug).catch(() => null)));
        return {
          day: day.charAt(0).toUpperCase() + day.slice(1),
          anime_list: animes.filter(Boolean).map((a: any) => ({
            title: a.title,
            slug: a.slug,
            url: `/anime/anime/${a.slug}`,
            poster: a.posterUrl,
          })),
        };
      } catch { return { day, anime_list: [] }; }
    }));
    setCache(key, createResponse({ schedule }));
    res.json(createResponse({ schedule }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Batch
app.get('/anime/batch/:slug', async (req, res) => {
  try {
    let data = await fetchWithTimeout(otakudesu.detail(req.params.slug)).catch(() => null);
    if (!data?.title) data = await fetchWithTimeout(animasu.detail(req.params.slug)).catch(() => null);
    res.json(createResponse({ title: data?.title, animeId: data?.slug || req.params.slug, batches: data?.batches || [] }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Server
app.get('/anime/server/:serverId', (req, res) => {
  res.json(createResponse({ embedUrl: req.params.serverId }));
});

// Unlimited
app.get('/anime/unlimited', async (req, res) => {
  const key = 'unlimited';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const providers = [otakudesu, animasu, samehadaku, anoboy];
  const results = await Promise.allSettled(
    providers.map(p => fetchWithTimeout(p.search({ filter: { keyword: '' } })))
  );
  const all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r.value?.animes || []))
    .map(formatAnimeList);
  setCache(key, createResponse({ animeList: all }));
  res.json(createResponse({ animeList: all }));
});

// Root
app.get('/', (req, res) => {
  res.json({
    status: "success",
    creator: "Animapi",
    endpoints: [
      '/anime/home', '/anime/ongoing-anime', '/anime/complete-anime',
      '/anime/search/:keyword', '/anime/anime/:slug', '/anime/episode/:slug',
      '/anime/genre', '/anime/genre/:slug', '/anime/schedule',
      '/anime/batch/:slug', '/anime/server/:serverId', '/anime/unlimited',
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
