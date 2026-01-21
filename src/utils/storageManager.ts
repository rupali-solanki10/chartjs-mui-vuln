/**
 * Smart storage manager that automatically chooses between LocalStorage and IndexedDB
 * based on data size and browser support
 */

import { indexedDBCache, isIndexedDBAvailable } from "./indexedDBCache";

const CACHE_KEY = "vuln_data_cache";
const CACHE_TIMESTAMP_KEY = "vuln_data_timestamp";
const CACHE_VERSION_KEY = "vuln_cache_version";
const CURRENT_VERSION = "1.0";
const CACHE_DURATION = 3600000; // 1 hour
const LOCALSTORAGE_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB threshold

export interface CacheInfo {
    exists: boolean;
    source?: "localStorage" | "indexedDB";
    timestamp?: number;
    age?: number;
    ageMinutes?: number;
    sizeKB?: string;
    sizeMB?: string;
    isValid?: boolean;
    version?: string;
}

/**
 * Dual-layer caching with automatic storage selection
 */
class StorageManager {
    /**
     * Save data using the most appropriate storage mechanism
     */
    async saveData(data: unknown): Promise<boolean> {
        const dataStr = JSON.stringify(data);
        const dataSize = dataStr.length;
        const timestamp = Date.now();

        console.log(`💾 Saving data (${(dataSize / 1024).toFixed(2)} KB)...`);

        // Try IndexedDB first for large data or if localStorage fails
        if (isIndexedDBAvailable() && dataSize > LOCALSTORAGE_SIZE_LIMIT) {
            console.log("📦 Using IndexedDB for large dataset");
            const success = await indexedDBCache.set(data);
            if (success) {
                // Store metadata in localStorage for quick access
                this.saveMetadata(timestamp, "indexedDB", dataSize);
                console.log("✅ Saved to IndexedDB");
                return true;
            }
        }

        // Try LocalStorage for smaller data
        try {
            localStorage.setItem(CACHE_KEY, dataStr);
            this.saveMetadata(timestamp, "localStorage", dataSize);
            console.log("✅ Saved to LocalStorage");
            return true;
        } catch (error) {
            console.warn("⚠️ LocalStorage failed, trying IndexedDB:", error);

            // Fallback to IndexedDB
            if (isIndexedDBAvailable()) {
                const success = await indexedDBCache.set(data);
                if (success) {
                    this.saveMetadata(timestamp, "indexedDB", dataSize);
                    console.log("✅ Saved to IndexedDB (fallback)");
                    return true;
                }
            }
        }

        console.error("❌ Failed to save data to any storage");
        return false;
    }

    /**
     * Load data from any available storage
     */
    async loadData(): Promise<{
        data: unknown | null;
        source: "localStorage" | "indexedDB" | null;
        timestamp: number | null;
    }> {
        // Check metadata first to know where to look
        const metadata = this.getMetadata();

        if (!metadata.timestamp) {
            return { data: null, source: null, timestamp: null };
        }

        // Try the stored source first
        if (metadata.source === "indexedDB" && isIndexedDBAvailable()) {
            const cached = await indexedDBCache.get();
            if (cached) {
                console.log("✅ Loaded from IndexedDB");
                return {
                    data: cached.data,
                    source: "indexedDB",
                    timestamp: cached.timestamp,
                };
            }
        }

        // Try LocalStorage
        try {
            const dataStr = localStorage.getItem(CACHE_KEY);
            if (dataStr) {
                console.log("✅ Loaded from LocalStorage");
                return {
                    data: JSON.parse(dataStr),
                    source: "localStorage",
                    timestamp: metadata.timestamp,
                };
            }
        } catch (error) {
            console.warn("⚠️ LocalStorage read failed:", error);
        }

        // Fallback: try IndexedDB if not already tried
        if (metadata.source !== "indexedDB" && isIndexedDBAvailable()) {
            const cached = await indexedDBCache.get();
            if (cached) {
                console.log("✅ Loaded from IndexedDB (fallback)");
                return {
                    data: cached.data,
                    source: "indexedDB",
                    timestamp: cached.timestamp,
                };
            }
        }

        return { data: null, source: null, timestamp: null };
    }

