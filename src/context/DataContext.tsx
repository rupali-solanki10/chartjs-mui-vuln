import { createContext, useContext, useMemo, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Vulnerability, Image } from "../types";
import { getFirstImage } from "../utils/dataUtils";
import {
  loadFromCache,
  saveToCache,
  isCacheValid,
} from "../utils/storageManager";

type DataContextType = {
  raw: unknown;
  firstImage?: Image | null;
  getVulnByCve: (cve: string) => Vulnerability | undefined;
  loading: boolean;
  error?: string | null;
  loadingProgress?: number;
  cacheSource?: "localStorage" | "indexedDB" | null;
  /**
   * Efficiently filter vulnerabilities using precomputed indices. Accepts the same
   * shape as FilterControls.FilterState (severity, owner, kaiStatus, text).
   */
  getFilteredVulns: (filters: {
    severity?: string;
    owner?: string;
    kaiStatus?: string;
    excludeKaiStatus?: string | string[];
    port?: string;
    text?: string;
    // date filters
    lastDays?: number; // last N days
    startDate?: string; // YYYY-MM-DD
    endDate?: string; // YYYY-MM-DD
  }) => Vulnerability[];
};

const DataContext = createContext<DataContextType | undefined>(undefined);

const FETCH_TIMEOUT = 30000; // 30 seconds

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [raw, setRaw] = useState<unknown | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [cacheSource, setCacheSource] = useState<
    "localStorage" | "indexedDB" | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    let workerRef: Worker | null = null;

    async function loadData() {
      // Step 1: Try to load from cache first (instant)
      const cached = await loadFromCache();

      if (cached.data && cached.timestamp) {
        const isValid = isCacheValid(cached.timestamp);
        console.log(
          `📦 Cache ${isValid ? "hit" : "stale"} from ${cached.source}`,
        );

        if (!cancelled) {
          setRaw(cached.data);
          setCacheSource(cached.source);
          setLoading(false);
          setLoadingProgress(100);
        }

        // If cache is fresh, we're done
        if (isValid) {
          console.log("✅ Using fresh cache, skipping network request");
          return;
        }

        // Cache is stale, continue to fetch fresh data in background
        console.log("🔄 Cache stale, fetching fresh data in background...");
      } else {
        console.log("🌐 No cache found, fetching from network...");
      }

      // Step 2: Fetch fresh data from network
      if (cancelled) return;

      if (!cached.data) {
        setLoading(true);
      }

      try {
        workerRef = new Worker(
          new URL("../workers/dataWorker.ts", import.meta.url),
          { type: "module" },
        );

        workerRef.onmessage = async (ev: MessageEvent) => {
          const payload = ev.data;
          if (cancelled) return;

          // Handle progress updates
          if (payload?.type === "progress") {
            setLoadingProgress(payload.progress);
            return;
          }

          if (payload?.success) {
            // Save to cache (LocalStorage or IndexedDB)
            const saved = await saveToCache(payload.data);
            if (saved) {
              console.log("✅ Fresh data cached successfully");
            }

            setRaw(payload.data);
            setLoading(false);
            setLoadingProgress(100);
          } else {
            setError(payload?.error || "Worker error");
            setLoading(false);
          }

          if (workerRef) {
            workerRef.terminate();
            workerRef = null;
          }
        };

        workerRef.onerror = (err) => {
          console.error("Worker error:", err);
          if (!cancelled) {
            setError(String(err?.message || err));
            setLoading(false);
          }
          if (workerRef) {
            workerRef.terminate();
            workerRef = null;
          }
        };

        // Send fetch request with timeout to worker
        workerRef.postMessage({
          url: "https://media.githubusercontent.com/media/chanduusc/Ui-Demo-Data/main/ui_demo.json",
          timeout: FETCH_TIMEOUT,
        });
      } catch (workerErr) {
        // Fallback to main thread fetch
        console.warn("Worker unavailable, using main thread", workerErr);

        try {
          setLoadingProgress(30);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

          const res = await fetch(
            "https://media.githubusercontent.com/media/chanduusc/Ui-Demo-Data/main/ui_demo.json",
            { signal: controller.signal },
          );

          clearTimeout(timeoutId);

          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }

          setLoadingProgress(70);
          const json = await res.json();

          if (!cancelled) {
            await saveToCache(json);
            setRaw(json);
            setLoadingProgress(100);
          }
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : String(e));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
      if (workerRef) {
        workerRef.terminate();
        workerRef = null;
      }
    };
  }, []);

  const firstImage = useMemo(() => getFirstImage(raw), [raw]);

  // Build an index over the vulnerabilities for fast filtering.
  const vulnIndex = useMemo(() => {
    const list: Vulnerability[] =
      (firstImage?.vulnerabilities as Vulnerability[]) || [];
    const bySeverity = new Map<string, Set<number>>();
    const byOwner = new Map<string, Set<number>>();
    const byKaiStatus = new Map<string, Set<number>>();
    const ports = new Set<string>();

    list.forEach((v, i) => {
      const s = (v.severity || "unknown").toLowerCase();
      if (!bySeverity.has(s)) bySeverity.set(s, new Set());
      bySeverity.get(s)!.add(i);

      const o = v.owner || "unknown";
      if (!byOwner.has(o)) byOwner.set(o, new Set());
      byOwner.get(o)!.add(i);

      const k = String((v as Vulnerability).kaiStatus || "");
      if (!byKaiStatus.has(k)) byKaiStatus.set(k, new Set());
      byKaiStatus.get(k)!.add(i);
    });

    // collect image-level ports (if available on firstImage)
    (firstImage?.exposedPorts || []).forEach(
      (p: { port?: string | number } = {}) => {
        if (p && p.port) ports.add(String(p.port));
      },
    );

    return { list, bySeverity, byOwner, byKaiStatus, ports };
  }, [firstImage]);

  /**
   * Fast filter that uses precomputed index sets and then applies full-text fallback.
   * Special handling: 'norisk' maps to both 'invalid - norisk' and 'ai-invalid-norisk'.
   */
  const getFilteredVulns = (filters: {
    severity?: string;
    owner?: string;
    kaiStatus?: string;
    excludeKaiStatus?: string | string[];
    port?: string;
    text?: string;
    lastDays?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    const {
      severity,
      owner,
      kaiStatus,
      excludeKaiStatus,
      port,
      text,
      lastDays,
      startDate,
      endDate,
    } = filters || {};
    const n = vulnIndex.list.length;
    // start with null meaning 'all'
    let resultSet: Set<number> | null = null;

    const intersect = (s: Set<number> | undefined) => {
      if (!s) return;
      if (resultSet === null) resultSet = new Set(s);
      else {
        // intersection
        for (const v of Array.from(resultSet))
          if (!s.has(v)) resultSet.delete(v);
      }
    };

    // If a port filter is provided, short-circuit: only return results if the image exposes that port
    if (port) {
      const portStr = String(port);
      if (!vulnIndex.ports || !vulnIndex.ports.has(portStr)) return [];
    }

    if (severity) {
      intersect(vulnIndex.bySeverity.get(severity.toLowerCase()));
    }

    if (owner) {
      intersect(vulnIndex.byOwner.get(owner));
    }

    if (kaiStatus) {
      if (kaiStatus === "norisk") {
        // include both variants
        const a = vulnIndex.byKaiStatus.get("invalid - norisk");
        const b = vulnIndex.byKaiStatus.get("ai-invalid-norisk");
        const union = new Set<number>();
        if (a) for (const i of a) union.add(i);
        if (b) for (const i of b) union.add(i);
        intersect(union);
      } else {
        intersect(vulnIndex.byKaiStatus.get(kaiStatus));
      }
    }

    // Apply excludeKaiStatus: remove indices that match the excluded statuses
    if (excludeKaiStatus) {
      const excludes = Array.isArray(excludeKaiStatus)
        ? excludeKaiStatus
        : [excludeKaiStatus];
      const excludeSet = new Set<number>();
      excludes.forEach((ex) => {
        if (ex === "norisk") {
          const a = vulnIndex.byKaiStatus.get("invalid - norisk");
          const b = vulnIndex.byKaiStatus.get("ai-invalid-norisk");
          if (a) for (const i of a) excludeSet.add(i);
          if (b) for (const i of b) excludeSet.add(i);
        } else {
          const s = vulnIndex.byKaiStatus.get(ex);
          if (s) for (const i of s) excludeSet.add(i);
        }
      });

      if (resultSet === null)
        resultSet = new Set(Array.from({ length: n }, (_, i) => i));
      for (const e of excludeSet) resultSet.delete(e);
    }

    // If we still have null, take all indices
    if (resultSet === null)
      resultSet = new Set(Array.from({ length: n }, (_, i) => i));

    // Apply date filter (published) if present
    let startTs: number | null = null;
    let endTs: number | null = null;
    if (typeof lastDays === "number" && Number.isFinite(lastDays)) {
      const now = Date.now();
      startTs = now - lastDays * 24 * 60 * 60 * 1000;
      endTs = now;
    }
    if (startDate) {
      const d = new Date(startDate);
      if (!Number.isNaN(d.getTime())) startTs = d.getTime();
    }
    if (endDate) {
      const d = new Date(endDate);
      if (!Number.isNaN(d.getTime())) {
        // include the whole day
        endTs = d.getTime() + 24 * 60 * 60 * 1000 - 1;
      }
    }

    // Apply text filter if present (full scan but only over the candidate set)
    const textLower = text ? text.toLowerCase() : null;
    const out: Vulnerability[] = [];
    for (const idx of resultSet) {
      const v = vulnIndex.list[idx];

      // date checks
      if (startTs !== null || endTs !== null) {
        const pub = v.published ? new Date(v.published).getTime() : NaN;
        if (!Number.isNaN(pub)) {
          if (startTs !== null && pub < startTs) continue;
          if (endTs !== null && pub > endTs) continue;
        } else {
          // if vulnerability has no published date, exclude it when a date filter is active
          continue;
        }
      }

      if (textLower) {
        const hay = `${v.cve} ${v.description || ""} ${v.packageName || ""} ${
          v.status || ""
        }`.toLowerCase();
        if (!hay.includes(textLower)) continue;
      }
      out.push(v);
    }

    return out;
  };

  const getVulnByCve = (cve: string) => {
    const list = firstImage?.vulnerabilities || [];
    return list.find((v) => v.cve === cve);
  };

  return (
    <DataContext.Provider
      value={{
        raw,
        firstImage,
        getVulnByCve,
        loading,
        error,
        loadingProgress,
        cacheSource,
        getFilteredVulns,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};
