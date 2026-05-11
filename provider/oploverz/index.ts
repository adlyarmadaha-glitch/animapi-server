import { Provider } from "../index.js";
import {
  SearchOptions, SearchResult, Anime, Genre, Stream, ProviderOptions, Episode
} from "../index.types.js";

export class Oploverz extends Provider {
  constructor(options?: ProviderOptions) {
    super("oploverz", {
      baseUrl: "https://oploverz.fans",
      cache: true,
      ...options,
    });
  }

  async search(options?: SearchOptions): Promise<SearchResult> {
    const { keyword, page = 1, status } = options?.filter || {};
    let url = `${this.baseUrl}/page/${page}/`;
    if (keyword) url = `${this.baseUrl}/?s=${encodeURIComponent(keyword)}&page=${page}`;
    const res = await this.api.get(url);
    const $ = this.cheerio.load(res.data);

    const animes: Anime[] = [];
    $("article.post, .listupd .bs, .listupd .bsx").each((_, el) => {
      const $el = $(el);
      const title = $el.find(".entry-title, .tt, h2 a").text().trim() ||
                    $el.find("a").attr("title")?.trim() || "";
      const link = $el.find("a").first().attr("href") || "";
      const posterUrl = $el.find("img").attr("src") || $el.find("img").attr("data-cfsrc") || "";
      const type = $el.find(".typez, .type").text().trim() || "TV";
      const episode = $el.find(".epx, .episode").text().trim() || null;
      const statusText = episode?.toLowerCase().includes("completed") ? "FINISHED" : "ONGOING";

      // Ambil slug dari URL
      const slugMatch = link.match(/(?:anime|episode)\/([^/]+)/);
      const slugFromLink = slugMatch ? slugMatch[1] : "";

      // Fallback title jika kosong
      const finalTitle = title || link.split("/").pop()?.replace(/-/g, " ") || "";

      if (finalTitle && posterUrl) {
        animes.push({
          slug: slugFromLink,
          title: finalTitle,
          posterUrl,
          status: status ? status : statusText,
          type,
          genres: [],
          episodes: [],
          batches: [],
          studios: [],
          producers: [],
          characterTypes: [],
          source: this.name,
        });
      }
    });

    const hasNext = $(".pagination .next, .hpage .r").length > 0;
    return { animes, hasNext };
  }

  async detail(slug: string): Promise<Anime | undefined> {
    const cached = this.cache.get(`detail-${this.name}-${slug}`);
    if (cached && this.options.cache) return cached;

    const res = await this.api.get(`${this.baseUrl}/anime/${slug}/`);
    const $ = this.cheerio.load(res.data);

    const title = $("h1.entry-title").text().trim();
    const posterUrl = $(".thumb img, .anmimg img").attr("src") || "";
    const synopsis = $(".sinopc p, .entry-content p").first().text().trim();

    const genres: Genre[] = [];
    $(".genxed a, .genre-info a").each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const gSlug = href.split("/genres/")[1]?.replace("/", "") || name.toLowerCase().replace(/\s+/g, '-');
      genres.push({ name, slug: gSlug, source: this.name });
    });

    const ratingText = $(".rating strong, .score").text().trim();
    const rating = parseFloat(ratingText) || 0;

    const episodes: Episode[] = [];
    $(".eplister li a, .episodelist li a").each((_, el) => {
      const $a = $(el);
      const name = $a.text().trim();
      const href = $a.attr("href") || "";
      const epSlug = href.split("/episode/")[1]?.replace("/", "").trim() || "";
      episodes.push({ name, slug: epSlug, source: this.name });
    });

    const data: Anime = {
      slug,
      title,
      posterUrl,
      synopsis,
      rating,
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
    const res = await this.api.get(`${this.baseUrl}/genres/`);
    const $ = this.cheerio.load(res.data);
    const genres: Genre[] = [];
    $(".genrelist a, .taxonomy-description a").each((_, el) => {
      const name = $(el).text().trim();
      const href = $(el).attr("href") || "";
      const slug = href.split("/genres/")[1]?.replace("/", "") || name.toLowerCase().replace(/\s+/g, '-');
      genres.push({ name, slug, source: this.name });
    });
    return genres;
  }

  async streams(slug: string): Promise<Stream[]> {
    const res = await this.api.get(`${this.baseUrl}/episode/${slug}/`);
    const $ = this.cheerio.load(res.data);
    const streams: Stream[] = [];

    // Stream dari mirror atau iframe
    $(".mirrorstream ul li a, iframe, .player-embed iframe").each((_, el) => {
      const $el = $(el);
      const url = $el.attr("src") || $el.attr("href") || $el.attr("data-url") || "";
      const name = $el.text().trim() || $el.attr("title") || "Stream";
      if (url && url.startsWith("http")) {
        streams.push({ name, url, source: this.name });
      }
    });

    // Jika ada link blogger video di dalam teks
    const pageText = res.data;
    const bloggerMatch = pageText.match(/https:\/\/www\.blogger\.com\/video\.g\?token=[^"'\s]+/g);
    if (bloggerMatch) {
      bloggerMatch.forEach(url => {
        streams.push({ name: "Google Video", url, source: this.name });
      });
    }

    return streams;
  }
}