    /**
     * Check if cache is valid (fresh)
     */
    isCacheValid(timestamp: number | null): boolean {
        if (!timestamp) return false;
        const age = Date.now() - timestamp;
        return age < CACHE_DURATION;
    }

    /**
     * Get cache information
     */
    async getCacheInfo(): Promise<CacheInfo> {
        const metadata = this.getMetadata();

        if (!metadata.timestamp) {
            return { exists: false };
        }

        const age = Date.now() - metadata.timestamp;
        const ageMinutes = Math.floor(age / 60000);

        // Try to get size info from actual storage
        let sizeInfo = { sizeKB: "0", sizeMB: "0" };

        if (metadata.source === "indexedDB" && isIndexedDBAvailable()) {
            const info = await indexedDBCache.getInfo();
            if (info && info.exists) {
                sizeInfo = {
                    sizeKB: info.sizeKB || "0",
                    sizeMB: info.sizeMB || "0",
                };
            }
        } else if (metadata.source === "localStorage") {
            try {
                const data = localStorage.getItem(CACHE_KEY);
                if (data) {
                    const size = data.length;
                    sizeInfo = {
                        sizeKB: (size / 1024).toFixed(2),
                        sizeMB: (size / (1024 * 1024)).toFixed(2),
                    };
                }
            } catch {
                // Ignore errors
            }
        }

        return {
            exists: true,
            source: metadata.source || undefined,
            timestamp: metadata.timestamp || undefined,
            age,
            ageMinutes,
            ...sizeInfo,
            isValid: age < CACHE_DURATION,
            version: metadata.version || undefined,
        };
    }

    /**
     * Clear all cached data
     */
    async clearCache(): Promise<boolean> {
        console.log("🗑️ Clearing cache...");

        let success = true;

        // Clear LocalStorage
        try {
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(CACHE_TIMESTAMP_KEY);
            localStorage.removeItem(CACHE_VERSION_KEY);
            localStorage.removeItem("vuln_cache_source");
        } catch (error) {
            console.error("Failed to clear LocalStorage:", error);
            success = false;
        }

        // Clear IndexedDB
        if (isIndexedDBAvailable()) {
            const idbSuccess = await indexedDBCache.clear();
            if (!idbSuccess) success = false;
        }

        if (success) {
            console.log("✅ Cache cleared");
        } else {
            console.warn("⚠️ Cache partially cleared");
        }

        return success;
    }

    /**
     * Save metadata about cached data
     */
    private saveMetadata(
        timestamp: number,
        source: "localStorage" | "indexedDB",
        size: number
    ): void {
        try {
            localStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString());
            localStorage.setItem(CACHE_VERSION_KEY, CURRENT_VERSION);
            localStorage.setItem("vuln_cache_source", source);
            localStorage.setItem("vuln_cache_size", size.toString());
        } catch (error) {
            console.warn("Failed to save metadata:", error);
        }
    }

    /**
     * Get metadata about cached data
     */
    private getMetadata(): {
        timestamp: number | null;
        source: "localStorage" | "indexedDB" | null;
        version: string | null;
        size: number | null;
    } {
        try {
            const timestampStr = localStorage.getItem(CACHE_TIMESTAMP_KEY);
            const source = localStorage.getItem("vuln_cache_source");
            const version = localStorage.getItem(CACHE_VERSION_KEY);
            const sizeStr = localStorage.getItem("vuln_cache_size");

            return {
                timestamp: timestampStr ? parseInt(timestampStr, 10) : null,
                source: source as "localStorage" | "indexedDB" | null,
                version,
                size: sizeStr ? parseInt(sizeStr, 10) : null,
            };
        } catch {
            return {
                timestamp: null,
                source: null,
                version: null,
                size: null,
            };
        }
    }
}

export const storageManager = new StorageManager();

// Export convenience functions
export const saveToCache = (data: unknown) => storageManager.saveData(data);
export const loadFromCache = () => storageManager.loadData();
export const getCacheInfo = () => storageManager.getCacheInfo();
export const clearCache = () => storageManager.clearCache();
export const isCacheValid = (timestamp: number | null) =>
    storageManager.isCacheValid(timestamp);
