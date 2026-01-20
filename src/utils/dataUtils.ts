// ...existing code...
/**
 * Utility functions to transform vulnerability JSON into chart/table-friendly structures.
 */

import type { Vulnerability, Metadata, Image } from "../types";

/**
 * Pick the first image from the provided raw data structure.
 */
export function getFirstImage(raw: unknown): Image | null {
    try {
        const obj = (raw && typeof raw === "object") ? (raw as Record<string, unknown>) : {};
        const groupsVal = obj.groups && typeof obj.groups === "object" ? obj.groups as Record<string, unknown> : {};
        const groups = Object.values(groupsVal || {});
        if (!groups.length) return null;
        const firstGroup = groups[0] as Record<string, unknown>;
        const reposVal = firstGroup.repos && typeof firstGroup.repos === "object" ? firstGroup.repos as Record<string, unknown> : {};
        const repos = Object.values(reposVal || {});
        if (!repos.length) return null;
        const firstRepo = repos[0] as Record<string, unknown>;
        const imagesVal = firstRepo.images && typeof firstRepo.images === "object" ? firstRepo.images as Record<string, unknown> : {};
        const images = Object.values(imagesVal || {});
        if (!images.length) return null;
        return images[0] as Image;
    } catch {
        return null;
    }
}

/**
 * Return the vulnerability list (safe).
 */
export function flattenVulns(image?: Image | null): Vulnerability[] {
    return (image && Array.isArray(image.vulnerabilities) && image.vulnerabilities) || [];
}

/**
 * Aggregate counts by severity.
 */
export function aggregateSeverityCounts(vulns: Vulnerability[]) {
    const out: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
    vulns.forEach((v) => {
        const s = (v.severity || "unknown").toLowerCase();
        if (out[s] !== undefined) out[s] += 1;
        else out.unknown += 1;
    });
    return out;
}

/**
 * Group vulnerabilities by owner and severity for stacked charts.
 * Returns { owners, severities, matrix } where matrix[owner][severityIndex] = count
 */
export function groupByOwnerAndSeverity(vulns: Vulnerability[]) {
    const severities = ["critical", "high", "medium", "low"];
    const owners = Array.from(new Set(vulns.map((v) => v.owner || "system")));
    const matrix: Record<string, number[]> = {};
    owners.forEach((o) => (matrix[o] = severities.map(() => 0)));
    vulns.forEach((v) => {
        const owner = v.owner || "system";
        const s = (v.severity || "unknown").toLowerCase();
        const idx = severities.indexOf(s);
        if (idx >= 0) matrix[owner][idx] += 1;
        else {
            // count unknowns in last bucket (optional)
        }
    });
    return { owners, severities, matrix };
}

/**
 * Top N packages by vulnerability count.
 */
