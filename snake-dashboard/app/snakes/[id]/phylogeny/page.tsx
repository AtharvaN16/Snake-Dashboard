import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PhylogenyWrapper } from "@/components/Phylogeny/PhylogenyWrapper";
import { getSnakeById, getAllSnakes, filterByFamily } from "@/lib/snakeData";

export async function generateStaticParams() {
  const snakes = getAllSnakes();
  return snakes.map((snake) => ({ id: snake.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snake = getSnakeById(id);
  if (!snake) return { title: "Snake Not Found" };
  return {
    title: `${snake.family} phylogeny – Is It Venomous?`,
    description: `Phylogenetic tree for ${snake.family} with ${snake.commonName} and related species.`,
  };
}

export default async function SnakePhylogenyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const snake = getSnakeById(id);

  if (!snake) {
    notFound();
  }

  const familySnakes = filterByFamily(getAllSnakes(), snake.family);

  return (
    <div className="min-h-screen bg-background py-8 px-[68px]">
      <div className="relative z-20 mb-6 flex items-center gap-4 flex-wrap text-sm text-stone-600">
        <Link
          href={`/snakes/${snake.id}`}
          className="inline-flex items-center gap-1 hover:text-stone-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {snake.commonName}
        </Link>
      </div>

      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-serif text-[#2c2c2c]">
            {snake.family} phylogeny
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Click segments to zoom in/out. Click species names to view that
            snake.
          </p>
        </header>

        <PhylogenyWrapper
          family={snake.family}
          snakes={familySnakes}
          currentSnakeId={snake.id}
          standalone
        />
      </div>
    </div>
  );
}
