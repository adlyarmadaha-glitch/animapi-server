import express from "express";
import cors from "cors";
import { Otakudesu, Animasu, AnimeIndo } from "./index.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const otakudesu = new Otakudesu();
const animasu = new Animasu();
const animeindo = new AnimeIndo();

app.get("/", (req, res) => {
  res.json({ message: "Animapi REST API v1", endpoints: [
    "/otakudesu/search?q=",
    "/otakudesu/detail/:slug",
    "/otakudesu/genres",
    "/otakudesu/streams/:slug",
    "/animasu/search?q=",
    "/animasu/detail/:slug",
    "/animeindo/search?q=",
    "/animeindo/detail/:slug",
  ]});
});

app.get("/otakudesu/search", async (req, res) => {
  try { res.json(await otakudesu.search({ filter: { keyword: req.query.q as string } })); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/otakudesu/detail/:slug", async (req, res) => {
  try { res.json(await otakudesu.detail(req.params.slug)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/otakudesu/genres", async (req, res) => {
  try { res.json(await otakudesu.genres()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/otakudesu/streams/:slug", async (req, res) => {
  try { res.json(await otakudesu.streams(req.params.slug)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/animasu/search", async (req, res) => {
  try { res.json(await animasu.search({ filter: { keyword: req.query.q as string } })); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/animasu/detail/:slug", async (req, res) => {
  try { res.json(await animasu.detail(req.params.slug)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/animeindo/search", async (req, res) => {
  try { res.json(await animeindo.search({ filter: { keyword: req.query.q as string } })); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/animeindo/detail/:slug", async (req, res) => {
  try { res.json(await animeindo.detail(req.params.slug)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log("Server jalan di port " + PORT));
