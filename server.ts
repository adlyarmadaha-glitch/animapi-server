import express from "express";
import cors from "cors";
import { Otakudesu } from "./index.js";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const otakudesu = new Otakudesu();

app.get("/", (req, res) => {
  res.json({ message: "Animapi REST API" });
});

app.get("/otakudesu/ongoing", async (req, res) => {
  try { res.json(await otakudesu.search({ filter: { status: "Ongoing" } } as any)); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/otakudesu/complete", async (req, res) => {
  try { res.json(await otakudesu.search({ filter: { status: "Completed" } } as any)); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/otakudesu/search", async (req, res) => {
  try { res.json(await otakudesu.search({ filter: { keyword: req.query.q as string } })); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/otakudesu/anime/:slug", async (req, res) => {
  try { res.json(await otakudesu.detail(req.params.slug)); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/otakudesu/episode/:slug", async (req, res) => {
  try { res.json(await otakudesu.streams(req.params.slug)); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.get("/otakudesu/genre", async (req, res) => {
  try { res.json(await otakudesu.genres()); }
  catch(e:any){ res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => console.log("Server jalan di port " + PORT));
