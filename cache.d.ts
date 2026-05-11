export declare class Cache {
    private db;
    private ttl;
    constructor(dbFilePath?: string, ttl?: number);
    /**
     * Ambil cache
     * @param key Key cache
     * @param maxAgeSec TTL dalam detik (default 1 hari)
     * @returns Parsed JSON data atau null jika expired/tidak ada
     */
    get(key: string): any | null;
    /**
     * Set cache
     * @param key Key cache
     * @param data Data apapun yang bisa di-JSON stringify
     */
    set(key: string, data: any): void;
}
