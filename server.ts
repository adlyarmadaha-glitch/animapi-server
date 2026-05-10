import express from "express";
import cors from "cors";
import { Otakudesu, Animasu, AnimeIndo } from "./index.js";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const otakudesu = new Otakudesu();

// HOME
app.get("/otakudesu/home", async (req, res) => {
  try { res.json(await otakudesu.search({ filter: { keyword: "" } })); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ONGOING
app.get("/otakudesu/ongoing", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    res.json(await otakudesu.search({ filter: { keyword: "" }, page }));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// COMPLETE
app.get("/otakudesu/complete", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    res.json(await otakudesu.search({ filter: { keyword: "" }, page }));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// SEARCH
app.get("/otakudesu/search", async (req, res) => {
  try { res.json(await otakudesu.search({ filter: { keyword: req.query.q as string } })); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DETAIL ANIME
app.get("/otakudesu/anime/:slug", async (req, res) => {
  try { res.json(await otakudesu.detail(req.params.slug)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// EPISODE
app.get("/otakudesu/episode/:slug", async (req, res) => {
  try { res.json(await otakudesu.streams(req.params.slug)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GENRE LIST
app.get("/otakudesu/genre", async (req, res) => {
  try { res.json(await otakudesu.genres()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GENRE DETAIL
app.get("/otakudesu/genre/:slug", async (req, res) => {
  try { res.json(await otakudesu.search({ filter: { keyword: req.params.slug } })); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/", (req, res) => {
  res.json({ message: "Animapi REST API", endpoints: [
    "/otakudesu/home",
    "/otakudesu/ongoing?page=1",
    "/otakudesu/complete?page=1",
    "/otakudesu/search?q=keyword",
    "/otakudesu/anime/:slug",
    "/otakudesu/episode/:slug",
    "/otakudesu/genre",
    "/otakudesu/genre/:slug",
  ]});
});

app.listen(PORT, () => console.log("Server jalan di port " + PORT));
