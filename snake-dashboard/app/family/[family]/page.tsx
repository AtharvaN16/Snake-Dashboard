import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { getAllFamilies, getSnakesByFamilyGroupedByGenus } from "@/lib/snakeData";
import { VenomTypeChip } from "@/components/VenomTypeChip";
import type { Snake } from "@/lib/types";

export async function generateStaticParams() {
  const families = getAllFamilies();
  return families.map((family) => ({
    family: family.toLowerCase().replace(/\s+/g, "-"),
  }));
}

function getClassificationColor(venomClassification: Snake["venomClassification"]) {
  switch (venomClassification) {
    case "Highly Venomous":
      return "#FF7373";
    case "Venomous":
      return "#FFAB73";
    case "Moderately Venomous":
      return "#FEF08A";
    case "Mildly Venomous":
      return "#B9E948";
    case "Non-venomous":
    default:
      return "#CCCCCC";
  }
}

function FamilyPhylogeneticTree({ family }: { family: string }) {
  const groupedSnakes = getSnakesByFamilyGroupedByGenus(family);
  const genera = Array.from(groupedSnakes.keys()).sort();

  if (genera.length === 0) {
    return (
      <div className="text-center py-12 text-stone-600">
        <p>No snakes found in this family.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {genera.map((genus, genusIndex) => {
        const snakes = groupedSnakes.get(genus)!;
        return (
          <div key={genus} className="relative">
            {/* Genus Node */}
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-[#2c2c2c] mb-2">{genus}</h3>
              {genusIndex < genera.length - 1 && (
                <div className="absolute left-0 top-12 bottom-0 w-0.5 bg-stone-300" style={{ marginLeft: "20px" }} />
              )}
            </div>

            {/* Species Nodes */}
            <div className="ml-8 space-y-3">
              {snakes.map((snake, snakeIndex) => {
                const classificationColor = getClassificationColor(snake.venomClassification);
                const isLastInGenus = snakeIndex === snakes.length - 1;
                
                return (
                  <div key={snake.id} className="relative flex items-start gap-4">
                    {/* Vertical line connector */}
                    {!isLastInGenus && (
                      <div className="absolute left-0 top-6 bottom-0 w-0.5 bg-stone-300" style={{ marginLeft: "12px" }} />
                    )}
                    
                    {/* Horizontal branch */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-4 h-0.5 bg-stone-300" />
                      <div className="w-2 h-2 rounded-full bg-stone-400" />
                    </div>

                    {/* Snake Card */}
                    <Link
                      href={`/snakes/${snake.id}`}
                      className="flex-1 bg-white rounded-lg border border-stone-200 p-4 hover:border-stone-400 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        {/* Thumbnail */}
                        <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                          {snake.images?.thumbnail ? (
                            <Image
                              src={snake.images.thumbnail}
                              alt={snake.commonName}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-2xl">
                              🐍
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h4 className="font-bold text-lg text-[#2c2c2c] group-hover:text-stone-700 transition-colors">
                                {snake.commonName}
                              </h4>
                              <p className="text-sm text-stone-500 italic">
                                {snake.scientificName}
                              </p>
                            </div>
                            <span
                              className="text-xs font-medium px-2 py-1 rounded flex-shrink-0"
                              style={{
                                backgroundColor: classificationColor,
                                color: "#111827",
                              }}
                            >
                              {snake.venomClassification}
                            </span>
                          </div>

                          {/* Venom types */}
                          {snake.venomTypes && snake.venomTypes.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {snake.venomTypes.slice(0, 3).map((type) => (
                                <VenomTypeChip key={type} type={type} className="text-xs" />
                              ))}
                              {snake.venomTypes.length > 3 && (
                                <span className="text-xs text-stone-400">
                                  +{snake.venomTypes.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Danger score */}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-stone-500">Danger Score:</span>
                            <span className="text-xs font-semibold text-stone-700">
                              {snake.dangerScore}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function FamilyPage({
  params,
}: {
  params: Promise<{ family: string }>;
}) {
  const { family: familySlug } = await params;
  
  // Convert slug back to family name (e.g., "viperidae" -> "Viperidae")
  const families = getAllFamilies();
  const family = families.find(
    (f) => f.toLowerCase().replace(/\s+/g, "-") === familySlug.toLowerCase()
  );

  if (!family) {
    notFound();
  }

  const groupedSnakes = getSnakesByFamilyGroupedByGenus(family);
  const totalSnakes = Array.from(groupedSnakes.values()).reduce(
    (sum, snakes) => sum + snakes.length,
    0
  );
  const totalGenera = groupedSnakes.size;

  return (
    <div className="min-h-screen bg-background py-8 px-[68px]">
      {/* Back navigation */}
      <div className="mb-6 flex items-center gap-4 flex-wrap text-sm text-stone-600">
        <Link
          href="/"
          className="flex items-center gap-2 hover:text-stone-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-[2.75rem] font-serif font-normal text-[#2c2c2c] leading-tight mb-2">
          {family}
        </h1>
        <p className="text-stone-600 text-lg">
          Phylogenetic tree showing {totalSnakes} {totalSnakes === 1 ? "species" : "species"} across {totalGenera} {totalGenera === 1 ? "genus" : "genera"}
        </p>
      </div>

      {/* Phylogenetic Tree */}
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-md p-8">
        <FamilyPhylogeneticTree family={family} />
      </div>

      {/* Footer Attribution */}
      <div className="text-center mt-8 text-sm text-stone-600">
        <p>
          Researched 🔬 by{" "}
          <a
            href="https://github.com"
            className="hover:text-stone-900 transition-colors no-underline"
          >
            Atharva
          </a>
        </p>
      </div>
    </div>
  );
}
