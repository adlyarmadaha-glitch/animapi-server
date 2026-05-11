export type DAY_ID = "senin" | "selasa" | "rabu" | "kamis" | "jumat" | "sabtu" | "minggu" | "random";
export declare const dayMap: Record<string, string>;
export declare function convertDay(day: string): string;
