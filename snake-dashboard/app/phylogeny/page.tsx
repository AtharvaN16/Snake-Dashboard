import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
    <div className="flex flex-col min-h-screen bg-background">
      <header className="shrink-0 py-6 px-[68px] border-b border-stone-200">
        <div className="flex items-center gap-4 flex-wrap text-sm text-stone-600">
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-stone-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
        <h1 className="text-2xl font-serif text-[#2c2c2c] mt-2">
          Snake phylogeny (Suborder Serpentes)
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          All {snakes.length} species in the database, from Serpentes down to
          species. Drag to pan, scroll to zoom.
        </p>
      </header>

      <div className="flex-1 min-h-0 flex flex-col px-[68px] py-4">
        <HyperbolicTreeWrapper root={root} currentSnakeId={snakeId} />
      </div>
    </div>
  );
}
