import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VenomTypeChip } from "@/components/VenomTypeChip";
import { DangerScoreBar } from "@/components/DangerScoreBar";
import { getDangerScoreBadgeColor } from "@/lib/dangerScore";
import type { Snake } from "@/lib/types";

interface SnakeCardProps {
  snake: Snake;
}

export function SnakeCard({ snake }: SnakeCardProps) {
  const rankNumber = snake.dangerRank === "N/A" ? "—" : snake.dangerRank.split("/")[0];
  
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden h-full">
      <CardContent className="p-0">
        <div className="relative h-48 w-full overflow-hidden rounded-t-lg">
          {/* Rank Badge */}
          <div className="absolute top-3 left-3 z-10">
            <Link href="/rank" onClick={(e) => e.stopPropagation()}>
              <Badge 
                className={getDangerScoreBadgeColor(snake.dangerScore) + " text-sm font-bold px-3 py-1 hover:opacity-90 transition-opacity cursor-pointer"}
              >
                #{rankNumber}
              </Badge>
            </Link>
          </div>
          
          {/* Snake image with fallback */}
          <Link href={`/snakes/${snake.id}`}>
            {snake.images?.thumbnail ? (
              <Image
                src={snake.images.thumbnail}
                alt={snake.commonName}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onError={(e) => {
                  // Fallback to emoji on error
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="flex items-center justify-center h-full text-stone-400">
                        <div class="text-center">
                          <div class="text-6xl mb-2">🐍</div>
                          <p class="text-xs">Image coming soon</p>
                        </div>
                      </div>
                    `;
                  }
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-stone-400 rounded-t-lg bg-stone-100">
                <div className="text-center">
                  <div className="text-6xl mb-2">🐍</div>
                  <p className="text-xs">Image coming soon</p>
                </div>
              </div>
            )}
          </Link>
        </div>
        
        <Link href={`/snakes/${snake.id}`} className="block">
          <div className="p-4 space-y-3">
            {/* Snake Name */}
            <div>
              <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                {snake.commonName}
              </h3>
              <p className="text-sm text-muted-foreground italic">
                {snake.scientificName}
              </p>
            </div>
            
            {/* Danger Score Bar */}
            <DangerScoreBar score={snake.dangerScore} showLabel={false} showTooltip />
            
            {/* Venom Types */}
            {snake.venomTypes && snake.venomTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {snake.venomTypes.slice(0, 3).map((type) => (
                  <VenomTypeChip key={type} type={type} />
                ))}
                {snake.venomTypes.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{snake.venomTypes.length - 3}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Non-venomous</div>
            )}
            
            {/* Footer Info */}
            <div className="flex justify-between items-center pt-2 text-xs text-muted-foreground border-t">
              <span>{snake.family}</span>
              <span className="font-medium">Score: {snake.dangerScore}</span>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
