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
import { countRiskFactors } from "../utils/dataUtils";
import type { Vulnerability } from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title
);

export default function RiskFactorsChart({
  vulns,
}: {
  vulns: Vulnerability[];
}) {
  const counts = countRiskFactors(vulns).slice(0, 10);
  const labels = counts.map((c) => c.factor);
  const dataVals = counts.map((c) => c.count);

  const data = {
    labels,
    datasets: [
      {
        label: "Frequency",
        data: dataVals,
        backgroundColor: "#0ea5e9",
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    indexAxis: "y" as const,
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Risk factors frequency" },
    },
    scales: { x: { beginAtZero: true } },
  };

  return <Bar data={data} options={options} />;
}