export function topPackagesByVulnCount(vulns: Vulnerability[], topN = 10) {
    const counts = new Map<string, number>();
    vulns.forEach((v) => {
        const pkg = v.packageName || "unknown";
        counts.set(pkg, (counts.get(pkg) || 0) + 1);
    });
    return Array.from(counts.entries())
        .map(([packageName, count]) => ({ packageName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, topN);
}

/**
 * Time series aggregation by month (YYYY-MM) for a date field (published or fixDate).
 */
export function timeSeriesByMonth(
    vulns: Vulnerability[],
    dateField: "published" | "fixDate" = "published"
) {
    const map = new Map<string, number>();
    vulns.forEach((v) => {
        const ds = v[dateField];
        if (!ds) return;
        const d = new Date(ds);
        if (Number.isNaN(d.getTime())) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; // YYYY-MM
        map.set(key, (map.get(key) || 0) + 1);
    });
    const sorted = Array.from(map.entries()).sort(([a], [b]) => (a > b ? 1 : -1));
    return sorted.map(([date, count]) => ({ date, count }));
}

/**
 * Return vulnerabilities that appear to have a fix available.
 * (heuristic: has fixDate or status contains 'fixed')
 */
export function getFixableVulns(vulns: Vulnerability[]) {
    return vulns.filter((v) => !!v.fixDate || (v.status && /fix|fixed/i.test(String(v.status))));
}

/**
 * CVSS distribution buckets.
 */
export function cvssBuckets(vulns: Vulnerability[]) {
    const buckets = { none: 0, low: 0, medium: 0, high: 0, critical: 0 };
    vulns.forEach((v) => {
        const score = Number(v.cvss ?? NaN);
        if (Number.isNaN(score)) {
            buckets.none += 1;
        } else if (score < 4) buckets.low += 1;
        else if (score < 7) buckets.medium += 1;
        else if (score < 9) buckets.high += 1;
        else buckets.critical += 1;
    });
    return buckets;
}

/**
 * Aggregate counts by origin (system vs user) for severities.
 * Classification heuristic:
 * - owner === 'system' or falsy => system
 * - otherwise => user
 */
export function systemVsUserBySeverity(vulns: Vulnerability[]) {
    const severities = ["critical", "high", "medium", "low"];
    const systemCounts = severities.map(() => 0);
    const userCounts = severities.map(() => 0);

    vulns.forEach((v) => {
        const s = (v.severity || "unknown").toLowerCase();
        const idx = severities.indexOf(s);
        const owner = (v.owner || "system").toLowerCase();
        const isSystem = owner === "system" || owner === "" || owner === "unknown";
        if (idx >= 0) {
            if (isSystem) systemCounts[idx] += 1;
            else userCounts[idx] += 1;
        }
    });

    return { labels: severities, systemCounts, userCounts };
}

/**
 * Count risk factors across vulnerabilities.
 * Handles several possible shapes for `v.riskFactors`:
 * - object map { factorName: boolean }
 * - array of strings ["factorA", ...]
 * - single string
 */
export function countRiskFactors(vulns: Vulnerability[]) {
    const counts = new Map<string, number>();
    vulns.forEach((v) => {
        const rf = (v as Vulnerability).riskFactors;
        if (!rf) return;
        if (Array.isArray(rf)) {
            rf.forEach((f) => {
                const key = String(f || "unknown");
                counts.set(key, (counts.get(key) || 0) + 1);
            });
        } else if (typeof rf === "object") {
            Object.entries(rf).forEach(([k, val]) => {
                // count it if truthy (e.g., { exposed: true }) or if numeric weight
                if (val) counts.set(k, (counts.get(k) || 0) + 1);
            });
        } else if (typeof rf === "string") {
            counts.set(rf, (counts.get(rf) || 0) + 1);
        }
    });

    return Array.from(counts.entries())
        .map(([factor, count]) => ({ factor, count }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Generic filter helper for tables and lists.
 * filters: { severity?, owner?, packageName?, hasFix?, text? }
 */
export function filterVulns(
    vulns: Vulnerability[],
    filters: {
        severity?: string | string[];
        owner?: string | string[];
        packageName?: string;
        hasFix?: boolean;
        text?: string;
    }
) {
    const { severity, owner, packageName, hasFix, text } = filters;
    const sevSet = Array.isArray(severity) ? severity.map((s) => s.toLowerCase()) : severity ? [String(severity).toLowerCase()] : null;
    const ownerSet = Array.isArray(owner) ? owner : owner ? [owner] : null;

    return vulns.filter((v) => {
        if (sevSet && !sevSet.includes((v.severity || "").toLowerCase())) return false;
        if (ownerSet && !ownerSet.includes(v.owner || "")) return false;
        if (packageName && !(v.packageName || "").toLowerCase().includes(packageName.toLowerCase())) return false;
        if (typeof hasFix === "boolean") {
            const fixed = !!v.fixDate || (v.status && /fix|fixed/i.test(String(v.status)));
            if (hasFix !== fixed) return false;
        }
        if (text) {
            const hay = `${v.cve} ${v.description || ""} ${v.packageName || ""} ${v.status || ""}`.toLowerCase();
            if (!hay.includes(text.toLowerCase())) return false;
        }
        return true;
    });
}

/**
 * Transform metadata or computed severity counts into Chart.js dataset for a single bar chart.
 */
export function severityChartDataFromMetadata(metadata?: Metadata) {
    const labels = ["critical", "high", "medium", "low"];
    const data = [
        metadata?.criticalVulns || 0,
        metadata?.highVulns || 0,
        metadata?.mediumVulns || 0,
        metadata?.lowVulns || 0
    ];
    return { labels, datasets: [{ label: "Count", data }] };
}

/* Example usage (commented):
import raw from '../data/data.json';
const image = getFirstImage(raw);
const vulns = flattenVulns(image);
const severityCounts = aggregateSeverityCounts(vulns);
const topPkgs = topPackagesByVulnCount(vulns, 20);
*/
// ...existing code...