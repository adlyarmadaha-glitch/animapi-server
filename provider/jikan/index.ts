import { Provider } from "../index.js";
import { Anime, Genre, Stream, SearchResult } from "../index.types.js";

export class Jikan extends Provider {
  constructor() {
    super("jikan", {
      baseUrl: "https://api.jikan.moe/v4",
      cache: true,
    });
  }

  async search(options?: any): Promise<SearchResult> {
    const { keyword, page = 1, status, genres } = options?.filter || {};
    if (!keyword && !genres && !status) return { animes: [], hasNext: false };

    let url = `${this.baseUrl}/anime`;
    const params: any = { page, limit: 15 };

    if (keyword) params.q = keyword;
    if (genres && genres.length > 0) params.genres = genres.join(',');
    if (status === 'Ongoing') params.status = 'airing';
    else if (status === 'Completed') params.status = 'complete';

    try {
      const res = await this.api.get(url, { params });
      const animes: Anime[] = (res.data.data || []).map((item: any) => ({
        slug: `jikan-${item.mal_id}`,
        title: item.title,
        posterUrl: item.images?.jpg?.image_url || '',
        synopsis: item.synopsis || '',
        rating: item.score || 0,
        genres: (item.genres || []).map((g: any) => ({ name: g.name, slug: g.name.toLowerCase().replace(/\s+/g, '-'), source: this.name })),
        episodes: [{ name: 'Episode 1', slug: `jikan-${item.mal_id}-ep-1`, source: this.name }],
        batches: [],
        status: item.status === 'Airing' ? 'ONGOING' : 'FINISHED',
        type: item.type || 'TV',
        studios: (item.studios || []).map((s: any) => s.name),
        producers: (item.producers || []).map((p: any) => p.name),
        characterTypes: [],
        source: this.name,
      }));
      return { animes, hasNext: res.data.pagination?.has_next_page || false };
    } catch {
      return { animes: [], hasNext: false };
    }
  }

  async detail(slug: string): Promise<Anime | undefined> {
    const malId = slug.replace('jikan-', '').split('-')[0];
    try {
      const res = await this.api.get(`${this.baseUrl}/anime/${malId}/full`);
      const item = res.data.data;
      if (!item) return undefined;
      return {
        slug: `jikan-${item.mal_id}`,
        title: item.title,
        titleAlt: item.title_japanese,
        posterUrl: item.images?.jpg?.large_image_url || '',
        synopsis: item.synopsis || '',
        rating: item.score || 0,
        genres: (item.genres || []).map((g: any) => ({ name: g.name, slug: g.name.toLowerCase().replace(/\s+/g, '-'), source: this.name })),
        episodes: (item.episodes || []).map((_: any, i: number) => ({ name: `Episode ${i+1}`, slug: `jikan-${item.mal_id}-ep-${i+1}`, source: this.name })),
        batches: [],
        status: item.status === 'Airing' ? 'ONGOING' : 'FINISHED',
        type: item.type || 'TV',
        studios: (item.studios || []).map((s: any) => s.name),
        producers: (item.producers || []).map((p: any) => p.name),
        characterTypes: [],
        source: this.name,
      };
    } catch {
      return undefined;
    }
  }

  async genres(): Promise<Genre[]> {
    try {
      const res = await this.api.get(`${this.baseUrl}/genres/anime`);
      return (res.data.data || []).map((g: any) => ({
        name: g.name,
        slug: g.name.toLowerCase().replace(/\s+/g, '-'),
        source: this.name,
      }));
    } catch {
      return [];
    }
  }

  async streams(_slug: string): Promise<Stream[]> {
    return []; // Jikan tidak menyediakan streaming
  }
}
