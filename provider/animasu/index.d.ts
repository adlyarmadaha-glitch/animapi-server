import { Provider } from "../index.js";
import { Anime, Genre, ProviderOptions, SearchOptions, SearchResult, Stream } from "../index.types.js";
export declare class Animasu extends Provider {
    constructor(options?: ProviderOptions);
    search(options?: SearchOptions): Promise<SearchResult>;
    detail(slug: string): Promise<Anime | undefined>;
    genres(): Promise<Genre[]>;
    streams(slug: string): Promise<Stream[]>;
    private findByDay;
    private findByAlphabet;
}
