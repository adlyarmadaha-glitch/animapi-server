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

// Helper timeout
const fetchWithTimeout = <T>(promise: Promise<T>, ms = 12000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
  ]);

// Format anime list (sama)
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

// Format detail (sama)
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

// Response wrapper
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

// Home (dari sebelumnya, tetap)
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
      try {
        const [anOn, anCom] = await Promise.all([
          fetchWithTimeout(animasu.search({ filter: { status: 'Ongoing' } })),
          fetchWithTimeout(animasu.search({ filter: { status: 'Completed' } }))
        ]);
        ongoingList = (anOn.animes || []).slice(0, 15).map(formatAnimeList);
        completedList = (anCom.animes || []).slice(0, 10).map(formatAnimeList);
      } catch {
        const [aiOn, aiCom] = await Promise.all([
          fetchWithTimeout(animeindo.search({ filter: { status: 'Ongoing' } })),
          fetchWithTimeout(animeindo.search({ filter: { status: 'Completed' } }))
        ]);
        ongoingList = (aiOn.animes || []).slice(0, 15).map(formatAnimeList);
        completedList = (aiCom.animes || []).slice(0, 10).map(formatAnimeList);
      }
    }
    const result = createResponse({
      ongoing: { href: "/anime/ongoing-anime", otakudesuUrl: "https://otakudesu.blog/ongoing-anime/", animeList: ongoingList },
      completed: { href: "/anime/complete-anime", otakudesuUrl: "https://otakudesu.blog/complete-anime/", animeList: completedList },
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
    const [ot, an, ai] = await Promise.allSettled([
      fetchWithTimeout(otakudesu.search({ filter: { status: 'Ongoing' }, page })),
      fetchWithTimeout(animasu.search({ filter: { status: 'Ongoing' }, page })),
      fetchWithTimeout(animeindo.search({ filter: { status: 'Ongoing' }, page }))
    ]);
    const all = [
      ...(ot.status === 'fulfilled' ? (ot.value.animes || []) : []),
      ...(an.status === 'fulfilled' ? (an.value.animes || []) : []),
      ...(ai.status === 'fulfilled' ? (ai.value.animes || []) : []),
    ].map(formatAnimeList);
    const hasNext = (ot.status === 'fulfilled' && ot.value.hasNext) ||
                    (an.status === 'fulfilled' && an.value.hasNext) ||
                    (ai.status === 'fulfilled' && ai.value.hasNext);
    const result = createResponse({ animeList: all }, { currentPage: page, hasNextPage: hasNext });
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
    const [ot, an, ai] = await Promise.allSettled([
      fetchWithTimeout(otakudesu.search({ filter: { status: 'Completed' }, page })),
      fetchWithTimeout(animasu.search({ filter: { status: 'Completed' }, page })),
      fetchWithTimeout(animeindo.search({ filter: { status: 'Completed' }, page }))
    ]);
    const all = [
      ...(ot.status === 'fulfilled' ? (ot.value.animes || []) : []),
      ...(an.status === 'fulfilled' ? (an.value.animes || []) : []),
      ...(ai.status === 'fulfilled' ? (ai.value.animes || []) : []),
    ].map(formatAnimeList);
    const hasNext = (ot.status === 'fulfilled' && ot.value.hasNext) ||
                    (an.status === 'fulfilled' && an.value.hasNext) ||
                    (ai.status === 'fulfilled' && ai.value.hasNext);
    const result = createResponse({ animeList: all }, { currentPage: page, hasNextPage: hasNext });
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
    const [ot, an, ai] = await Promise.allSettled([
      fetchWithTimeout(otakudesu.search({ filter: { keyword: req.params.keyword } })),
      fetchWithTimeout(animasu.search({ filter: { keyword: req.params.keyword } })),
      fetchWithTimeout(animeindo.search({ filter: { keyword: req.params.keyword } }))
    ]);
    const all = [
      ...(ot.status === 'fulfilled' ? (ot.value.animes || []) : []),
      ...(an.status === 'fulfilled' ? (an.value.animes || []) : []),
      ...(ai.status === 'fulfilled' ? (ai.value.animes || []) : []),
    ].map(formatAnimeList);
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
    try { data = await fetchWithTimeout(otakudesu.detail(slug)); } catch {}
    if (!data?.title) try { data = await fetchWithTimeout(animasu.detail(slug)); } catch {}
    if (!data?.title) try { data = await fetchWithTimeout(animeindo.detail(slug)); } catch {}
    if (!data?.title) return res.status(404).json({ status: "error", message: "Anime tidak ditemukan" });
    const result = createResponse(formatDetail(data));
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// ==================== EPISODE (DIPERBAIKI) ====================
app.get('/anime/episode/:slug', async (req, res) => {
  const slug = req.params.slug;
  // Tidak pakai cache untuk streaming karena bisa berubah

  // Mengambil dari semua provider secara paralel
  const results = await Promise.allSettled([
    fetchWithTimeout(animasu.streams(slug)),
    fetchWithTimeout(otakudesu.streams(slug)),
    fetchWithTimeout(animeindo.streams(slug)),
  ]);

  const allStreams: any[] = [];

  // Gabungkan streams dari semua provider
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const raw = result.value;
      // Bisa berupa array langsung atau object dengan property 'streams'
      const streams = Array.isArray(raw) ? raw : (raw?.streams || []);
      // Tandai source provider (0=animasu,1=otakudesu,2=animeindo)
      const source = ['animasu', 'otakudesu', 'animeindo'][index];
      streams.forEach((s: any) => {
        allStreams.push({
          ...s,
          provider: s.source || source, // pakai source dari provider jika ada, jika tidak gunakan source kita
        });
      });
    }
  });

  if (allStreams.length === 0) {
    return res.status(502).json({ status: "error", message: "Stream tidak tersedia" });
  }

  // Kelompokkan berdasarkan kualitas (name) lalu dalam setiap kualitas, daftar server dari berbagai provider
  const qualityMap = new Map<string, any[]>();
  allStreams.forEach(s => {
    const qual = s.name || 'Unknown';
    if (!qualityMap.has(qual)) qualityMap.set(qual, []);
    qualityMap.get(qual)!.push({
      title: s.provider,
      url: s.url,
      source: s.provider,
      // Beberapa provider memiliki serverId, jika ada kita sertakan
      serverId: s.serverId || null,
      href: s.serverId ? `/anime/server/${s.serverId}` : null,
    });
  });

  const qualities = Array.from(qualityMap.entries()).map(([title, serverList]) => ({
    title,
    serverList,
  }));

  // Ambil default streaming URL (prioritas dari Animasu jika ada)
  const animasuStreams = allStreams.filter(s => s.provider === 'animasu');
  const defaultUrl = animasuStreams.length > 0 ? animasuStreams[0].url : allStreams[0].url;

  res.json(createResponse({
    animeId: slug,
    defaultStreamingUrl: defaultUrl,
    server: { qualities },
    totalServers: allStreams.length,
  }));
});

