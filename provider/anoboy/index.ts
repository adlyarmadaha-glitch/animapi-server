import { Provider } from "../index.js";
import {
  SearchOptions, SearchResult, Anime, Genre, Stream, ProviderOptions, Episode, Batch
} from "../index.types.js";

export class Anoboy extends Provider {
  constructor(options?: ProviderOptions) {
    super("anoboy", {
      baseUrl: "https://anoboy.be",
      cache: true,
      ...options,
    });
  }

  async search(options?: SearchOptions): Promise<SearchResult> {
    const { keyword, page = 1 } = options?.filter || {};
    let url = `${this.baseUrl}/page/${page}/`;
    if (keyword) {
      url = `${this.baseUrl}/?s=${encodeURIComponent(keyword)}&page=${page}`;
    }
    const res = await this.api.get(url);
    const $ = this.cheerio.load(res.data);

    const slugs: string[] = [];
    $("article.post .content-thumb img").each((_, el) => {
      const parent = $(el).closest("a");
      const href = parent.attr("href");
      if (href) {
        const slug = href.split("/").filter(Boolean).pop() || "";
        slugs.push(slug);
      }
    });

    const animes = (await Promise.all(
      slugs.map(slug => this.limit(() => this.detail(slug)).catch(() => undefined))
    )).filter((a): a is Anime => a !== undefined);

    const hasNext = $(".pagination .next").length > 0;
    return { animes, hasNext };
  }

  async detail(slug: string): Promise<Anime | undefined> {
    const cached = this.cache.get(`detail-${this.name}-${slug}`);
    if (cached && this.options.cache) return cached;

    const res = await this.api.get(`${this.baseUrl}/${slug}/`);
    const $ = this.cheerio.load(res.data);

    const title = $("h1.entry-title").text().trim();
    const posterUrl = $(".content-thumb img").attr("src") || "";

    const genres: Genre[] = [];
    $(".genre-info a, .genre a").each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const gSlug = href.split("/genres/")[1]?.replace("/", "") || name.toLowerCase();
      genres.push({ name, slug: gSlug, source: this.name });
    });

    const synopsis = $(".entry-content p").first().text().trim();

    const episodes: Episode[] = [];
    $(".eplist li a, .episodelist li a").each((_, el) => {
      const $a = $(el);
      const name = $a.text().trim();
      const href = $a.attr("href") || "";
      const epSlug = href.split("/episode/")[1]?.replace("/", "") || "";
      episodes.push({ name, slug: epSlug, source: this.name });
    });

    const batches: Batch[] = [];
    const data: Anime = {
      slug,
      title,
      posterUrl,
      synopsis,
      rating: 0,
      genres,
      episodes,
      batches,
      status: "UNKNOWN",
      type: "TV",
      studios: [],
      producers: [],
      characterTypes: [],
      source: this.name,
    };

    if (this.options.cache) this.cache.set(`detail-${this.name}-${slug}`, data);
    return data;
  }

  async genres(): Promise<Genre[]> {
    const res = await this.api.get(`${this.baseUrl}/genres/`);
    const $ = this.cheerio.load(res.data);
    const genres: Genre[] = [];
    $(".genre-list a, .taxonomy-description a").each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const slug = href.split("/genres/")[1]?.replace("/", "") || name.toLowerCase();
      genres.push({ name, slug, source: this.name });
    });
    return genres;
  }

  async streams(slug: string): Promise<Stream[]> {
    const res = await this.api.get(`${this.baseUrl}/${slug}/`);
    const $ = this.cheerio.load(res.data);
    const streams: Stream[] = [];

    // Ambil dari iframe atau mirror
    $("iframe, .mirrorstream ul li a").each((_, el) => {
      const $el = $(el);
      const url = $el.attr("src") || $el.attr("href") || $el.attr("data-url") || "";
      const name = $el.text().trim() || "Stream";
      if (url) {
        streams.push({ name, url, source: this.name });
      }
    });

    return streams;
  }
}
