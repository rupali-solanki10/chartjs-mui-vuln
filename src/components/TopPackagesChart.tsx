// ...existing code...
import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { topPackagesByVulnCount } from "../utils/dataUtils";
import type { Vulnerability } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title
);

export default function TopPackagesChart({
  vulns,
}: {
  vulns: Vulnerability[];
}) {
  const top = topPackagesByVulnCount(vulns, 10);
  const labels = top.map((t) => t.packageName);
  const dataVals = top.map((t) => t.count);

  const data = {
    labels,
    datasets: [
      {
        label: "Vuln count",
        data: dataVals,
        backgroundColor: "#4f46e5",
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    indexAxis: "y" as const,
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Top packages by vuln count" },
    },
    scales: { x: { beginAtZero: true } },
  };

  return <Bar data={data} options={options} />;
}
