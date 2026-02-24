import Link from "next/link";
import { HyperbolicTreeWrapper } from "@/components/Phylogeny/HyperbolicTreeWrapper";
import { Kbd } from "@/components/ui/kbd";
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
    <div className="fixed inset-0 flex flex-col">
      {/* CSS-driven pill visibility based on body[data-chart-zoomed] */}
      <style dangerouslySetInnerHTML={{ __html: `
        [data-hint='zoom-out'] { display: none; }
        body[data-chart-zoomed] [data-hint='zoom-out'] { display: flex; }
        body[data-chart-zoomed] [data-hint='back'] { display: none; }
      `}} />

      {/* Back + keyboard shortcut hints (snake info page style) */}
      <div className="absolute top-0 left-0 z-20 py-4 px-[68px] flex items-center gap-4 flex-wrap text-sm text-stone-600">
        <span data-hint="back" className="flex items-center gap-2">
          <Kbd triggerKey="Escape">Esc</Kbd>
          <Link
            href="/"
            className="hover:text-stone-800 transition-colors"
          >
            Back
          </Link>
        </span>
        <span data-hint="zoom-out" className="flex items-center gap-2">
          <Kbd triggerKey="Delete">Delete</Kbd>
          <span>Zoom out</span>
        </span>
        <span className="flex items-center gap-2">
          <Kbd triggerKey="z">Z</Kbd>
          <span>Reset view</span>
        </span>
        <span className="flex items-center gap-2">
          <Kbd triggerKey=" ">Space</Kbd>
          <span>Search snake</span>
        </span>
      </div>

      <div className="flex-1 min-h-0">
        <HyperbolicTreeWrapper root={root} currentSnakeId={snakeId} />
      </div>
    </div>
  );
}
