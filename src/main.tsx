import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import App from "./App";
import { DataProvider } from "./context/DataContext";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DataProvider>
        <CssBaseline />
        <App />
      </DataProvider>
    </BrowserRouter>
  </React.StrictMode>
);
