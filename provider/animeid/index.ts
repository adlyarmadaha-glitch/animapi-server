import { Provider } from "../index.js";
import { SearchOptions, SearchResult, Anime, Genre, Stream, ProviderOptions, Episode } from "../index.types.js";
import axios from "axios";

export class AnimeID extends Provider {
  constructor(options?: ProviderOptions) {
    super("animeid", {
      baseUrl: "https://154.26.137.28",
      cache: true,
      ...options,
    });
    this.api = axios.create({
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
      timeout: 15000,
    });
  }

  async search(options?: SearchOptions): Promise<SearchResult> {
    const { keyword, page = 1 } = options?.filter || {};
    const res = await this.api.get(`${this.baseUrl}/page/${page}/`, {
      params: { s: keyword },
    }).catch(() => ({ data: '' }));
    const $ = this.cheerio.load(res.data);

    const slugs: string[] = [];
    $(".animepost a, .listupd .bs a, article a[href*='/anime/']").each((_, el) => {
      const href = $(el).attr("href");
      if (href) {
        const slug = href.split("/anime/")[1]?.replace("/", "").trim();
        if (slug) slugs.push(slug);
      }
    });

    const animes = (await Promise.all(
      slugs.map((slug) => this.limit(() => this.detail(slug)))
    )).filter((a): a is Anime => a !== undefined);

    const hasNext = $(".pagination .next, .hpage .r").length > 0;
    return { animes, hasNext };
  }

  async detail(slug: string): Promise<Anime | undefined> {
    const cached = this.cache.get(`detail-${this.name}-${slug}`);
    if (cached && this.options.cache) return cached;

    const res = await this.api.get(`${this.baseUrl}/anime/${slug}/`).catch(() => ({ data: '' }));
    const $ = this.cheerio.load(res.data);

    const title = $("h1.entry-title").text().trim();
    const posterUrl = $(".thumb img").attr("src") || "";
    const synopsis = $(".sinopc p, .entry-content p").first().text().trim();

    const genres: Genre[] = [];
    $(".genxed a, .genre-info a").each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const gSlug = href.split("/genres/")[1]?.replace("/", "") || name.toLowerCase();
      genres.push({ name, slug: gSlug, source: this.name });
    });

    // Ambil episode dari halaman pertama
    const episodes: Episode[] = [];
    $(".eplister li a").each((_, el) => {
      const $a = $(el);
      const name = $a.text().trim();
      const href = $a.attr("href") || "";
      const epSlug = href.split("/episode/")[1]?.replace("/", "") || "";
      episodes.push({ name, slug: epSlug, source: this.name });
    });

    // Deteksi total halaman dari pagination
    const pageLinks = $(".pagination .page-numbers:not(.next):not(.prev)");
    const totalPages = pageLinks.length > 0 ? Math.max(...pageLinks.map((_: number, el: any) => parseInt($(el).text()) || 0).get()) : 1;

    // Ambil episode dari halaman berikutnya
    for (let p = 2; p <= totalPages; p++) {
      try {
        const pageRes = await this.api.get(`${this.baseUrl}/anime/${slug}/page/${p}/`).catch(() => ({ data: '' }));
        const $page = this.cheerio.load(pageRes.data);
        $page(".eplister li a").each((_, el) => {
          const $a = $page(el);
          const name = $a.text().trim();
          const href = $a.attr("href") || "";
          const epSlug = href.split("/episode/")[1]?.replace("/", "") || "";
          episodes.push({ name, slug: epSlug, source: this.name });
        });
      } catch {}
    }

    const data: Anime = {
      slug, title, posterUrl, synopsis,
      rating: 0, genres, episodes, batches: [],
      status: "UNKNOWN", type: "TV", studios: [], producers: [], characterTypes: [],
      source: this.name,
    };

    if (this.options.cache) this.cache.set(`detail-${this.name}-${slug}`, data);
    return data;
  }

  async genres(): Promise<Genre[]> {
    const res = await this.api.get(`${this.baseUrl}/genres/`).catch(() => ({ data: '' }));
    const $ = this.cheerio.load(res.data);
    const genres: Genre[] = [];
    $(".genrelist a, .taxonomy-description a").each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const slug = href.split("/genres/")[1]?.replace("/", "") || name.toLowerCase();
      genres.push({ name, slug, source: this.name });
    });
    return genres;
  }

  async streams(slug: string): Promise<Stream[]> {
    const res = await this.api.get(`${this.baseUrl}/episode/${slug}/`).catch(() => ({ data: '' }));
    const $ = this.cheerio.load(res.data);
    const streams: Stream[] = [];

    // Cari link MP4/m3u8/embed
    $("a[href*='mp4'], a[href*='m3u8'], a[href*='.mkv'], a[href*='.avi'], iframe").each((_, el) => {
      const $el = $(el);
      const url = $el.attr("src") || $el.attr("href") || "";
      const name = $el.text().trim() || $el.attr("title") || "Stream";
      if (url && (url.includes(".mp4") || url.includes("m3u8") || url.includes("embed") || url.includes("video"))) {
        streams.push({ name, url, source: this.name });
      }
    });

    // Fallback ke mirror/download
    if (streams.length === 0) {
      $(".mirrorstream ul li a, .downloads a").each((_, el) => {
        const url = $(el).attr("href") || "";
        const name = $(el).text().trim() || "Stream";
        if (url.startsWith("http")) streams.push({ name, url, source: this.name });
      });
    }

    return streams;
  }
}
