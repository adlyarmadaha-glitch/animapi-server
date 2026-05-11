import { AxiosStatic } from "axios";
import { Cache } from "../cache.js";
import { Anime, Genre, ProviderOptions, SearchOptions, SearchResult, Stream } from "./index.types.js";
import * as cheerio from "cheerio";
import { LimitFunction } from "p-limit";
export declare abstract class Provider {
    readonly name: string;
    options: ProviderOptions;
    protected cache: Cache;
    protected api: AxiosStatic;
    protected cheerio: typeof cheerio;
    protected limit: LimitFunction;
    protected baseUrl: string;
    constructor(name: string, options: ProviderOptions);
    abstract search(options?: SearchOptions): Promise<SearchResult>;
    abstract detail(slug: string): Promise<Anime | undefined>;
    abstract genres(): Promise<Genre[]>;
    abstract streams(slug: string): Promise<Stream[]>;
}
