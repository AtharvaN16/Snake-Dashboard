"use client";

import dynamic from "next/dynamic";
import type { DistributionMapProps } from "./DistributionMap";

const DynamicMap = dynamic(
  () => import("./DistributionMap").then((m) => m.DistributionMap),
  { ssr: false }
);

export function DynamicDistributionMap(props: DistributionMapProps) {
  return <DynamicMap {...props} />;
}
