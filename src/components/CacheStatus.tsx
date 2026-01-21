import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Stack,
  Tooltip,
} from "@mui/material";
import {
  Refresh,
  CheckCircle,
  Storage,
  CloudDownload,
} from "@mui/icons-material";
import { useData } from "../context/DataContext";
import {
  getCacheInfo,
  clearCache,
  type CacheInfo,
} from "../utils/storageManager";

export const CacheStatus = () => {
  const { loading, error, loadingProgress, cacheSource } = useData();
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);

  useEffect(() => {
    const loadCacheInfo = async () => {
      const info = await getCacheInfo();
      setCacheInfo(info);
    };
    loadCacheInfo();
  }, [cacheSource]);

  const handleClearCache = async () => {
    await clearCache();
    window.location.reload();
  };

  if (error) {
    return (
      <Box sx={{ p: 2, bgcolor: "error.light", borderRadius: 1 }}>
        <Typography color="error" variant="body2">
          ⚠️ Error: {error}
        </Typography>
        <Button
          size="small"
          onClick={handleClearCache}
          sx={{ mt: 1 }}
          variant="outlined"
        >
          Clear Cache & Retry
        </Button>
      </Box>
    );
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      {loading && loadingProgress !== undefined && (
        <Box sx={{ minWidth: 200, flexGrow: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CloudDownload fontSize="small" color="action" />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Loading... {loadingProgress}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={loadingProgress || 0}
                sx={{ height: 6, borderRadius: 1 }}
              />
            </Box>
          </Stack>
        </Box>
      )}

      {cacheInfo?.exists && (
        <>
          <Tooltip
            title={`Cached at: ${new Date(cacheInfo.timestamp!).toLocaleString()}`}
          >
            <Chip
              icon={<CheckCircle />}
              label={`Cached ${cacheInfo.ageMinutes}m ago`}
              color={cacheInfo.isValid ? "success" : "warning"}
              size="small"
              variant="outlined"
            />
          </Tooltip>

          <Tooltip title={`Storage: ${cacheInfo.source}`}>
            <Chip
              icon={<Storage />}
              label={`${cacheInfo.sizeMB} MB`}
              size="small"
              variant="outlined"
              color={cacheInfo.source === "indexedDB" ? "primary" : "default"}
            />
          </Tooltip>

          {cacheInfo.source && (
            <Chip
              label={
                cacheInfo.source === "indexedDB" ? "IndexedDB" : "LocalStorage"
              }
              size="small"
              variant="filled"
              color={cacheInfo.source === "indexedDB" ? "primary" : "secondary"}
              sx={{ fontWeight: 600, fontSize: "0.7rem" }}
            />
          )}
        </>
      )}

      <Button
        size="small"
        startIcon={<Refresh />}
        onClick={handleClearCache}
        disabled={loading}
        variant="outlined"
      >
        Refresh
      </Button>
    </Stack>
  );
};
