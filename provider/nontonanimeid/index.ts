import { Provider } from "../index.js";
import { SearchOptions, SearchResult, Anime, Genre, Stream, ProviderOptions, Episode } from "../index.types.js";
import axios from "axios";

export class NontonAnimeID extends Provider {
  constructor(options?: ProviderOptions) {
    super("nontonanimeid", {
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
    $(".animepost a, .listupd .bs a, .eplister a, article a").each((_, el) => {
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

    // Ambil halaman 1 dulu untuk dapat info jumlah episode
    const res = await this.api.get(`${this.baseUrl}/anime/${slug}/`).catch(() => ({ data: '' }));
    const $ = this.cheerio.load(res.data);

    const title = $("h1.entry-title").text().trim();
    const posterUrl = $(".thumb img").attr("src") || "";
    const synopsis = $(".sinopc p, .entry-content p").first().text().trim();

    // Genre
    const genres: Genre[] = [];
    $(".genxed a, .genre-info a").each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const gSlug = href.split("/genres/")[1]?.replace("/", "") || name.toLowerCase();
      genres.push({ name, slug: gSlug, source: this.name });
    });

    // Deteksi jumlah total episode dari pagination (misal: "Episode 1-100 dari 1150")
    let totalEpisodes = 0;
    const paginationText = $(".pagination, .ep-pagination, .pagenavix").text();
    const match = paginationText.match(/dari\s*(\d+)/i) || paginationText.match(/of\s*(\d+)/i) || paginationText.match(/(\d+)\s*episodes?/i);
    if (match) totalEpisodes = parseInt(match[1]);

    // Ambil episode dari halaman pertama
    const episodes: Episode[] = [];
    $(".eplister li a").each((_, el) => {
      const $a = $(el);
      const name = $a.text().trim();
      const href = $a.attr("href") || "";
      const epSlug = href.split("/episode/")[1]?.replace("/", "") || "";
      episodes.push({ name, slug: epSlug, source: this.name });
    });

    // Jika ada pagination, ambil halaman berikutnya untuk episode tambahan
    if (totalEpisodes > episodes.length) {
      const totalPages = Math.ceil(totalEpisodes / episodes.length || 20);
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
    }

    const data: Anime = {
      slug,
      title,
      posterUrl,
      synopsis,
      rating: 0,
      genres,
      episodes,
      batches: [],
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
    $(".downloads a, .mirrorstream ul li a, iframe").each((_, el) => {
      const url = $(el).attr("src") || $(el).attr("href") || "";
      const name = $(el).text().trim() || "Stream";
      if (url.startsWith("http")) streams.push({ name, url, source: this.name });
    });
    return streams;
  }
}
