import Link from "next/link";
import { HyperbolicTreeWrapper } from "@/components/Phylogeny/HyperbolicTreeWrapper";
import { getAllSnakes } from "@/lib/snakeData";
import { buildFullSnakeHierarchy } from "@/lib/snakeTaxonomy";

export const metadata = {
  title: "Snake phylogeny (Suborder Serpentes) – Is It Venomous?",
  description:
    "Interactive phylogeny of all snakes in the database, from Suborder Serpentes down to species. Shows infraorders, families, genera, and all species.",
};

export default async function GlobalPhylogenyPage({
  searchParams,
}: {
  searchParams: Promise<{ snakeId?: string }>;
}) {
  const { snakeId } = await searchParams;
  const snakes = getAllSnakes();
  const root = buildFullSnakeHierarchy(snakes);

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* CSS-driven pill visibility based on body[data-chart-zoomed] */}
      <style>{`
        [data-hint="zoom-out"] { display: none; }
        body[data-chart-zoomed] [data-hint="zoom-out"] { display: flex; }
        body[data-chart-zoomed] [data-hint="back"] { display: none; }
      `}</style>

      {/* Back + keyboard shortcut hints */}
      <div className="absolute top-0 left-0 z-20 py-4 px-[68px] flex items-center gap-4 flex-wrap text-sm text-stone-600">
        <span data-hint="back" className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-mono shadow-sm">
            Esc
          </kbd>
          <Link
            href="/"
            className="hover:text-stone-800 transition-colors"
          >
            Back
          </Link>
        </span>
        <span data-hint="zoom-out" className="items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-mono shadow-sm">
            Delete
          </kbd>
          <span>Zoom out</span>
        </span>
        <span className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-mono shadow-sm">
            Space
          </kbd>
          <span>Search to highlight snake on graph</span>
        </span>
      </div>

      <div className="flex-1 min-h-0">
        <HyperbolicTreeWrapper root={root} currentSnakeId={snakeId} />
      </div>
    </div>
  );
}
