"use client";

import dynamic from "next/dynamic";
import { Snake } from "@/lib/types";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";

interface PhylogenyChartProps {
  /** Pre-built full hierarchy (global phylogeny page). When set, family/snakes ignored. */
  root?: HierarchyNode;
  family?: string;
  snakes?: Snake[];
  currentSnakeId?: string;
  standalone?: boolean;
}

const DynamicPhylogenyChart = dynamic(
  () => import("./PhylogenyChart").then((mod) => mod.PhylogenyChart),
  {
    ssr: false,
    loading: () => <span className="text-sm text-stone-500 underline decoration-stone-300 decoration-dotted underline-offset-4">Loading phylogeny...</span>,
  }
);

export function PhylogenyWrapper(props: PhylogenyChartProps) {
  return <DynamicPhylogenyChart {...props} />;
}
