import React, { useMemo, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Checkbox from "@mui/material/Checkbox";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { Link as RouterLink } from "react-router-dom";
import TableSortLabel from "@mui/material/TableSortLabel";
import type { Vulnerability } from "../types";

type SortKey =
  | "cve"
  | "severity"
  | "cvss"
  | "packageName"
  | "owner"
  | "published";

export default function VulnTable({
  vulnerabilities,
  onRequestCompare,
  onSelectionChange,
}: {
  vulnerabilities: Vulnerability[];
  /**
   * Called when the user clicks Compare in the table toolbar. Receives the
   * currently selected CVEs.
   */
  onRequestCompare?: (selectedCves: string[]) => void;
  /**
   * Called whenever the selection changes (row or select-all). Receives the
   * current list of selected CVEs.
   */
  onSelectionChange?: (selectedCves: string[]) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey | null>("cve");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedCves, setSelectedCves] = useState<string[]>([]);

  const sorted = useMemo(() => {
    if (!vulnerabilities) return [];
    const arr = [...vulnerabilities];
    if (!sortKey) return arr;

    arr.sort((a: Vulnerability, b: Vulnerability) => {
      const va = (a as Record<string, unknown>)[sortKey];
      const vb = (b as Record<string, unknown>)[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return -1;
      if (vb == null) return 1;
      if (sortKey === "cvss") {
        return Number(va) - Number(vb);
      }
      return String(va).localeCompare(String(vb));
    });

    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [vulnerabilities, sortKey, sortDir]);

  const doSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (!vulnerabilities || vulnerabilities.length === 0)
    return (
      <Typography color="text.secondary">No vulnerabilities listed</Typography>
    );

  return (
    <TableContainer component={Paper}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 1, gap: 1 }}>
        <Tooltip
          title={
            selectedCves.length < 2
              ? "Select at least 2 vulnerabilities to compare"
              : "Compare selected vulnerabilities"
          }
        >
          <span>
            <Button
              size="small"
              variant={selectedCves.length >= 2 ? "contained" : "outlined"}
              color="info"
              onClick={() => onRequestCompare && onRequestCompare(selectedCves)}
              disabled={selectedCves.length < 2}
            >
              Compare ({selectedCves.length})
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Export filtered vulnerabilities as CSV">
          <span>
            <Button
              size="small"
              variant="outlined"
              color="primary"
              startIcon={<FileDownloadIcon />}
              onClick={() => {
                // build CSV for visible rows
                const headers = [
                  "cve",
                  "severity",
                  "cvss",
                  "packageName",
                  "packageVersion",
                  "owner",
                  "published",
                  "fixDate",
                  "status",
                ];

                const quote = (v: unknown) => {
                  if (v === null || v === undefined) return "";
                  const s = String(v);
                  return `"${s.replace(/"/g, '""')}"`;
                };

                const rows = sorted.map((r) => [
                  quote(r.cve),
                  quote(r.severity),
                  quote(r.cvss ?? ""),
                  quote(r.packageName),
                  quote(r.packageVersion),
                  quote(r.owner),
                  quote(r.published),
                  quote(r.fixDate ?? ""),
                  quote(r.status ?? ""),
                ]);

                const csv = [
                  headers.map((h) => `"${h}"`).join(","),
                  ...rows.map((r) => r.join(",")),
                ].join("\n");

                const blob = new Blob(["\uFEFF", csv], {
                  type: "text/csv;charset=utf-8;",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "filtered-vulnerabilities.csv";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
            >
              Export
            </Button>
          </span>
        </Tooltip>
      </Box>
      <Table size="small" aria-label="vulns table">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={
                  selectedCves.length > 0 && selectedCves.length < sorted.length
                }
                checked={
                  selectedCves.length === sorted.length && sorted.length > 0
                }
                onChange={(e) => {
                  const next = e.target.checked ? sorted.map((s) => s.cve) : [];
                  setSelectedCves(next);
                  if (onSelectionChange) onSelectionChange(next);
                }}
                inputProps={{ "aria-label": "select all visible" }}
              />
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortKey === "cve"}
                direction={sortDir}
                onClick={() => doSort("cve")}
              >
                CVE
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortKey === "severity"}
                direction={sortDir}
                onClick={() => doSort("severity")}
              >
                Severity
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortKey === "cvss"}
                direction={sortDir}
                onClick={() => doSort("cvss")}
              >
                CVSS
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortKey === "packageName"}
                direction={sortDir}
                onClick={() => doSort("packageName")}
              >
                Package
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortKey === "owner"}
                direction={sortDir}
                onClick={() => doSort("owner")}
              >
                Owner
              </TableSortLabel>
            </TableCell>
            <TableCell>
              <TableSortLabel
                active={sortKey === "published"}
                direction={sortDir}
                onClick={() => doSort("published")}
              >
                Published
              </TableSortLabel>
            </TableCell>
            <TableCell>Fix</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((v, idx) => (
            <TableRow key={`${v.cve}-${v.packageName}-${idx}`} hover>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedCves.includes(v.cve)}
                  onChange={() => {
                    const next = selectedCves.includes(v.cve)
                      ? selectedCves.filter((p) => p !== v.cve)
                      : [...selectedCves, v.cve];
                    setSelectedCves(next);
                    if (onSelectionChange) onSelectionChange(next);
                  }}
                  inputProps={{ "aria-label": `select ${v.cve}` }}
                />
              </TableCell>
              <TableCell>
                <Link
                  component={RouterLink}
                  to={`/vuln/${encodeURIComponent(v.cve)}`}
                  underline="hover"
                >
                  {v.cve}
                </Link>
              </TableCell>
              <TableCell>{v.severity}</TableCell>
              <TableCell>{v.cvss ?? "-"}</TableCell>
              <TableCell>
                {v.packageName} {v.packageVersion}
              </TableCell>
              <TableCell>{v.owner}</TableCell>
              <TableCell>{v.published}</TableCell>
              <TableCell>{v.fixDate || v.status || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
