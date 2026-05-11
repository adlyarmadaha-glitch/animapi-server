import express from 'express';
import cors from 'cors';
import { Otakudesu, Animasu, AnimeIndo } from './index.js';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

// Cache sederhana
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

// Utility: format anime untuk list
const formatAnimeList = (anime: any) => ({
  title: anime.title,
  poster: anime.posterUrl,
  animeId: anime.slug,
  href: `/anime/anime/${anime.slug}`,
  status: anime.status,
  type: anime.type || null,
  score: anime.rating?.toString() || null,
  episodes: anime.episodes?.length || null,
  releaseDay: null, // akan diisi jika dari sumber tertentu
  latestReleaseDate: null,
  otakudesuUrl: anime.source === 'otakudesu' ? `https://otakudesu.blog/anime/${anime.slug}/` : null,
  studios: anime.studios || [],
  season: anime.season || null,
  synopsis: anime.synopsis?.substring(0, 150) || null,
  genreList: (anime.genres || []).map((g: any) => g.name),
});

// Format detail
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

// ==================== ENDPOINTS ====================

// Home
app.get('/anime/home', async (req, res) => {
  const key = 'home';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [otOn, otCom] = await Promise.all([
      otakudesu.search({ filter: { status: 'Ongoing' } }).catch(() => ({ animes: [] })),
      otakudesu.search({ filter: { status: 'Completed' } }).catch(() => ({ animes: [] })),
    ]);
    const ongoingList = (otOn.animes || []).slice(0, 15).map((a: any) => ({
      ...formatAnimeList(a),
      releaseDay: null,
      latestReleaseDate: null,
    }));
    const completedList = (otCom.animes || []).slice(0, 10).map((a: any) => ({
      ...formatAnimeList(a),
      score: a.rating?.toString() || null,
      lastReleaseDate: null,
      episodes: a.episodes?.length || null,
    }));
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

// Ongoing list
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
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])].map(formatAnimeList);
    const result = createResponse(
      { animeList: all },
      { currentPage: page, hasNextPage: ot.hasNext || an.hasNext || ai.hasNext }
    );
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Completed list
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
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])].map(formatAnimeList);
    const result = createResponse(
      { animeList: all },
      { currentPage: page, hasNextPage: ot.hasNext || an.hasNext || ai.hasNext }
    );
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Search
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
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])].map(formatAnimeList);
    setCache(key, createResponse({ animeList: all }));
    res.json(createResponse({ animeList: all }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Detail anime
app.get('/anime/anime/:slug', async (req, res) => {
  const slug = req.params.slug;
  const key = `detail-${slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    let data: any;
    // Coba dari Otakudesu dulu
    try { data = await otakudesu.detail(slug); } catch {}
    // Jika tidak ada atau tidak lengkap, coba Animasu
    if (!data?.title) {
      try { data = await animasu.detail(slug); } catch {}
    }
    // Jika masih kosong, coba AnimeIndo
    if (!data?.title) {
      try { data = await animeindo.detail(slug); } catch {}
    }
    if (!data?.title) return res.status(404).json({ status: "error", message: "Anime tidak ditemukan" });
    
    const result = createResponse(formatDetail(data));
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Episode streams
app.get('/anime/episode/:slug', async (req, res) => {
  const slug = req.params.slug;
  const key = `episode-${slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    let streams: any[] = [];
    let source = '';
    // Coba provider satu per satu
    try {
      const raw = await animasu.streams(slug);
      streams = Array.isArray(raw) ? raw : (raw?.streams || []);
      if (streams.length) source = 'animasu';
    } catch {}
    if (!streams.length) {
      try {
        const raw = await otakudesu.streams(slug);
        streams = Array.isArray(raw) ? raw : (raw?.streams || []);
        if (streams.length) source = 'otakudesu';
      } catch {}
    }
    if (!streams.length) {
      try {
        const raw = await animeindo.streams(slug);
        streams = Array.isArray(raw) ? raw : (raw?.streams || []);
        if (streams.length) source = 'animeindo';
      } catch {}
    }
    if (!streams.length) return res.status(502).json({ status: "error", message: "Stream tidak tersedia" });

    const qualities = streams.reduce((acc: any[], s: any) => {
      const existing = acc.find(q => q.title === s.name);
      if (existing) existing.serverList.push({ title: s.source, url: s.url });
      else acc.push({ title: s.name, serverList: [{ title: s.source, url: s.url }] });
      return acc;
    }, []);

    res.json(createResponse({
      title: `Episode ${slug}`,
      animeId: slug,
      defaultStreamingUrl: streams[0]?.url || '',
      server: { qualities },
      source,
    }));
    setCache(key, createResponse({ /* jangan cache karena dinamis */ }));
    // Note: tidak disarankan cache streaming karena bisa berubah
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Genre list
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
      genreList: unique.map((g: any) => ({
        title: g.name,
        genreId: g.slug,
        href: `/anime/genre/${g.slug}`,
        otakudesuUrl: `https://otakudesu.blog/genres/${g.slug}/`,
      })),
    });
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Anime by genre
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
    const all = [...(ot.animes||[]), ...(an.animes||[]), ...(ai.animes||[])].map(formatAnimeList);
    res.json(createResponse({ animeList: all }, { currentPage: page }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Schedule (menggunakan Otakudesu)
app.get('/anime/schedule', async (req, res) => {
  const key = 'schedule';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    const schedule = await Promise.all(days.map(async (day) => {
      try {
        const slugs: string[] = await (otakudesu as any).searchByDay(day);
        const animes = await Promise.all(
          slugs.map(slug => (otakudesu as any).detail(slug).catch(() => null))
        );
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
    let data = await otakudesu.detail(req.params.slug).catch(() => null);
    if (!data?.title) data = await animasu.detail(req.params.slug).catch(() => null);
    res.json(createResponse({
      title: data?.title || null,
      animeId: data?.slug || req.params.slug,
      batches: data?.batches || [],
    }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Server embed (placeholder)
app.get('/anime/server/:serverId', (req, res) => {
  res.json(createResponse({ embedUrl: req.params.serverId }));
});

// Root
app.get('/', (req, res) => {
  res.json({
    status: "success",
    creator: "Animapi",
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

// Unlimited (semua)
app.get('/anime/unlimited', async (req, res) => {
  const key = 'unlimited';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [ot, an] = await Promise.all([
      otakudesu.search({ filter: { keyword: '' } }).catch(() => ({ animes: [] })),
      animasu.search({ filter: { keyword: '' } }).catch(() => ({ animes: [] })),
    ]);
    const all = [...(ot.animes||[]), ...(an.animes||[])].map(formatAnimeList);
    setCache(key, createResponse({ animeList: all }));
    res.json(createResponse({ animeList: all }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
