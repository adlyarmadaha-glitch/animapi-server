import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const BASE = "https://otakudesu.cloud";
const headers = { "User-Agent": "Mozilla/5.0" };

// HOME
app.get("/otakudesu/home", async (req, res) => {
  try {
    const { data } = await axios.get(BASE, { headers });
    const $ = cheerio.load(data);
    const ongoing: any[] = [];
    const complete: any[] = [];

    $(".venz ul li").each((_, el) => {
      const title = $(el).find(".jdlflm").text().trim();
      const poster = $(el).find("img").attr("src") || "";
      const href = $(el).find("a").attr("href") || "";
      const eps = $(el).find(".epz").text().trim();
      const slug = href.split("/anime/")[1]?.replace("/", "") || "";
      ongoing.push({ title, poster, eps, slug, href });
    });

    res.json({ status: "success", data: { ongoing, complete } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ONGOING
app.get("/otakudesu/ongoing", async (req, res) => {
  try {
    const page = req.query.page || 1;
    const { data } = await axios.get(`${BASE}/ongoing-anime/page/${page}`, { headers });
    const $ = cheerio.load(data);
    const animes: any[] = [];

    $(".venz ul li").each((_, el) => {
      const title = $(el).find(".jdlflm").text().trim();
      const poster = $(el).find("img").attr("src") || "";
      const href = $(el).find("a").attr("href") || "";
      const eps = $(el).find(".epz").text().trim();
      const day = $(el).find(".epztipe").text().trim();
      const slug = href.split("/anime/")[1]?.replace("/", "") || "";
      animes.push({ title, poster, eps, day, slug, href });
    });

    res.json({ status: "success", data: { animeList: animes } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// COMPLETE
app.get("/otakudesu/complete", async (req, res) => {
  try {
    const page = req.query.page || 1;
    const { data } = await axios.get(`${BASE}/complete-anime/page/${page}`, { headers });
    const $ = cheerio.load(data);
    const animes: any[] = [];

    $(".venz ul li").each((_, el) => {
      const title = $(el).find(".jdlflm").text().trim();
      const poster = $(el).find("img").attr("src") || "";
      const href = $(el).find("a").attr("href") || "";
      const eps = $(el).find(".epz").text().trim();
      const score = $(el).find(".epzst").text().trim();
      const slug = href.split("/anime/")[1]?.replace("/", "") || "";
      animes.push({ title, poster, eps, score, slug, href });
    });

    res.json({ status: "success", data: { animeList: animes } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// SEARCH
app.get("/otakudesu/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    const { data } = await axios.get(`${BASE}/?s=${q}&post_type=anime`, { headers });
    const $ = cheerio.load(data);
    const animes: any[] = [];

    $(".chivsrc li").each((_, el) => {
      const title = $(el).find("h2").text().trim();
      const poster = $(el).find("img").attr("src") || "";
      const href = $(el).find("a").attr("href") || "";
      const genres = $(el).find(".set a").map((_: any, g: any) => $(g).text()).get();
      const status = $(el).find(".set").last().text().replace("Status :", "").trim();
      const slug = href.split("/anime/")[1]?.replace("/", "") || "";
      animes.push({ title, poster, slug, href, genres, status });
    });

    res.json({ status: "success", data: { animeList: animes } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DETAIL ANIME
app.get("/otakudesu/anime/:slug", async (req, res) => {
  try {
    const { data } = await axios.get(`${BASE}/anime/${req.params.slug}/`, { headers });
    const $ = cheerio.load(data);

    const title = $(".jdlrx h1").text().trim();
    const poster = $(".fotoanime img").attr("src") || "";
    const synopsis = $(".sinopc").text().trim();
    const episodeList: any[] = [];
    const genres: any[] = [];

    $(".episodelist li").each((_, el) => {
      const epTitle = $(el).find("a").text().trim();
      const epHref = $(el).find("a").attr("href") || "";
      const date = $(el).find(".zeebr").text().trim();
      const slug = epHref.split("/episode/")[1]?.replace("/", "") || "";
      episodeList.push({ title: epTitle, slug, href: epHref, date });
    });

    $(".infozingle p").each((_, el) => {
      const label = $(el).find("b").text().trim();
      const value = $(el).find("span").text().trim();
    });

    $(".genre-info a").each((_, el) => {
      genres.push({ title: $(el).text().trim(), href: $(el).attr("href") || "" });
    });

    res.json({ status: "success", data: { title, poster, synopsis, genres, episodeList } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// EPISODE + STREAMING
app.get("/otakudesu/episode/:slug", async (req, res) => {
  try {
    const { data } = await axios.get(`${BASE}/episode/${req.params.slug}/`, { headers });
    const $ = cheerio.load(data);

    const title = $(".venutama h1").text().trim();
    const defaultStream = $("iframe").first().attr("src") || "";
    const servers: any[] = [];

    $(".mirrorstream ul li").each((_, el) => {
      const quality = $(el).find(".q").text().trim();
      const serverName = $(el).find("a").text().trim();
      const serverId = $(el).find("a").attr("data-content") || "";
      servers.push({ quality, serverName, serverId });
    });

    const downloadUrls: any[] = [];
    $(".dl-button .download ul li").each((_, el) => {
      const quality = $(el).find("strong").text().trim();
      const links: any[] = [];
      $(el).find("a").each((_: any, a: any) => {
        links.push({ title: $(a).text().trim(), url: $(a).attr("href") || "" });
      });
      downloadUrls.push({ quality, links });
    });

    res.json({ status: "success", data: { title, defaultStream, servers, downloadUrls } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GENRE LIST
app.get("/otakudesu/genre", async (req, res) => {
  try {
    const { data } = await axios.get(BASE, { headers });
    const $ = cheerio.load(data);
    const genres: any[] = [];

    $(".genre a").each((_, el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const slug = href.split("/genres/")[1]?.replace("/", "") || "";
      genres.push({ title, slug, href });
    });

    res.json({ status: "success", data: { genreList: genres } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GENRE DETAIL
app.get("/otakudesu/genre/:slug", async (req, res) => {
  try {
    const page = req.query.page || 1;
    const { data } = await axios.get(`${BASE}/genres/${req.params.slug}/page/${page}`, { headers });
    const $ = cheerio.load(data);
    const animes: any[] = [];

    $(".col-anime").each((_, el) => {
      const title = $(el).find(".col-anime-title").text().trim();
      const poster = $(el).find("img").attr("src") || "";
      const href = $(el).find("a").attr("href") || "";
      const score = $(el).find(".col-anime-rating").text().trim();
      const status = $(el).find(".col-anime-status").text().trim();
      const slug = href.split("/anime/")[1]?.replace("/", "") || "";
      animes.push({ title, poster, score, status, slug, href });
    });

    res.json({ status: "success", data: { animeList: animes } });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// SCHEDULE
app.get("/otakudesu/schedule", async (req, res) => {
  try {
    const { data } = await axios.get(`${BASE}/jadwal-rilis/`, { headers });
    const $ = cheerio.load(data);
    const schedule: any[] = [];

    $(".kglist321").each((_, el) => {
      const day = $(el).find("h2").text().trim();
      const animes: any[] = [];
      $(el).find("li").each((_: any, li: any) => {
        const title = $(li).find("a").text().trim();
        const href = $(li).find("a").attr("href") || "";
        const slug = href.split("/anime/")[1]?.replace("/", "") || "";
        animes.push({ title, slug, href });
      });
      schedule.push({ day, animes });
    });

    res.json({ status: "success", data: schedule });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/", (req, res) => {
  res.json({ message: "Animapi REST API - Custom Scraper", endpoints: [
    "/otakudesu/home",
    "/otakudesu/ongoing?page=1",
    "/otakudesu/complete?page=1",
    "/otakudesu/search?q=keyword",
    "/otakudesu/anime/:slug",
    "/otakudesu/episode/:slug",
    "/otakudesu/genre",
    "/otakudesu/genre/:slug?page=1",
    "/otakudesu/schedule",
  ]});
});

app.listen(PORT, () => console.log("Server jalan di port " + PORT));