// Genre list
app.get('/anime/genre', async (req, res) => {
  const key = 'genre';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [ot, an] = await Promise.allSettled([otakudesu.genres(), animasu.genres()]);
    const all = [
      ...(ot.status === 'fulfilled' ? (ot.value || []) : []),
      ...(an.status === 'fulfilled' ? (an.value || []) : []),
    ];
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
    const [ot, an, ai] = await Promise.allSettled([
      fetchWithTimeout(otakudesu.search({ filter: { genres: [req.params.slug] }, page })),
      fetchWithTimeout(animasu.search({ filter: { genres: [req.params.slug] }, page })),
      fetchWithTimeout(animeindo.search({ filter: { genres: [req.params.slug] }, page }))
    ]);
    const all = [
      ...(ot.status === 'fulfilled' ? (ot.value.animes || []) : []),
      ...(an.status === 'fulfilled' ? (an.value.animes || []) : []),
      ...(ai.status === 'fulfilled' ? (ai.value.animes || []) : []),
    ].map(formatAnimeList);
    res.json(createResponse({ animeList: all }, { currentPage: page }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
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

// Server embed
app.get('/anime/server/:serverId', (req, res) => {
  res.json(createResponse({ embedUrl: req.params.serverId }));
});

// Unlimited
app.get('/anime/unlimited', async (req, res) => {
  const key = 'unlimited';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const [ot, an] = await Promise.allSettled([
      otakudesu.search({ filter: { keyword: '' } }),
      animasu.search({ filter: { keyword: '' } }),
    ]);
    const all = [
      ...(ot.status === 'fulfilled' ? (ot.value.animes || []) : []),
      ...(an.status === 'fulfilled' ? (an.value.animes || []) : []),
    ].map(formatAnimeList);
    setCache(key, createResponse({ animeList: all }));
    res.json(createResponse({ animeList: all }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
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

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
