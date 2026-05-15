import express from 'express';
import { AnichinDonghua } from '../provider-donghua/anichin/index.js';

const router = express.Router();
const donghuaProvider = new AnichinDonghua();

const cache = new Map<string, { data: any; time: number }>();
const CACHE_TTL = 5 * 60 * 1000;
const getCache = (key: string) => {
  const c = cache.get(key);
  if (c && Date.now() - c.time < CACHE_TTL) return c.data;
  return null;
};
const setCache = (key: string, data: any) => cache.set(key, { data, time: Date.now() });

function createResponse(data: any, pagination: any = null) {
  return {
    status: "success",
    creator: "AnimAPI - Donghua",
    source: "anichin-donghua",
    data,
    pagination,
  };
}

function formatAnimeList(anime: any) {
  return {
    title: anime.title,
    poster: anime.posterUrl,
    animeId: anime.slug,
    href: `/anime/donghua/detail/${anime.slug}`,
    status: anime.status,
    type: anime.type || "DONGHUA",
    episodes: anime.episodes?.length || 0,
    genreList: (anime.genres || []).map((g: any) => g.name),
    source: anime.source,
  };
}

// ========== HOME ==========
router.get('/home/:page?', async (req, res) => {
  const page = parseInt(req.params.page) || 1;
  const key = `donghua-home-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const result = await donghuaProvider.search({ filter: { page } });
    res.json(createResponse(
      { animeList: result.animes.map(formatAnimeList) },
      { currentPage: page, hasNextPage: result.hasNext }
    ));
    setCache(key, result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// ========== ONGOING ==========
router.get('/ongoing/:page?', async (req, res) => {
  const page = parseInt(req.params.page) || 1;
  const key = `donghua-ongoing-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const result = await donghuaProvider.search({ filter: { status: "Ongoing", page } });
    res.json(createResponse(
      { animeList: result.animes.map(formatAnimeList) },
      { currentPage: page, hasNextPage: result.hasNext }
    ));
    setCache(key, result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// ========== COMPLETED ==========
router.get('/completed/:page?', async (req, res) => {
  const page = parseInt(req.params.page) || 1;
  const key = `donghua-completed-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const result = await donghuaProvider.search({ filter: { status: "Completed", page } });
    res.json(createResponse(
      { animeList: result.animes.map(formatAnimeList) },
      { currentPage: page, hasNextPage: result.hasNext }
    ));
    setCache(key, result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// ========== LATEST ==========
router.get('/latest/:page?', async (req, res) => {
  const page = parseInt(req.params.page) || 1;
  const key = `donghua-latest-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const result = await donghuaProvider.search({ filter: { page } });
    res.json(createResponse(
      { animeList: result.animes.map(formatAnimeList) },
      { currentPage: page, hasNextPage: result.hasNext }
    ));
    setCache(key, result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// ========== SEARCH ==========
router.get('/search/:keyword/:page?', async (req, res) => {
  const { keyword } = req.params;
  const page = parseInt(req.params.page) || 1;
  const key = `donghua-search-${keyword}-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const result = await donghuaProvider.search({ filter: { keyword, page } });
    res.json(createResponse(
      { animeList: result.animes.map(formatAnimeList) },
      { currentPage: page, hasNextPage: result.hasNext }
    ));
    setCache(key, result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// ========== DETAIL ==========
router.get('/detail/:slug', async (req, res) => {
  const { slug } = req.params;
  const key = `donghua-detail-${slug}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const detail = await donghuaProvider.detail(slug);
    if (!detail?.title) return res.status(404).json({ status: "error", message: "Donghua tidak ditemukan" });

    res.json(createResponse({
      title: detail.title,
      poster: detail.posterUrl,
      animeId: detail.slug,
      synopsis: detail.synopsis,
      status: detail.status,
      type: detail.type || "DONGHUA",
      genres: (detail.genres || []).map((g: any) => g.name),
      episodeList: (detail.episodes || []).map((e: any) => ({
        title: e.name,
        episodeId: e.slug,
        href: `/anime/donghua/episode/${e.slug}`,
      })),
    }));
    setCache(key, result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// ========== EPISODE ==========
router.get('/episode/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    const streams = await donghuaProvider.streams(slug);
    if (!streams.length) return res.status(502).json({ status: "error", message: "Stream tidak tersedia" });

    res.json(createResponse({
      animeId: slug,
      defaultStreamingUrl: streams[0]?.url || '',
      server: {
        qualities: [{
          title: "HD",
          serverList: streams.map((s: any) => ({
            title: s.name,
            url: s.url,
            source: s.source,
          })),
        }],
      },
    }));
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// ========== GENRES LIST ==========
router.get('/genres', async (req, res) => {
  const key = 'donghua-genres';
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const genres = await donghuaProvider.genres();
    res.json(createResponse({
      genreList: genres.map((g: any) => ({
        title: g.name,
        genreId: g.slug,
        href: `/anime/donghua/genres/${g.slug}`,
      })),
    }));
    setCache(key, result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// ========== GENRES BY SLUG ==========
router.get('/genres/:slug/:page?', async (req, res) => {
  const { slug } = req.params;
  const page = parseInt(req.params.page) || 1;
  const key = `donghua-genre-${slug}-${page}`;
  const cached = getCache(key);
  if (cached) return res.json(cached);

  try {
    const result = await donghuaProvider.search({ filter: { genres: [slug], page } });
    res.json(createResponse(
      { animeList: result.animes.map(formatAnimeList) },
      { currentPage: page, hasNextPage: result.hasNext }
    ));
    setCache(key, result);
  } catch (e: any) { res.status(500).json({ status: "error", message: e.message }); }
});

// ========== SCHEDULE ==========
router.get('/schedule', async (req, res) => {
  // Placeholder: provider belum support schedule
  res.json(createResponse({ message: "Schedule donghua belum tersedia", schedule: [] }));
});

// ========== AZ-LIST ==========
router.get('/az-list/:slug/:page?', async (req, res) => {
  const { slug } = req.params;
  const page = parseInt(req.params.page) || 1;
  // Placeholder: provider belum support AZ list
  res.json(createResponse({ message: "AZ List donghua belum tersedia", animeList: [] }));
});

// ========== SEASONS ==========
router.get('/seasons/:year?', async (req, res) => {
  const year = req.params.year || new Date().getFullYear().toString();
  // Placeholder: provider belum support seasons
  res.json(createResponse({ message: "Seasons donghua belum tersedia", animeList: [] }));
});
