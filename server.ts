import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const BASE = "https://otakudesu.cloud";
const headers = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" };

const scrape = async (url: string) => {
  const { data } = await axios.get(url, { headers });
  return cheerio.load(data);
};

// HOME
app.get("/otakudesu/home", async (req, res) => {
  try {
    const $ = await scrape(BASE);
    const ongoing: any[] = [];
    const complete: any[] = [];
    $(".venz ul li").each((_, el) => {
      const title = $(el).find(".jdlflm").text().trim();
      const poster = $(el).find("img").attr("src") || "";
      const href = $(el).find("a").attr("href") || "";
      const eps = $(el).find(".epz").text().trim();
      const slug = href.split("/anime/")[1]?.replace("/","") || "";
      ongoing.push({ title, poster, eps, slug, href });
    });
    res.json({ status:"success", data:{ ongoing, complete } });
  } catch(e:any){ res.status(500).json({ error:e.message }); }
});

// ONGOING
app.get("/otakudesu/ongoing", async (req, res) => {
  try {
    const page = req.query.page || 1;
    const $ = await scrape(`${BASE}/ongoing-anime/page/${page}`);
    const animes: any[] = [];
    $(".venz ul li").each((_,el) => {
      const title = $(el).find(".jdlflm").text().trim();
      const poster = $(el).find("img").attr("src") || "";
      const href = $(el).find("a").attr("href") || "";
      const eps = $(el).find(".epz").text().trim();
      const day = $(el).find(".epztipe").text().trim();
      const slug = href.split("/anime/")[1]?.replace("/","") || "";
      animes.push({ title, poster, eps, day, slug, href });
    });
    res.json({ status:"success", data:{ animeList:animes } });
  } catch(e:any){ res.status(500).json({ error:e.message }); }
});

// COMPLETE
app.get("/otakudesu/complete", async (req, res) => {
  try {
    const page = req.query.page || 1;
    const $ = await scrape(`${BASE}/complete-anime/page/${page}`);
    const animes: any[] = [];
    $(".venz ul li").each((_,el) => {
      const title = $(el).find(".jdlflm").text().trim();
      const poster = $(el).find("img").attr("src") || "";
      const href = $(el).find("a").attr("href") || "";
      const eps = $(el).find(".epz").text().trim();
      const score = $(el).find(".epzst").text().trim();
      const slug = href.split("/anime/")[1]?.replace("/","") || "";
      animes.push({ title, poster, eps, score, slug, href });
    });
    res.json({ status:"success", data:{ animeList:animes } });
  } catch(e:any){ res.status(500).json({ error:e.message }); }
});

// SEARCH
app.get("/otakudesu/search", async (req, res) => {
  try {
    const q = req.query.q as string;
    const $ = await scrape(`${BASE}/?s=${q}&post_type=anime`);
    const animes: any[] = [];
    $(".chivsrc li").each((_,el) => {
      const title = $(el).find("h2").text().trim();
      const poster = $(el).find("img").attr("src") || "";
      const href = $(el).find("a").attr("href") || "";
      const slug = href.split("/anime/")[1]?.replace("/","") || "";
      animes.push({ title, poster, slug, href });
    });
    res.json({ status:"success", data:{ animeList:animes } });
  } catch(e:any){ res.status(500).json({ error:e.message }); }
});

// DETAIL ANIME
app.get("/otakudesu/anime/:slug", async (req, res) => {
  try {
    const $ = await scrape(`${BASE}/anime/${req.params.slug}/`);
    const title = $(".jdlrx h1").text().trim();
    const poster = $(".fotoanime img").attr("src") || "";
    const synopsis = $(".sinopc").text().trim();
    const episodeList: any[] = [];
    const genres: any[] = [];
    const info: any = {};

    $(".infozingle p").each((_,el) => {
      const label = $(el).find("b").text().replace(":","").trim().toLowerCase();
      const value = $(el).find("span").text().trim();
      info[label] = value;
    });

    $(".genre-info a").each((_,el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const slug = href.split("/genres/")[1]?.replace("/","") || "";
      genres.push({ title, slug, href });
    });

    $(".episodelist li").each((_,el) => {
      const epTitle = $(el).find("a").text().trim();
      const epHref = $(el).find("a").attr("href") || "";
      const date = $(el).find(".zeebr").text().trim();
      const slug = epHref.split("/episode/")[1]?.replace("/","") || "";
      episodeList.push({ title:epTitle, slug, href:epHref, date });
    });

    res.json({ status:"success", data:{ title, poster, synopsis, info, genres, episodeList } });
  } catch(e:any){ res.status(500).json({ error:e.message }); }
});

// EPISODE + STREAMING
app.get("/otakudesu/episode/:slug", async (req, res) => {
  try {
    const $ = await scrape(`${BASE}/episode/${req.params.slug}/`);
    const title = $(".venutama h1").text().trim();
    const defaultStream = $("iframe").first().attr("src") || "";
    const servers: any[] = [];
    const downloadUrls: any[] = [];

    $(".mirrorstream ul li").each((_,el) => {
      const quality = $(el).closest("ul").prev("h3").text().trim();
      const serverName = $(el).find("a").text().trim();
      const serverId = $(el).find("a").attr("data-content") || $(el).find("a").attr("data-post") || "";
      const nonce = $(el).find("a").attr("data-nonce") || "";
      servers.push({ quality, serverName, serverId, nonce });
    });

    $(".download ul li").each((_,el) => {
      const quality = $(el).find("strong").text().trim();
      const links: any[] = [];
      $(el).find("a").each((_:any,a:any) => {
        links.push({ title:$(a).text().trim(), url:$(a).attr("href") || "" });
      });
      if(quality) downloadUrls.push({ quality, links });
    });

    const prevEp = $(".flimimg .epsleft a").attr("href") || "";
    const nextEp = $(".flimimg .epsright a").attr("href") || "";

    res.json({ status:"success", data:{ title, defaultStream, servers, downloadUrls,
      prevEpisode: prevEp ? { href:prevEp, slug:prevEp.split("/episode/")[1]?.replace("/","") } : null,
      nextEpisode: nextEp ? { href:nextEp, slug:nextEp.split("/episode/")[1]?.replace("/","") } : null,
    }});
  } catch(e:any){ res.status(500).json({ error:e.message }); }
});

