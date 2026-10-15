"use client";

import dynamic from "next/dynamic";
import type { HierarchyNode } from "@/lib/snakeTaxonomy";

interface Props {
  root: HierarchyNode;
  currentSnakeId?: string;
}

const DynamicHyperbolicTree = dynamic(
  () => import("./HyperbolicTree").then((m) => m.HyperbolicTree),
  {
    ssr: false,
    loading: () => (
      <span className="text-sm text-stone-500 underline decoration-stone-300 decoration-dotted underline-offset-4">
        Loading phylogeny…
      </span>
    ),
  }
);

export function HyperbolicTreeWrapper(props: Props) {
  return <DynamicHyperbolicTree {...props} />;
}
