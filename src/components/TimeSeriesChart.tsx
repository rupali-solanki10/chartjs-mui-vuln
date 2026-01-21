import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import type { ChartOptions } from "chart.js";
import { timeSeriesByMonth } from "../utils/dataUtils";
import type { Vulnerability } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
);

export default function TimeSeriesChart({ vulns }: { vulns: Vulnerability[] }) {
  const series = timeSeriesByMonth(vulns as Vulnerability[], "published");
  const labels = series.map((s) => s.date);
  const dataVals = series.map((s) => s.count);

  const data = {
    labels,
    datasets: [
      {
        label: "Published vulns per month",
        data: dataVals,
        borderColor: "#06b6d4",
        backgroundColor: "rgba(6,182,212,0.12)",
        fill: true,
        tension: 0.2,
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Vulnerabilities over time (published)" },
    },
    scales: { y: { beginAtZero: true } },
  };

  return <Line data={data} options={options} />;
}
