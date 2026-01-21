import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";

export type FilterState = {
  severity?: string;
  owner?: string;
  kaiStatus?: string;
  excludeKaiStatus?: string | string[];
  port?: string;
  text?: string;
  // date filtering
  lastDays?: number; // e.g., 7, 30, 90
  startDate?: string; // ISO YYYY-MM-DD
  endDate?: string; // ISO YYYY-MM-DD
};

export default function FilterControls({
  owners,
  ports,
  onChange,
  onClear,
  value,
}: {
  owners: string[];
  ports?: string[];
  value: FilterState;
  onChange: (v: FilterState) => void;
  onClear: () => void;
}) {
  return (
    <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
      <TextField
        label="Severity"
        select
        size="small"
        value={value.severity || ""}
        onChange={(e) =>
          onChange({ ...value, severity: e.target.value || undefined })
        }
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="critical">critical</MenuItem>
        <MenuItem value="high">high</MenuItem>
        <MenuItem value="medium">medium</MenuItem>
        <MenuItem value="low">low</MenuItem>
      </TextField>

      <TextField
        label="Port"
        select
        size="small"
        value={value.port || ""}
        onChange={(e) =>
          onChange({ ...value, port: e.target.value || undefined })
        }
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="">All</MenuItem>
        {(ports || []).map((p) => (
          <MenuItem key={p} value={p}>
            {p}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="Owner"
        select
        size="small"
        value={value.owner || ""}
        onChange={(e) =>
          onChange({ ...value, owner: e.target.value || undefined })
        }
        sx={{ minWidth: 160 }}
      >
        <MenuItem value="">All</MenuItem>
        {owners.map((o) => (
          <MenuItem key={o} value={o}>
            {o}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        label="KAI status"
        select
        size="small"
        value={value.kaiStatus || ""}
        onChange={(e) =>
          onChange({ ...value, kaiStatus: e.target.value || undefined })
        }
        sx={{ minWidth: 200 }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="norisk">norisk (invalid / ai-invalid)</MenuItem>
        <MenuItem value="invalid - norisk">invalid - norisk</MenuItem>
        <MenuItem value="ai-invalid-norisk">ai-invalid-norisk</MenuItem>
      </TextField>

      <TextField
        size="small"
        label="Search"
        value={value.text || ""}
        onChange={(e) =>
          onChange({ ...value, text: e.target.value || undefined })
        }
        sx={{ minWidth: 220 }}
      />

      <TextField
        label="Period"
        select
        size="small"
        value={
          value.lastDays
            ? String(value.lastDays)
            : value.startDate
              ? "custom"
              : ""
        }
        onChange={(e) => {
          const v = e.target.value;
          const now = new Date();
          if (v === "")
            onChange({
              ...value,
              lastDays: undefined,
              startDate: undefined,
              endDate: undefined,
            });
          else if (v === "custom") onChange({ ...value, lastDays: undefined });
          else if (v === "this_month") {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            onChange({
              ...value,
              startDate: start.toISOString().slice(0, 10),
              endDate: end.toISOString().slice(0, 10),
              lastDays: undefined,
            });
          } else if (v === "last_month") {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            onChange({
              ...value,
              startDate: start.toISOString().slice(0, 10),
              endDate: end.toISOString().slice(0, 10),
              lastDays: undefined,
            });
          } else if (v === "this_year") {
            const start = new Date(now.getFullYear(), 0, 1);
            const end = new Date(now.getFullYear(), 11, 31);
            onChange({
              ...value,
              startDate: start.toISOString().slice(0, 10),
              endDate: end.toISOString().slice(0, 10),
              lastDays: undefined,
            });
          } else if (v === "last_year") {
            const start = new Date(now.getFullYear() - 1, 0, 1);
            const end = new Date(now.getFullYear() - 1, 11, 31);
            onChange({
              ...value,
              startDate: start.toISOString().slice(0, 10),
              endDate: end.toISOString().slice(0, 10),
              lastDays: undefined,
            });
          } else {
            const days = Number(v);
            if (!Number.isNaN(days))
              onChange({
                ...value,
                lastDays: days,
                startDate: undefined,
                endDate: undefined,
              });
          }
        }}
        sx={{ minWidth: 220 }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="7">Last 7 days</MenuItem>
        <MenuItem value="30">Last 30 days</MenuItem>
        <MenuItem value="90">Last 90 days</MenuItem>
        <MenuItem value="this_month">This month</MenuItem>
        <MenuItem value="last_month">Last month</MenuItem>
        <MenuItem value="this_year">This year</MenuItem>
        <MenuItem value="last_year">Last year</MenuItem>
        <MenuItem value="custom">Custom range...</MenuItem>
      </TextField>

      {value.startDate !== undefined || value.lastDays === undefined ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="Start"
            type="date"
            size="small"
            value={value.startDate || ""}
            onChange={(e) =>
              onChange({
                ...value,
                startDate: e.target.value || undefined,
                lastDays: undefined,
              })
            }
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End"
            type="date"
            size="small"
            value={value.endDate || ""}
            onChange={(e) =>
              onChange({
                ...value,
                endDate: e.target.value || undefined,
                lastDays: undefined,
              })
            }
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      ) : null}

      <Button variant="outlined" size="small" onClick={onClear}>
        Clear
      </Button>
    </Box>
  );
}
