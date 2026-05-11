import { Provider } from "../index.js";
import { SearchOptions, SearchResult, Anime, Genre, Stream, ProviderOptions } from "../index.types.js";
export declare class AnimeIndo extends Provider {
    constructor(options?: ProviderOptions);
    search(options?: SearchOptions): Promise<SearchResult>;
    detail(slug: string): Promise<Anime | undefined>;
    genres(): Promise<Genre[]>;
    streams(slug: string): Promise<Stream[]>;
}
