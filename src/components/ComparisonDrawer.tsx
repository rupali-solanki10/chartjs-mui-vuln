import React from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Grid from "@mui/material/Grid";

export default function ComparisonDrawer({
  open,
  onClose,
  vulns,
}: {
  open: boolean;
  onClose: () => void;
  vulns: import("../types").Vulnerability[];
}) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 560 } }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6">Compare ({vulns.length})</Typography>
        <IconButton onClick={onClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ p: 2 }}>
        {vulns.length === 0 && (
          <Typography>No vulnerabilities selected</Typography>
        )}

        <Grid container spacing={2}>
          {vulns.map((v, i) => (
            <Grid
              item
              xs={12}
              md={12 / Math.min(3, Math.max(1, vulns.length))}
              key={`${v.cve}-${i}`}
            >
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1">{v.cve}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {v.severity} • CVSS: {v.cvss ?? "—"}
                  </Typography>

                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {v.description || "No description"}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Package
                    </Typography>
                    <Typography variant="body2">
                      {v.packageName} {v.packageVersion}
                    </Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: "block" }}
                    >
                      Owner
                    </Typography>
                    <Typography variant="body2">{v.owner}</Typography>

                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: "block" }}
                    >
                      Status
                    </Typography>
                    <Typography variant="body2">
                      {v.kaiStatus || v.status || "—"}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Drawer>
  );
}