// SERVER - embed URL streaming
app.get("/otakudesu/server/:serverId", async (req, res) => {
  try {
    const { data } = await axios.post(`${BASE}/wp-admin/admin-ajax.php`, 
      new URLSearchParams({ action:"playeri", server:req.params.serverId, nonce: req.query.nonce as string || "" }),
      { headers:{ ...headers, "Content-Type":"application/x-www-form-urlencoded", "Referer":BASE } }
    );
    const $ = cheerio.load(data?.data || "");
    const embedUrl = $("iframe").attr("src") || data?.data || "";
    res.json({ status:"success", data:{ embedUrl } });
  } catch(e:any){ res.status(500).json({ error:e.message }); }
});

// GENRE LIST
app.get("/otakudesu/genre", async (req, res) => {
  try {
    const $ = await scrape(BASE);
    const genres: any[] = [];
    $(".genre a").each((_,el) => {
      const title = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const slug = href.split("/genres/")[1]?.replace("/","") || "";
      if(title) genres.push({ title, slug, href });
    });
    res.json({ status:"success", data:{ genreList:genres } });
  } catch(e:any){ res.status(500).json({ error:e.message }); }
});

// GENRE DETAIL
app.get("/otakudesu/genre/:slug", async (req, res) => {
  try {
    const page = req.query.page || 1;
    const $ = await scrape(`${BASE}/genres/${req.params.slug}/page/${page}`);
    const animes: any[] = [];
    $(".col-anime").each((_,el) => {
      const title = $(el).find(".col-anime-title").text().trim();
      const poster = $(el).find("img").attr("src") || "";
      const href = $(el).find("a").attr("href") || "";
      const score = $(el).find(".col-anime-rating").text().trim();
      const status = $(el).find(".col-anime-status").text().trim();
      const slug = href.split("/anime/")[1]?.replace("/","") || "";
      animes.push({ title, poster, score, status, slug, href });
    });
    res.json({ status:"success", data:{ animeList:animes } });
  } catch(e:any){ res.status(500).json({ error:e.message }); }
});

// SCHEDULE
app.get("/otakudesu/schedule", async (req, res) => {
  try {
    const $ = await scrape(`${BASE}/jadwal-rilis/`);
    const schedule: any[] = [];
    $(".kglist321").each((_,el) => {
      const day = $(el).find("h2").text().trim();
      const animes: any[] = [];
      $(el).find("li").each((_:any,li:any) => {
        const title = $(li).find("a").text().trim();
        const href = $(li).find("a").attr("href") || "";
        const poster = $(li).find("img").attr("src") || "";
        const slug = href.split("/anime/")[1]?.replace("/","") || "";
        animes.push({ title, slug, href, poster });
      });
      schedule.push({ day, animes });
    });
    res.json({ status:"success", data:schedule });
  } catch(e:any){ res.status(500).json({ error:e.message }); }
});

// BATCH
app.get("/otakudesu/batch/:slug", async (req, res) => {
  try {
    const $ = await scrape(`${BASE}/batch/${req.params.slug}/`);
    const title = $(".jdlrx h1").text().trim();
    const downloadUrls: any[] = [];
    $(".download ul li").each((_,el) => {
      const quality = $(el).find("strong").text().trim();
      const links: any[] = [];
      $(el).find("a").each((_:any,a:any) => {
        links.push({ title:$(a).text().trim(), url:$(a).attr("href") || "" });
      });
      if(quality) downloadUrls.push({ quality, links });
    });
    res.json({ status:"success", data:{ title, downloadUrls } });
  } catch(e:any){ res.status(500).json({ error:e.message }); }
});

// ALL ANIME
app.get("/otakudesu/unlimited", async (req, res) => {
  try {
    const page = req.query.page || 1;
    const $ = await scrape(`${BASE}/anime-list/page/${page}`);
    const animes: any[] = [];
    $(".col-anime").each((_,el) => {
      const title = $(el).find(".col-anime-title").text().trim();
      const poster = $(el).find("img").attr("src") || "";
      const href = $(el).find("a").attr("href") || "";
      const slug = href.split("/anime/")[1]?.replace("/","") || "";
      animes.push({ title, poster, slug, href });
    });
    res.json({ status:"success", data:{ animeList:animes } });
  } catch(e:any){ res.status(500).json({ error:e.message }); }
});

app.get("/", (req, res) => {
  res.json({ message:"Animapi REST API - Full Scraper", endpoints:[
    "/otakudesu/home",
    "/otakudesu/ongoing?page=1",
    "/otakudesu/complete?page=1",
    "/otakudesu/search?q=keyword",
    "/otakudesu/anime/:slug",
    "/otakudesu/episode/:slug",
    "/otakudesu/server/:serverId?nonce=xxx",
    "/otakudesu/genre",
    "/otakudesu/genre/:slug?page=1",
    "/otakudesu/schedule",
    "/otakudesu/batch/:slug",
    "/otakudesu/unlimited?page=1",
  ]});
});

app.listen(PORT, () => console.log("Server jalan di port " + PORT));
