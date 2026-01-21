// ...existing code...
import { useMemo, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import { useData } from "../context/DataContext";
import SeverityChart from "../components/SeverityChart";
import VulnTable from "../components/VulnTable";
import TimeSeriesChart from "../components/TimeSeriesChart";
import FilterControls, { type FilterState } from "../components/FilterControls";
import RiskFactorsChart from "../components/RiskFactorsChart";
import {
  flattenVulns,
  groupByOwnerAndSeverity,
  aggregateSeverityCounts,
} from "../utils/dataUtils";
import type { Vulnerability } from "../types";
import FilterSummary from "../components/FilterSummary";
import Grow from "@mui/material/Grow";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import FilterAltIcon from "@mui/icons-material/FilterAlt";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ComparisonDrawer from "../components/ComparisonDrawer";

export default function Dashboard() {
  const { firstImage, getFilteredVulns, getVulnByCve } = useData();
  const [filters, setFilters] = useState<FilterState>({});
  const vulns = useMemo(() => flattenVulns(firstImage), [firstImage]);

  const owners = useMemo(() => {
    const grouped = groupByOwnerAndSeverity(vulns);
    return grouped.owners;
  }, [vulns]);

  const ports = useMemo(() => {
    const ps = (firstImage?.exposedPorts || []).map(
      (p: { port?: string | number } = {}) => String(p.port ?? ""),
    );
    return Array.from(new Set(ps)).filter((x) => x !== "");
  }, [firstImage]);

  const filteredVulns = useMemo(
    () =>
      getFilteredVulns({
        severity: filters.severity,
        owner: filters.owner,
        kaiStatus: filters.kaiStatus,
        excludeKaiStatus: filters.excludeKaiStatus,
        port: filters.port,
        text: filters.text,
        lastDays: filters.lastDays,
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
    [getFilteredVulns, filters],
  );

  const severityFromFiltered = useMemo(() => {
    const counts = aggregateSeverityCounts(filteredVulns);
    return {
      criticalVulns: counts.critical || 0,
      highVulns: counts.high || 0,
      mediumVulns: counts.medium || 0,
      lowVulns: counts.low || 0,
    };
  }, [filteredVulns]);

  const totalCount = vulns.length;
  const filteredCount = filteredVulns.length;

  const activeFilters = {
    severity: filters.severity,
    owner: filters.owner,
    kaiStatus: filters.kaiStatus,
    excludeKaiStatus: filters.excludeKaiStatus,
    port: filters.port,
    text: filters.text,
    lastDays: filters.lastDays,
    startDate: filters.startDate,
    endDate: filters.endDate,
  };

  // comparison state (table will own selection; table will call onRequestCompare)
  const [compareSelectedCves, setCompareSelectedCves] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const selectedVulns = compareSelectedCves
    .map((c) => getVulnByCve(c))
    .filter((v): v is Vulnerability => Boolean(v));

  if (!firstImage)
    return (
      <Container sx={{ mt: 4 }}>
        <Typography>No image found in data</Typography>
      </Container>
    );

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Vulnerability Visualizer
          </Typography>
          <Typography variant="body2">{firstImage.name}</Typography>
        </Toolbar>
      </AppBar>

      <Container sx={{ mt: 3 }}>
        <Card sx={{ mb: 2 }}>
          <CardContent
            sx={{ display: "flex", justifyContent: "space-between" }}
          >
            <Box>
              <Typography variant="h6">{firstImage.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                Base: {firstImage.baseImage} • Created: {firstImage.createTime}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="body2">
                Exposed: {firstImage.exposed ? "yes" : "no"}
              </Typography>
              <Typography variant="body2">
                Ports:{" "}
                {(firstImage.exposedPorts || [])
                  .map((p: { port?: string | number } = {}) =>
                    String(p.port ?? ""),
                  )
                  .filter((s) => s !== "")
                  .join(", ")}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Box mb={2}>
          <Box
            display="flex"
            gap={2}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
          >
            <FilterControls
              owners={owners}
              ports={ports}
              value={filters}
              onChange={(v) => setFilters(v)}
              onClear={() => setFilters({})}
            />

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Analysis: hide CVEs marked 'invalid - norisk'">
                <Button
                  variant={
                    filters.excludeKaiStatus === "invalid - norisk"
                      ? "contained"
                      : "outlined"
                  }
                  color="primary"
                  startIcon={<FilterAltIcon />}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      excludeKaiStatus:
                        prev.excludeKaiStatus === "invalid - norisk"
                          ? undefined
                          : "invalid - norisk",
                    }))
                  }
                >
                  Analysis
                </Button>
              </Tooltip>
              <Tooltip title="AI Analysis: hide CVEs marked 'ai-invalid-norisk'">
                <Button
                  variant={
                    filters.excludeKaiStatus === "ai-invalid-norisk"
                      ? "contained"
                      : "outlined"
                  }
                  color="secondary"
                  startIcon={<SmartToyIcon />}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      excludeKaiStatus:
                        prev.excludeKaiStatus === "ai-invalid-norisk"
                          ? undefined
                          : "ai-invalid-norisk",
                    }))
                  }
                >
                  AI Analysis
                </Button>
              </Tooltip>
            </Stack>
          </Box>
          <Box sx={{ my: 2 }}>
            <Grow in={true} key={JSON.stringify(activeFilters)} timeout={300}>
              <div>
                <FilterSummary
                  total={totalCount}
                  filtered={filteredCount}
                  activeFilters={activeFilters}
                />
              </div>
            </Grow>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Severity breakdown
                </Typography>
                <SeverityChart metadata={severityFromFiltered} />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Risk factors frequency
                </Typography>
                <RiskFactorsChart vulns={filteredVulns} />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Vulnerabilities over time
                </Typography>
                <TimeSeriesChart vulns={filteredVulns} />
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Vulnerabilities (filtered)
                </Typography>
                <VulnTable
                  vulnerabilities={filteredVulns}
                  onRequestCompare={(selected) => {
                    setCompareSelectedCves(selected);
                    setCompareOpen(true);
                  }}
                  onSelectionChange={(selected) =>
                    setCompareSelectedCves(selected)
                  }
                />
                <ComparisonDrawer
                  open={compareOpen}
                  onClose={() => setCompareOpen(false)}
                  vulns={selectedVulns}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
