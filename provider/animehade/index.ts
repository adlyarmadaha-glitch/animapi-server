
import { Provider } from "../index.js";
import { SearchOptions, SearchResult, Anime, Genre, Stream, ProviderOptions, Episode } from "../index.types.js";
import axios from "axios";

export class Animehade extends Provider {
  constructor(options?: ProviderOptions) {
    super("animehade", {
      baseUrl: "https://animehade.com",
      cache: true,
      ...options,
    });
    // Bypass SSL jika diperlukan
    this.api = axios.create({
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      timeout: 15000,
    });
  }

  async search(options?: SearchOptions): Promise<SearchResult> {
    const { keyword, page = 1 } = options?.filter || {};
    try {
      const res = await this.api.get(`${this.baseUrl}/page/${page}/`, {
        params: { s: keyword },
      });
      const $ = this.cheerio.load(res.data);
      const slugs = [];
      $(".animepost a, .listupd .bs a, article a[href*='/anime/']").each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          const slug = href.split("/anime/")[1]?.replace("/", "").trim();
          if (slug) slugs.push(slug);
        }
      });
      const animes = (await Promise.all(
        slugs.map(slug => this.limit(() => this.detail(slug)))
      )).filter(a => a !== undefined);
      const hasNext = $(".pagination .next, .hpage .r").length > 0;
      return { animes, hasNext };
    } catch {
      return { animes: [], hasNext: false };
    }
  }

  async detail(slug: string): Promise<Anime | undefined> {
    const cached = this.cache.get(`detail-${this.name}-${slug}`);
    if (cached && this.options.cache) return cached;
    try {
      const res = await this.api.get(`${this.baseUrl}/anime/${slug}/`);
      const $ = this.cheerio.load(res.data);
      const title = $("h1.entry-title").text().trim();
      const posterUrl = $(".thumb img").attr("src") || "";
      const synopsis = $(".sinopc p, .entry-content p").first().text().trim();
      const genres = [];
      $(".genxed a, .genre-info a").each((_, el) => {
        const name = $(el).text().trim();
        const href = $(el).attr("href") || "";
        const gSlug = href.split("/genres/")[1]?.replace("/", "") || name.toLowerCase();
        genres.push({ name, slug: gSlug, source: this.name });
      });
      const episodes = [];
      $(".eplister li a").each((_, el) => {
        const $a = $(el);
        const name = $a.text().trim();
        const href = $a.attr("href") || "";
        const epSlug = href.split("/episode/")[1]?.replace("/", "") || "";
        episodes.push({ name, slug: epSlug, source: this.name });
      });
      const data = {
        slug, title, posterUrl, synopsis, rating: 0, genres, episodes, batches: [],
        status: "UNKNOWN", type: "TV", studios: [], producers: [], characterTypes: [],
        source: this.name,
      };
      if (this.options.cache) this.cache.set(`detail-${this.name}-${slug}`, data);
      return data;
    } catch {
      return undefined;
    }
  }

  async genres(): Promise<Genre[]> {
    try {
      const res = await this.api.get(`${this.baseUrl}/genres/`);
      const $ = this.cheerio.load(res.data);
      const genres = [];
      $(".genrelist a, .taxonomy-description a").each((_, el) => {
        const name = $(el).text().trim();
        const href = $(el).attr("href") || "";
        const slug = href.split("/genres/")[1]?.replace("/", "") || name.toLowerCase();
        genres.push({ name, slug, source: this.name });
      });
      return genres;
    } catch {
      return [];
    }
  }

  async streams(slug: string): Promise<Stream[]> {
    try {
      const res = await this.api.get(`${this.baseUrl}/episode/${slug}/`);
      const $ = this.cheerio.load(res.data);
      const streams = [];
      $(".mirrorstream ul li a, .downloads a, iframe").each((_, el) => {
        const url = $(el).attr("src") || $(el).attr("href") || "";
        const name = $(el).text().trim() || "Stream";
        if (url && url.startsWith("http")) {
          streams.push({ name, url, source: this.name });
        }
      });
      return streams;
    } catch {
      return [];
    }
  }
}
