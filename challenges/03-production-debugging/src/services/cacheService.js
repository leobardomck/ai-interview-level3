'use strict';

class CacheService {
  constructor() {
    this.store = new Map();
    this.defaultTTL = 60000;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, ttl) {
    const effectiveTTL = ttl || this.defaultTTL;
    const entry = {
      value: value,
      expiresAt: Date.now() + effectiveTTL,
    };

    this.store.set(key, entry);

    setTimeout(function () {
      this.store.delete(key);
    }, effectiveTTL);
  }

  has(key) {
    const value = this.get(key);
    return value !== null;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }
}

module.exports = new CacheService();
