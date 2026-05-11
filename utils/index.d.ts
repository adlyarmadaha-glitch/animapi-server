export * from "./date-converter.js";
export * from "./day-converter.js";
export declare function hasNextPageAndGet<T>(data: T[], page?: number, perPage?: number): {
    data: T[];
    hasNext: boolean;
};
