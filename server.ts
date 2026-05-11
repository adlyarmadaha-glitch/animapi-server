import express from 'express';
import cors from 'cors';
import { Otakudesu, Animasu, AnimeIndo } from './index.js';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// Cache sederhana (in-memory)
const cache = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 menit
const getCache = (key: string) => {
  const c = cache.get(key);
  if (c && Date.now() - c.time < CACHE_TTL) return c.data;
  return null;
};
const setCache = (key: string, data: any) => cache.set(key, { data, time: Date.now() });

const otakudesu = new Otakudesu();
const animasu = new Animasu();
const animeindo = new AnimeIndo();

// Format anime standar
const formatAnime = (anime: any) => ({
  title: anime.title,
  poster: anime.posterUrl,
  animeId: anime.slug,
  href: `/anime/anime/${anime.slug}`,
  status: anime.status,
  type: anime.type || null,
  score: anime.rating?.toString() || null,
  episodes: anime.episodes?.length || 0,
  synopsis: anime.synopsis?.substring(0, 200) || null,
  releaseDay: null, // akan diisi jika ada
  latestReleaseDate: null,
  otakudesuUrl: anime.source === 'otakudesu' ? `https://otakudesu.blog/anime/${anime.slug}/` : null,
});

// Response builder
const createResponse = (data: any, pagination: any = null) => ({
  status: "success",
  creator: "Animapi",
  statusCode: 200,
  message: "",
  ok: true,
  data,
  pagination,
});

// Logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`));
  next();
});

// ==================== ENDPOINTS ====================

/**
 * HOME - ongoing + completed
 */
app.get('/anime/home', async (req, res) => {
  const key = 'home';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [otOngoing, otCompleted] = await Promise.all([
      otakudesu.search({ filter: { status: 'Ongoing' } }).catch(() => ({ animes: [] })),
      otakudesu.search({ filter: { status: 'Completed' } }).catch(() => ({ animes: [] })),
    ]);
    const ongoingList = (otOngoing.animes || []).slice(0, 15).map(formatAnime);
    const completedList = (otCompleted.animes || []).slice(0, 10).map(formatAnime);
    const result = createResponse({
      ongoing: {
        href: "/anime/ongoing-anime",
        otakudesuUrl: "https://otakudesu.blog/ongoing-anime/",
        animeList: ongoingList,
      },
      completed: {
        href: "/anime/complete-anime",
        otakudesuUrl: "https://otakudesu.blog/complete-anime/",
        animeList: completedList,
      },
    });
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

/**
 * ONGOING ANIME (pagination)
 */
app.get('/anime/ongoing-anime', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const key = `ongoing-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { status: 'Ongoing' }, page }).catch(() => ({ animes: [], hasNext: false })),
      animasu.search({ filter: { status: 'Ongoing' }, page }).catch(() => ({ animes: [], hasNext: false })),
      animeindo.search({ filter: { status: 'Ongoing' }, page }).catch(() => ({ animes: [], hasNext: false })),
    ]);
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])].map(formatAnime);
    const result = createResponse(
      { animeList: all },
      { currentPage: page, hasNextPage: ot.hasNext || an.hasNext || ai.hasNext }
    );
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

/**
 * COMPLETED ANIME (pagination)
 */
app.get('/anime/complete-anime', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const key = `complete-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { status: 'Completed' }, page }).catch(() => ({ animes: [], hasNext: false })),
      animasu.search({ filter: { status: 'Completed' }, page }).catch(() => ({ animes: [], hasNext: false })),
      animeindo.search({ filter: { status: 'Completed' }, page }).catch(() => ({ animes: [], hasNext: false })),
    ]);
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])].map(formatAnime);
    const result = createResponse(
      { animeList: all },
      { currentPage: page, hasNextPage: ot.hasNext || an.hasNext || ai.hasNext }
    );
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

/**
 * SEARCH
 */
