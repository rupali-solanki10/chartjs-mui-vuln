import React from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import { useData } from "../context/DataContext";

export default function VulnDetail() {
  const { cve } = useParams<{ cve: string }>();
  const { getVulnByCve } = useData();
  const vuln = cve ? getVulnByCve(decodeURIComponent(cve)) : undefined;

  return (
    <Container sx={{ mt: 3 }}>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Button component={RouterLink} to="/" variant="outlined">
          ← Back
        </Button>
        <Chip label={cve ? decodeURIComponent(cve) : "Unknown CVE"} />
      </Stack>

      {!vuln ? (
        <Typography>No vulnerability found for {cve}</Typography>
      ) : (
        <Card>
          <CardContent>
            <Typography variant="h6">{vuln.cve}</Typography>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {vuln.severity} • CVSS: {vuln.cvss ?? "—"} • Owner: {vuln.owner}
            </Typography>

            <Typography variant="body2" sx={{ mt: 1 }}>
              {vuln.description}
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Package:
              </Typography>
              <Typography variant="body2">
                {vuln.packageName} {vuln.packageVersion}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Published:
              </Typography>
              <Typography variant="body2">{vuln.published || "—"}</Typography>
              <Typography variant="caption" color="text.secondary">
                Fix:
              </Typography>
              <Typography variant="body2">
                {vuln.fixDate || vuln.status || "—"}
              </Typography>
            </Stack>

            {vuln.link && (
              <Typography sx={{ mt: 2 }}>
                <Link href={vuln.link} target="_blank" rel="noreferrer">
                  Official advisory
                </Link>
              </Typography>
            )}
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
