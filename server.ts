import express from 'express';
import cors from 'cors';

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

// Dynamic import providers dengan fallback
let Otakudesu: any, Animasu: any, AnimeIndo: any, Samehadaku: any, Anoboy: any, Jikan: any;
const providers: any[] = [];
const streamProviders: any[] = [];

async function loadProviders() {
  try {
    ({ Otakudesu } = await import('./provider/otakudesu/index.js'));
    const otakudesu = new Otakudesu();
    providers.push(otakudesu);
    streamProviders.push(otakudesu);
    console.log('✅ Otakudesu loaded');
  } catch (e) { console.warn('⚠️ Otakudesu failed:', (e as Error).message); }

  try {
    ({ Animasu } = await import('./provider/animasu/index.js'));
    const animasu = new Animasu();
    providers.push(animasu);
    streamProviders.splice(0, 0, animasu); // Animasu jadi prioritas utama untuk streaming
    console.log('✅ Animasu loaded');
  } catch (e) { console.warn('⚠️ Animasu failed:', (e as Error).message); }

  try {
    ({ AnimeIndo } = await import('./provider/anime-indo/index.js'));
    const animeindo = new AnimeIndo();
    providers.push(animeindo);
    streamProviders.push(animeindo);
    console.log('✅ AnimeIndo loaded');
  } catch (e) { console.warn('⚠️ AnimeIndo failed:', (e as Error).message); }

  try {
    ({ Samehadaku } = await import('./provider/samehadaku/index.js'));
    const samehadaku = new Samehadaku();
    providers.push(samehadaku);
    streamProviders.push(samehadaku);
    console.log('✅ Samehadaku loaded');
  } catch (e) { console.warn('⚠️ Samehadaku failed:', (e as Error).message); }

  try {
    ({ Anoboy } = await import('./provider/anoboy/index.js'));
    const anoboy = new Anoboy();
    providers.push(anoboy);
    streamProviders.push(anoboy);
    console.log('✅ Anoboy loaded');
  } catch (e) { console.warn('⚠️ Anoboy failed:', (e as Error).message); }

  try {
    ({ Jikan } = await import('./provider/jikan/index.js'));
    const jikan = new Jikan();
    providers.push(jikan);
    console.log('✅ Jikan loaded');
  } catch (e) { console.warn('⚠️ Jikan failed:', (e as Error).message); }

  console.log(`🚀 ${providers.length} providers loaded, ${streamProviders.length} for streaming`);
}

// Utility
const fetchWithTimeout = <T>(promise: Promise<T>, ms = 10000): Promise<T> =>
  Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))]);

const formatAnimeList = (anime: any) => ({
  title: anime.title,
  poster: anime.posterUrl,
  animeId: anime.slug,
  href: `/anime/anime/${anime.slug}`,
  status: anime.status,
  type: anime.type || null,
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
    const otakudesu = streamProviders.find(p => p.name === 'otakudesu');
    let ongoingList: any[] = [], completedList: any[] = [];
    if (otakudesu) {
      try {
        const [otOn, otCom] = await Promise.allSettled([
          fetchWithTimeout(otakudesu.search({ filter: { status: 'Ongoing' } })),
          fetchWithTimeout(otakudesu.search({ filter: { status: 'Completed' } }))
        ]);
        ongoingList = (otOn.status === 'fulfilled' ? otOn.value.animes || [] : []).slice(0, 12).map(formatAnimeList);
        completedList = (otCom.status === 'fulfilled' ? otCom.value.animes || [] : []).slice(0, 10).map(formatAnimeList);
      } catch {}
    }
    const result = createResponse({ ongoing: { animeList: ongoingList }, completed: { animeList: completedList } });
    setCache(key, result);
    res.json(result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Ongoing / Completed
const listEndpoint = (status: string) => async (req: express.Request, res: express.Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const key = `${status}-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const results = await Promise.allSettled(
    providers.map(p => fetchWithTimeout(p.search({ filter: { status }, page })).catch(() => undefined))
  );
  const all = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => (r.value?.animes || []))
    .map(formatAnimeList);
  const hasNext = results.some(r => r.status === 'fulfilled' && r.value?.hasNext);
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
    providers.map(p => fetchWithTimeout(p.search({ filter: { keyword: req.params.keyword } })).catch(() => undefined))
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
  for (const p of providers) {
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
    streamProviders.map(p => fetchWithTimeout(p.streams(slug)).catch(() => undefined))
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

// Genre list
app.get('/anime/genre', async (req, res) => {
  const key = 'genre';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  const genreProviders = providers.filter(p => p.name !== 'jikan' || p.name !== 'samehadaku'); // filter yang punya genre
  const results = await Promise.allSettled(
    genreProviders.map(p => fetchWithTimeout(p.genres()).catch(() => []))
  );
  const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value || []);
  const unique = all.filter((g: any, i: number, arr: any[]) => arr.findIndex(x => x.slug === g.slug) === i);
  const result = createResponse({ genreList: unique.map((g: any) => ({ title: g.name, genreId: g.slug, href: `/anime/genre/${g.slug}` })) });
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
    providers.map(p => fetchWithTimeout(p.search({ filter: { genres: [req.params.slug] }, page })).catch(() => undefined))
  );
  const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value?.animes || []).map(formatAnimeList);
  res.json(createResponse({ animeList: all }, { currentPage: page }));
});

// Schedule (via otakudesu)
app.get('/anime/schedule', async (req, res) => {
  const key = 'schedule';
  const cached = getCache(key);
  if (cached) return res.json(cached);
  try {
    const otakudesu = streamProviders.find(p => p.name === 'otakudesu');
    if (!otakudesu) throw new Error('Otakudesu provider not available');
    const days = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
    const schedule = await Promise.all(days.map(async (day) => {
      try {
        const slugs: string[] = await (otakudesu as any).searchByDay(day);
        const animes = await Promise.all(slugs.map(slug => (otakudesu as any).detail(slug).catch(() => null)));
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

// Batch
app.get('/anime/batch/:slug', async (req, res) => {
  try {
    const otakudesu = streamProviders.find(p => p.name === 'otakudesu');
    let data = otakudesu ? await otakudesu.detail(req.params.slug).catch(() => null) : null;
    if (!data?.title) {
      const animasu = streamProviders.find(p => p.name === 'animasu');
      if (animasu) data = await animasu.detail(req.params.slug).catch(() => null);
    }
    res.json(createResponse({ title: data?.title, animeId: data?.slug || req.params.slug, batches: data?.batches || [] }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// Server
app.get('/anime/server/:serverId', (req, res) => {
  res.json(createResponse({ embedUrl: req.params.serverId }));
});

// Unlimited
app.get('/anime/unlimited', async (req, res) => {
  try {
    const results = await Promise.allSettled(
      providers.map(p => fetchWithTimeout(p.search({ filter: { keyword: '' } })).catch(() => undefined))
    );
    const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value?.animes || []).map(formatAnimeList);
    res.json(createResponse({ animeList: all }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

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

// Start server setelah provider dimuat
loadProviders().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
}).catch(err => {
  console.error('Fatal error loading providers:', err);
  process.exit(1);
});
