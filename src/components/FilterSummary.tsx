import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";

export default function FilterSummary({
  total,
  filtered,
  activeFilters,
}: {
  total: number;
  filtered: number;
  activeFilters: Record<string, unknown>;
}) {
  const pct = total > 0 ? Math.round(((total - filtered) / total) * 100) : 0;

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="body2">
          Showing {filtered} of {total} vulnerabilities
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ({pct}% filtered out)
        </Typography>
      </Box>

      <Box display="flex" gap={1} flexWrap="wrap">
        {Object.entries(activeFilters)
          .filter(([, v]) => v !== undefined && v !== null && v !== "")
          .map(([k, v]) => (
            <Chip
              key={k}
              label={`${k}: ${Array.isArray(v) ? v.join(",") : String(v)}`}
              size="small"
            />
          ))}
      </Box>

      <LinearProgress
        variant="determinate"
        value={(filtered / Math.max(1, total)) * 100}
      />
    </Box>
  );
}
