export type Status = "FINISHED" | "ONGOING" | "UPCOMING" | "UNKNOWN";

export interface Anime {
  slug: string;
  title: string;
  titleAlt?: string;
  posterUrl: string;
  synopsis?: string;
  rating?: number;
  genres: Genre[];
  episodes: Episode[];
  batches: Batch[];
  status: Status;
  type?: string;
  studios: string[];
  producers: string[];
  characterTypes: CharacterType[];
  source: string;
  aired?: string;
  duration?: string;
  season?: string;
}

export interface Episode {
  name: string;
  slug: string;
  source: string;
}

export interface Batch {
  name: string;
  url: string;
  resolution?: string;
  source: string;
}

export interface Genre {
  name: string;
  slug: string;
  source: string;
}

export interface Stream {
  name: string;
  url: string;
  source: string;
}

export interface CharacterType {
  name: string;
  slug: string;
  source: string;
}

export interface ProviderOptions {
  baseUrl?: string;
  cache?: boolean;
}

export interface SearchResult {
  animes: Anime[];
  hasNext: boolean;
}

export interface SearchFilter {
  keyword?: string;
  page?: number;
  status?: string;
  genres?: string[];
  [key: string]: any;
}

export interface SearchOptions {
  filter?: SearchFilter;
}
