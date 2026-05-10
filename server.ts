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
  res.json({ message: "Animapi REST API v1", routes: ["/otakudesu/search?q=", "/otakudesu/latest", "/animasu/search?q=", "/animasu/latest", "/animeindo/search?q=", "/animeindo/latest"] });
});

app.get("/otakudesu/search", async (req, res) => {
  try { res.json(await otakudesu.search({ filter: { keyword: req.query.q as string } })); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/otakudesu/latest", async (req, res) => {
  try { res.json(await otakudesu.search()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/animasu/search", async (req, res) => {
  try { res.json(await animasu.search({ filter: { keyword: req.query.q as string } })); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/animasu/latest", async (req, res) => {
  try { res.json(await animasu.search()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/animeindo/search", async (req, res) => {
  try { res.json(await animeindo.search({ filter: { keyword: req.query.q as string } })); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/animeindo/latest", async (req, res) => {
  try { res.json(await animeindo.search()); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log("Server jalan di port " + PORT));
