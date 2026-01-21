/**
 * IndexedDB wrapper for caching large JSON data
 * Provides async storage with better performance than localStorage for large datasets
 */

const DB_NAME = "VulnDataCache";
const DB_VERSION = 1;
const STORE_NAME = "dataStore";
const DATA_KEY = "vulnerabilityData";

interface CachedData {
    key: string;
    data: unknown;
    timestamp: number;
    version: string;
    size: number;
}

class IndexedDBCache {
    private dbPromise: Promise<IDBDatabase> | null = null;

    private openDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                reject(new Error("Failed to open IndexedDB"));
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: "key" });
                }
            };
        });

        return this.dbPromise;
    }

    async set(data: unknown): Promise<boolean> {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);

            const cached: CachedData = {
                key: DATA_KEY,
                data,
                timestamp: Date.now(),
                version: "1.0",
                size: JSON.stringify(data).length,
            };

            return new Promise((resolve, reject) => {
                const request = store.put(cached);
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(new Error("Failed to store data"));
            });
        } catch (error) {
            console.error("IndexedDB set error:", error);
            return false;
        }
    }

    async get(): Promise<CachedData | null> {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);

            return new Promise((resolve, reject) => {
                const request = store.get(DATA_KEY);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(new Error("Failed to retrieve data"));
            });
        } catch (error) {
            console.error("IndexedDB get error:", error);
            return null;
        }
    }

    async clear(): Promise<boolean> {
        try {
            const db = await this.openDB();
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);

            return new Promise((resolve, reject) => {
                const request = store.delete(DATA_KEY);
                request.onsuccess = () => resolve(true);
                request.onerror = () => reject(new Error("Failed to clear data"));
            });
        } catch (error) {
            console.error("IndexedDB clear error:", error);
            return false;
        }
    }

    async getInfo(): Promise<{
        exists: boolean;
        timestamp?: number;
        age?: number;
        sizeKB?: string;
        sizeMB?: string;
    } | null> {
        try {
            const cached = await this.get();
            if (!cached) return { exists: false };

            const age = Date.now() - cached.timestamp;
            return {
                exists: true,
                timestamp: cached.timestamp,
                age,
                sizeKB: (cached.size / 1024).toFixed(2),
                sizeMB: (cached.size / (1024 * 1024)).toFixed(2),
            };
        } catch (error) {
            console.error("IndexedDB getInfo error:", error);
            return null;
        }
    }
}

export const indexedDBCache = new IndexedDBCache();

// Check if IndexedDB is available
export const isIndexedDBAvailable = (): boolean => {
    try {
        return typeof indexedDB !== "undefined";
    } catch {
        return false;
    }
};
