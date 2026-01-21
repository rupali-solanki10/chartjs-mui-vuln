import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import VulnDetail from "./pages/VulnDetail";
import { useData } from "./context/DataContext";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Backdrop from "@mui/material/Backdrop";

export default function App() {
  const { loading } = useData();

  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/vuln/:cve" element={<VulnDetail />} />
      </Routes>

      {/* Small global loading overlay while the worker fetches/parses the large JSON */}
      <Backdrop
        open={!!loading}
        sx={{ color: "#fff", zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <CircularProgress color="inherit" />
          <div>Loading vulnerability data…</div>
        </Box>
      </Backdrop>
    </>
  );
}
