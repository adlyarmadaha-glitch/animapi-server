export class Cache {
  private store = new Map<string, any>();
  private ttl: number;

  constructor(_dbFilePath?: string, ttl = 60 * 60) {
    this.ttl = ttl;
  }

  get(key: string): any | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > this.ttl * 1000) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: any) {
    this.store.set(key, { data, time: Date.now() });
  }
}
