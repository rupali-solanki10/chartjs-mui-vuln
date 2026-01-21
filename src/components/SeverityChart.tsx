import type { Metadata } from "../types";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import type { ChartOptions } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function SeverityChart({
  metadata,
}: {
  metadata?: Metadata | undefined;
}) {
  const labels = ["critical", "high", "medium", "low"];
  const counts = [
    metadata?.criticalVulns || 0,
    metadata?.highVulns || 0,
    metadata?.mediumVulns || 0,
    metadata?.lowVulns || 0,
  ];

  const data = {
    labels,
    datasets: [
      {
        label: "Count",
        data: counts,
        backgroundColor: ["#b91c1c", "#f97316", "#f59e0b", "#10b981"],
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  return <Bar data={data} options={options} />;
}