app.get('/anime/search/:keyword', async (req, res) => {
  const key = `search-${req.params.keyword}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { keyword: req.params.keyword } }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { keyword: req.params.keyword } }).catch(() => ({ animes: [] })),
      animeindo.search({ filter: { keyword: req.params.keyword } }).catch(() => ({ animes: [] })),
    ]);
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])].map(formatAnime);
    res.json(createResponse({ animeList: all }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

/**
 * ANIME DETAIL
 */
app.get('/anime/anime/:slug', async (req, res) => {
  const key = `detail-${req.params.slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    let data;
    const slug = req.params.slug;
    try { data = await otakudesu.detail(slug); } catch {}
    if (!data?.title) { try { data = await animasu.detail(slug); } catch {} }
    if (!data?.title) { try { data = await animeindo.detail(slug); } catch {} }
    if (!data?.title) return res.status(404).json({ status: "error", message: "Anime tidak ditemukan" });

    const result = createResponse({
      title: data.title,
      poster: data.posterUrl,
      animeId: data.slug,
      synopsis: data.synopsis,
      score: data.rating?.toString() || null,
      status: data.status,
      type: data.type,
      duration: data.duration,
      aired: data.aired,
      studios: data.studios || [],
      genres: data.genres?.map((g: any) => g.name) || [],
      episodeList: data.episodes?.map((e: any) => ({
        title: e.name,
        episodeId: e.slug,
        href: `/anime/episode/${e.slug}`,
      })) || [],
      batches: data.batches?.map((b: any) => ({
        name: b.name,
        resolution: b.resolution,
        url: b.url,
      })) || [],
    });
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

/**
 * EPISODE STREAMS
 */
app.get('/anime/episode/:slug', async (req, res) => {
  const slug = req.params.slug;
  const key = `episode-${slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    let streams: any[] = [];
    try { const raw = await animasu.streams(slug); streams = Array.isArray(raw) ? raw : (raw?.streams || []); } catch {}
    if (!streams.length) { try { const raw = await otakudesu.streams(slug); streams = Array.isArray(raw) ? raw : (raw?.streams || []); } catch {} }
    if (!streams.length) { try { const raw = await animeindo.streams(slug); streams = Array.isArray(raw) ? raw : (raw?.streams || []); } catch {} }
    if (!streams.length) return res.status(502).json({ status: "error", message: "Stream tidak tersedia" });

    const qualities = streams.reduce((acc: any[], s: any) => {
      const existing = acc.find(q => q.title === s.name);
      if (existing) existing.serverList.push({ title: s.source, url: s.url });
      else acc.push({ title: s.name, serverList: [{ title: s.source, url: s.url }] });
      return acc;
    }, []);

    res.json(createResponse({
      animeId: slug,
      defaultStreamingUrl: streams[0]?.url || '',
      server: { qualities },
    }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

/**
 * GENRE LIST
 */
app.get('/anime/genre', async (req, res) => {
  const key = 'genre';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [ot, an] = await Promise.all([
      otakudesu.genres().catch(() => []),
      animasu.genres().catch(() => []),
    ]);
    const all = [...(ot||[]), ...(an||[])];
    const unique = all.filter((g: any, i: number, arr: any[]) => arr.findIndex(x => x.slug === g.slug) === i);
    const result = createResponse({
      genreList: unique.map((g: any) => ({ title: g.name, genreId: g.slug, href: `/anime/genre/${g.slug}` })),
    });
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

/**
 * ANIME BY GENRE
 */
app.get('/anime/genre/:slug', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const key = `genre-${req.params.slug}-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [ot, an, ai] = await Promise.all([
      otakudesu.search({ filter: { genres: [req.params.slug] }, page }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { genres: [req.params.slug] }, page }).catch(() => ({ animes: [] })),
      animeindo.search({ filter: { genres: [req.params.slug] }, page }).catch(() => ({ animes: [] })),
    ]);
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])].map(formatAnime);
    res.json(createResponse({ animeList: all }, { currentPage: page }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

/**
 * SCHEDULE (via Otakudesu private method)
 */
app.get('/anime/schedule', async (req, res) => {
  const key = 'schedule';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu', 'random'];
    const schedule = await Promise.all(days.map(async (day) => {
      const slugs = await (otakudesu as any).searchByDay(day).catch(() => []);
      const animes = await Promise.all(
        slugs.map((slug: string) => otakudesu.detail(slug).catch(() => null))
      );
      return {
        day: day.charAt(0).toUpperCase() + day.slice(1),
        anime_list: animes.filter(Boolean).map(formatAnime),
      };
    }));
    setCache(key, createResponse({ schedule }));
    res.json(createResponse({ schedule }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

/**
 * BATCH
 */
app.get('/anime/batch/:slug', async (req, res) => {
  try {
    let data = await otakudesu.detail(req.params.slug).catch(() => null);
    if (!data?.title) data = await animasu.detail(req.params.slug).catch(() => null);
    res.json(createResponse({
      title: data?.title || null,
      animeId: data?.slug || req.params.slug,
      batches: data?.batches || [],
    }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

/**
 * UNLIMITED
 */
app.get('/anime/unlimited', async (req, res) => {
  const key = 'unlimited';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [ot, an] = await Promise.all([
      otakudesu.search({ filter: { keyword: '' } }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { keyword: '' } }).catch(() => ({ animes: [] })),
    ]);
    const all = [...(ot.animes||[]), ...(an.animes||[])].map(formatAnime);
    setCache(key, createResponse({ animeList: all }));
    res.json(createResponse({ animeList: all }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

/**
 * SERVER EMBED
 */
app.get('/anime/server/:serverId', (req, res) => {
  res.json(createResponse({ embedUrl: req.params.serverId }));
});

/**
 * ROOT
 */
app.get('/', (req, res) => {
  res.json({
    status: "success",
    creator: "Animapi",
    message: "Anime REST API - Production Ready",
    endpoints: [
      '/anime/home',
      '/anime/ongoing-anime',
      '/anime/complete-anime',
      '/anime/search/:keyword',
      '/anime/anime/:slug',
      '/anime/episode/:slug',
      '/anime/genre',
      '/anime/genre/:slug',
      '/anime/schedule',
      '/anime/batch/:slug',
      '/anime/server/:serverId',
      '/anime/unlimited',
    ]
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
