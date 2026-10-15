"use client";

import { useParams } from "next/navigation";
import { getSnakeById } from "@/lib/snakeData";
import { DynamicDistributionMap as DistributionMap } from "@/components/DynamicDistributionMap";

export default function SnakesLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const id = params?.id as string;
  const snake = id ? getSnakeById(id) : null;
  
  const hasRangeMap = snake ? (
    Boolean(snake.distribution.geometry) ||
    Boolean(snake.distribution.rangeGeoJsonPath) ||
    // We assume a map might exist at the default path; 
    // DistributionMap will handle it if it doesn't.
    true 
  ) : false;

  return (
    <div className="min-h-screen">
      {/* Persistent Distribution Map */}
      {hasRangeMap && snake && (
        <div
          className="fixed top-0 right-0 hidden h-[680px] w-[640px] pointer-events-none z-0 overflow-hidden lg:block"
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 15%), linear-gradient(to bottom, black 0%, black 65%, transparent 100%)",
            maskImage:
              "linear-gradient(to right, transparent 0%, black 15%), linear-gradient(to bottom, black 0%, black 65%, transparent 100%)",
            WebkitMaskComposite: "destination-in",
            maskComposite: "intersect",
          }}
        >
          <div className="w-full h-full">
            <DistributionMap
              distribution={snake.distribution}
              snakeId={snake.id}
              width={640}
              height={680}
            />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
