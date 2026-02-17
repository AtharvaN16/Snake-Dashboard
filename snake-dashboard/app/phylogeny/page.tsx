import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PhylogenyWrapper } from "@/components/Phylogeny/PhylogenyWrapper";
import { getAllSnakes } from "@/lib/snakeData";
import { buildFullSnakeHierarchy } from "@/lib/snakeTaxonomy";

export const metadata = {
  title: "Snake phylogeny (Suborder Serpentes) – Is It Venomous?",
  description:
    "Interactive phylogeny of all snakes in the database, from Suborder Serpentes down to species. Shows infraorders, families, genera, and all species.",
};

export default function GlobalPhylogenyPage() {
  const snakes = getAllSnakes();
  const root = buildFullSnakeHierarchy(snakes);

  return (
    <div className="min-h-screen bg-background py-8 px-[68px]">
      <div className="relative z-20 mb-6 flex items-center gap-4 flex-wrap text-sm text-stone-600">
        <Link
          href="/"
          className="inline-flex items-center gap-1 hover:text-stone-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to home
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-serif text-[#2c2c2c]">
            Snake phylogeny (Suborder Serpentes)
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            All {snakes.length} species in the database. Click segments to zoom
            in/out. Click species names to view that snake.
          </p>
        </header>

        <PhylogenyWrapper root={root} standalone />
      </div>
    </div>
  );
}
