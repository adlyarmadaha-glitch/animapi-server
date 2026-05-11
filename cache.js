class Cache {
  constructor(_filePath, ttl = 3600) {
    this.store = new Map();
    this.ttl = ttl;
  }
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > this.ttl * 1000) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }
  set(key, data) {
    this.store.set(key, { data, time: Date.now() });
  }
}
module.exports = { Cache };
