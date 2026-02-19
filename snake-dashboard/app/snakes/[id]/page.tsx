import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import {
  getSnakeById,
  getAllSnakes,
  isVenomous,
  getMedianPotencyScore,
} from "@/lib/snakeData";import { VenomTypeChip } from "@/components/VenomTypeChip";
import { VenomSpeedChip } from "@/components/VenomSpeedChip";
import { VenomYieldChip } from "@/components/VenomYieldChip";
import { SymptomChip } from "@/components/SymptomChip";
import { DistributionMap } from "@/components/DistributionMap";
import { DangerScoreWaterfall } from "@/components/DangerScoreWaterfall";
import { LethalityScatterPlot } from "@/components/LethalityScatterPlot";
import { hasRangeMapForSnake } from "@/lib/rangeMaps";
import { ImageCandidatePicker } from "@/components/ImageCandidatePicker";

export async function generateStaticParams() {
  const snakes = getAllSnakes();
  return snakes.map((snake) => ({
    id: snake.id,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snake = getSnakeById(id);
  
  if (!snake) {
    return {
      title: "Snake Not Found",
    };
  }

  return {
    title: `${snake.commonName} (${snake.scientificName}) - Is It Venomous?`,
    description: snake.description || `Information about ${snake.commonName}, including venom characteristics, danger score, and medical data.`,
  };
}

export default async function SnakeDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const snake = getSnakeById(id);

  if (!snake) {
    notFound();
  }

  const medianPotencyScore = getMedianPotencyScore();

  const venomous = isVenomous(snake.venomClassification);
  const classificationLabel = snake.venomClassification;
  const classificationColor =
    snake.venomClassification === "Highly Venomous"
      ? "#FF7373"
      : snake.venomClassification === "Venomous"
      ? "#FFAB73"
      : snake.venomClassification === "Moderately Venomous"
      ? "#FEF08A"
      : snake.venomClassification === "Mildly Venomous"
      ? "#B9E948"
      : "#CCCCCC";
  const hasRangeMap =
    Boolean(snake.distribution.geometry) ||
    Boolean(snake.distribution.rangeGeoJsonPath) ||
    hasRangeMapForSnake(snake.id);

  // Resolve confused snakes for the misidentification warning banner
  // Keep all IDs even if they don't exist in database (will show as faded pills)
  const confusedSnakesData =
    snake.misidentificationRisk === "high" && snake.commonlyMisidentifiedAs
      ? snake.commonlyMisidentifiedAs.map((cid) => ({
          id: cid,
          snake: getSnakeById(cid),
        }))
      : [];

  return (
    <div className="min-h-screen bg-background py-8 px-[68px]">

      {/* Distribution map fixed to top-right (only when range data exists) */}
      {hasRangeMap && (
        <div
          className="fixed top-0 right-0 w-[540px] h-[580px] pointer-events-none z-0 overflow-hidden"
          style={{
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 26%), linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
            maskImage:
              "linear-gradient(to right, transparent 0%, black 26%), linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
            WebkitMaskComposite: "destination-in",
            maskComposite: "intersect",
          }}
        >
          <div className="w-full h-full">
            <DistributionMap
              distribution={snake.distribution}
              snakeId={snake.id}
              width={540}
              height={580}
            />
          </div>
        </div>
      )}

      {/* Back + keyboard shortcut hints */}
      <div className="relative z-20 mb-6 flex items-center gap-4 flex-wrap text-sm text-stone-600">
        <span className="flex items-center gap-2">
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
        <span className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 rounded bg-stone-200 text-stone-800 font-mono shadow-sm">
            Space
          </kbd>
          <span>Search another snake</span>
        </span>
      </div>

      {/* Snake Info Card - hug content so map stays visible */}
      <div className="relative z-20 rounded-xl p-6 mb-6 max-w-[760px]">
          {/* Classification label at the very top */}
          <div style={{ marginBottom: "28px", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span
              className="inline-flex font-bold text-base"
              style={{
                padding: "4px 8px",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
                borderRadius: "4px",
                backgroundColor: classificationColor,
                color: "#000000B2",
              }}
            >
              {classificationLabel}
            </span>
            {snake.clinicalData?.fatalitySummary === "Rarely Fatal" && (
              <span
                className="inline-flex font-bold text-base"
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  backgroundColor: "#E0E7FF", // Indigo-100
                  color: "#3730A3", // Indigo-800
                }}
              >
                Rarely Fatal
              </span>
            )}
            {snake.accolades && snake.accolades.map(accolade => (
              <span
                key={accolade}
                className="inline-flex font-bold text-base"
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  backgroundColor: "#FDE68A", // Yellow-300
                  color: "#78350F", // Amber-900
                }}
              >
                {accolade}
              </span>
            ))}
          </div>

          {/* Scientific name: rgba(0,0,0,0.70), Inter, 20px, italic, 600 */}
          <p 
            style={{
              color: "rgba(0, 0, 0, 0.70)",
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontSize: "20px",
              fontStyle: "italic",
              fontWeight: 600,
              lineHeight: "normal",
              marginBottom: "4px",
            }}
          >
            {snake.scientificName}
          </p>
          {/* Common name: #000, Inter, 32px, normal, 800 */}
          <h1 
            style={{
              color: "#000",
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontSize: "32px",
              fontStyle: "normal",
              fontWeight: 800,
              lineHeight: "normal",
              marginBottom: "12px",
            }}
          >
            {snake.commonName}
          </h1>
          
          {snake.description && (
            <p 
              className="text-stone-600 leading-relaxed max-w-[440px]"
              style={{ marginBottom: "20px", fontSize: "16px" }}
            >
              {snake.description}
            </p>
          )}

          {/* Taxonomy - Labels: 18px semi-bold; Values: 18px regular, black 70% */}
          <div 
            style={{
              fontFamily: "var(--font-inter), Inter, sans-serif",
              fontSize: "18px",
            }}
          >
            {snake.otherCommonNames && snake.otherCommonNames.length > 0 && (
              <p style={{ marginBottom: "14px", display: "flex", alignItems: "baseline" }}>
                <span className="font-semibold text-[#000]" style={{ minWidth: "90px" }}>Also Known As</span>
                <span 
                  style={{ fontWeight: 400, color: "rgba(0, 0, 0, 0.7)", marginLeft: "24px" }}
                >
                  {snake.otherCommonNames.join(", ")}
                </span>
              </p>
            )}
            <p style={{ marginBottom: "18px", display: "flex", alignItems: "baseline" }}>
              <span className="font-semibold text-[#000]" style={{ minWidth: "90px" }}>Family</span>
              <Link
                href={`/phylogeny?snakeId=${snake.id}`}
                className="underline hover:text-stone-900 transition-colors"
                style={{ fontWeight: 400, color: "rgba(0, 0, 0, 0.7)" }}
              >
                {snake.family}
              </Link>
            </p>
            <p style={{ marginBottom: "14px", display: "flex", alignItems: "baseline" }}>
              <span className="font-semibold text-[#000]" style={{ minWidth: "90px" }}>Genus</span>
              <span 
                style={{ fontWeight: 400, color: "rgba(0, 0, 0, 0.7)" }}
              >
                {snake.genus}
              </span>
            </p>
            <p style={{ marginBottom: "14px", display: "flex", alignItems: "baseline" }}>
              <span className="font-semibold text-[#000]" style={{ minWidth: "90px" }}>Region</span>
              <span
                className="inline-flex flex-wrap items-center"
                style={{ gap: "16px" }}
              >
                <Link
                  href={`/rank?region=${encodeURIComponent(snake.continent)}`}
                  className="underline hover:text-stone-900 transition-colors"
                  style={{ fontWeight: 400, color: "rgba(0, 0, 0, 0.7)" }}
                >
                  {snake.continent}
                </Link>
                <span style={{ fontWeight: 400, color: "rgba(0, 0, 0, 0.3)" }}>
                  {snake.subregions.join(", ")}
                </span>
              </span>
            </p>

            {/* Misidentified as — inline pill pairs below Region */}
            {snake.misidentificationRisk === "high" && confusedSnakesData.length > 0 && (() => {
              const isSnakeVenomous = snake.venomClassification !== "Non-venomous";
              const pairs = confusedSnakesData.filter(({ snake: other }) => {
                if (!other) return true; // Include non-existent snakes
                const otherVenomous = other.venomClassification !== "Non-venomous";
                // Show if: venomous ↔ non-venomous OR highly venomous ↔ moderately/mildly venomous
                // OR both are venomous (still dangerous confusion even if same level)
                if (isSnakeVenomous !== otherVenomous) return true;
                if (
                  snake.venomClassification === "Highly Venomous" &&
                  (other.venomClassification === "Venomous" ||
                    other.venomClassification === "Moderately Venomous" ||
                    other.venomClassification === "Mildly Venomous")
                )
                  return true;
                // Include venomous ↔ venomous pairs (e.g. copperhead ↔ cottonmouth)
                if (isSnakeVenomous && otherVenomous) return true;
                return false;
              });
              if (pairs.length === 0) return null;
              return (
                <p className="flex items-center flex-wrap gap-y-1">
                  <span className="font-semibold text-[#000]">Misidentification risk</span>
                  <span
                    className="inline-flex flex-wrap items-center"
                    style={{ marginLeft: "24px", gap: "4px" }}
                  >
                    {/* Current snake — rendered once */}
                    <span
                      className="font-semibold"
                      style={{
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontSize: "14px",
                        background: snake.venomClassification === "Highly Venomous"
                          ? "#FF7373"
                          : snake.venomClassification === "Venomous"
                          ? "#FFAB73"
                          : snake.venomClassification === "Moderately Venomous"
                          ? "#FEF08A"
                          : snake.venomClassification === "Mildly Venomous"
                          ? "#B9E948"
                          : "#CCCCCC",
                        color: "#000000B2",
                      }}
                    >
                      {snake.commonName}
                    </span>
                    <span className="text-stone-400 font-medium select-none" style={{ fontSize: "15px" }}>↔</span>
                    {/* All confused snakes */}
                    {pairs.map(({ id, snake: other }) => {
                      const exists = other !== undefined;
                      const displayName = other?.commonName || id.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                      
                      // Get correct color based on venom classification
                      const getPillColor = (classification: string | undefined) => {
                        if (!classification) return "#E5E5E5";
                        if (classification === "Highly Venomous") return "#FF7373";
                        if (classification === "Venomous") return "#FFAB73";
                        if (classification === "Moderately Venomous") return "#FEF08A";
                        if (classification === "Mildly Venomous") return "#B9E948";
                        return "#CCCCCC";
                      };
                      
                      const pillStyle = {
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontSize: "14px",
                        background: getPillColor(other?.venomClassification),
                        color: exists ? "#000000B2" : "#999999", // Lighter text for non-existent
                        opacity: exists ? 1 : 0.6,
                      };

                      if (exists) {
                        return (
                          <Link
                            key={id}
                            href={`/snakes/${id}`}
                            className="font-semibold transition-opacity hover:opacity-75"
                            style={pillStyle}
                          >
                            {displayName}
                          </Link>
                        );
                      } else {
                        return (
                          <span
                            key={id}
                            className="font-semibold"
                            style={pillStyle}
                            title="Not yet in database"
                          >
                            {displayName}
                          </span>
                        );
                      }
                    })}
                  </span>
                </p>
              );
            })()}
          </div>
      </div>

      {/* Hero Image Section */}
      {snake.images?.primary && (
        <>
          <div className="relative z-20 mb-4 max-w-[760px] w-full aspect-[760/450] rounded-xl overflow-hidden">
            <Image
              src={snake.images.primary}
              alt={`${snake.commonName} (${snake.scientificName})`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 760px"
              priority
            />
          </div>

          {/* Attribution */}
          {snake.images.attribution && (
            <div className="relative z-20 mb-6 max-w-[760px] text-xs text-stone-500">
              <p>
                <strong className="font-medium">Photo:</strong>{" "}
                {snake.images.attribution.photographer || "Unknown"} •{" "}
                <strong className="font-medium">Source:</strong>{" "}
                {snake.images.attribution.sourceUrl ? (
                  <a
                    href={snake.images.attribution.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-stone-700 underline"
                  >
                    {snake.images.attribution.source}
                  </a>
                ) : (
                  snake.images.attribution.source
                )}
                {" • "}
                <strong className="font-medium">License:</strong>{" "}
                {snake.images.attribution.licenseUrl ? (
                  <a
                    href={snake.images.attribution.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-stone-700 underline"
                  >
                    {snake.images.attribution.license}
                  </a>
                ) : (
                  snake.images.attribution.license
                )}
              </p>
            </div>
          )}
        </>
      )}

      {process.env.NODE_ENV !== "production" && (
        <ImageCandidatePicker snakeId={snake.id} />
      )}

      {/* Gallery Section */}
      {snake.images?.gallery && snake.images.gallery.length > 0 && (
        <div className="relative z-20 rounded-xl bg-white p-6 mb-6 max-w-[760px]">
          <h3 className="text-sm font-bold text-[#2c2c2c] mb-4">Additional Images</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {snake.images.gallery.map((imgSrc, idx) => (
              <div key={idx} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-stone-100">
                <Image
                  src={imgSrc}
                  alt={`${snake.commonName} - view ${idx + 1}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform cursor-pointer"
                  sizes="(max-width: 768px) 50vw, 250px"
                />
              </div>
            ))}
          </div>
          
          {/* Attribution for gallery images if different from primary */}
          {snake.images.galleryAttributions && snake.images.galleryAttributions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-200 text-xs text-stone-500">
              <p className="font-medium mb-2">Gallery image credits:</p>
              {snake.images.galleryAttributions.map((attr, idx) => (
                <p key={idx} className="mb-1">
                  Image {idx + 1}: {attr.photographer || "Unknown"} ({attr.source})
                  {attr.licenseUrl && (
                    <>
                      {" • "}
                      <a
                        href={attr.licenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-stone-700 underline"
                      >
                        {attr.license}
                      </a>
                    </>
                  )}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="relative z-20 grid md:grid-cols-3 gap-4">
          {/* Left Column - Venom Attributes Card (venomous only) */}
          {venomous && (
            <div>
              <div className="bg-white rounded-xl p-6">
                {/* Danger Score — waterfall chart */}
                <div className="mb-6">
                  {snake.dangerScoreComponents ? (
                    <>
                      <DangerScoreWaterfall
                        dangerScore={snake.dangerScore}
                        components={snake.dangerScoreComponents}
                        venomClassification={snake.venomClassification}
                      />
                      <LethalityScatterPlot
                        currentSnakeId={snake.id}
                        allSnakes={getAllSnakes()}
                      />
                    </>
                  ) : (
                    <div>
                      <h3 className="text-sm font-bold text-[#2c2c2c] mb-2">Danger Score</h3>
                      <span className="text-lg font-extrabold">{snake.dangerScore}</span>
                      <span className="text-xs text-stone-400">/100</span>
                    </div>
                  )}
                  <Link
                    href={`/rank?view=danger&snakeId=${snake.id}`}
                    className="block mt-2 text-xs text-center text-stone-400 hover:text-stone-600 transition-colors no-underline"
                  >
                    Rank: {snake.dangerRank} · View full rankings →
                  </Link>
                </div>

                {/* Venom potency (LD₅₀) */}
                {snake.venomPotency && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-[#2c2c2c] mb-3">Venom potency (LD₅₀)</h3>
                    <Link
                      href={`/rank?view=potency&snakeId=${snake.id}`}
                      className="block rounded-lg p-2 -m-2 hover:bg-stone-50 transition-colors no-underline overflow-visible"
                    >
                      <div className="relative pt-8 max-w-md px-8 overflow-visible">
                        <div className="h-3 bg-stone-200 rounded-full overflow-visible relative">
                          <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-red-500 via-orange-400 to-green-500 rounded-full overflow-hidden" />
                          <div
                            className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-8 bg-stone-600/70"
                            style={{ left: `${Math.min(100, Math.max(0, 100 - medianPotencyScore))}%` }}
                          />
                          <span
                            className="absolute left-0 bottom-full -translate-x-1/2 text-[10px] font-medium text-stone-500 whitespace-nowrap mb-4"
                            style={{ left: `${Math.min(100, Math.max(0, 100 - medianPotencyScore))}%` }}
                          >
                            Median
                          </span>
                          <div
                            className="absolute top-full left-0 flex flex-col items-center -translate-x-1/2"
                            style={{
                              left: `${Math.min(100, Math.max(0, 100 - (snake.dangerScoreComponents?.potencyScore ?? 0)))}%`,
                              marginTop: "6px",
                            }}
                          >
                            <div
                              className="relative inline-flex items-center justify-center font-semibold text-sm px-2.5 py-1 rounded-[6px] text-[#2c2c2c]"
                              style={{ backgroundColor: "#E5E5E5" }}
                            >
                              <div
                                className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[7px]"
                                style={{ borderBottomColor: "#E5E5E5" }}
                                aria-hidden
                              />
                              ~{snake.venomPotency.ld50Range}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-center text-stone-400 mt-16">View potency ladder →</p>
                    </Link>
                  </div>
                )}

                {/* Venom Type */}
                {snake.venomTypes && snake.venomTypes.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-[#2c2c2c] mb-3">Venom Type</h3>
                    <div className="flex flex-wrap gap-2">
                      {snake.venomTypes.map((type) => (
                        <VenomTypeChip key={type} type={type} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Venom yield */}
                {snake.venomYield && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-[#2c2c2c] mb-3">Venom yield</h3>
                    <VenomYieldChip yield={snake.venomYield} />
                  </div>
                )}

                {/* Venom Speed */}
                {snake.venomSpeed && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-[#2c2c2c] mb-3">Venom Speed</h3>
                    <VenomSpeedChip speed={snake.venomSpeed} />
                  </div>
                )}

                {/* Chance of human encounters */}
                <div>
                  <h3 className="text-sm font-bold text-[#2c2c2c] mb-3">Chance of human encounters</h3>
                  <span
                    className="inline-flex font-semibold text-sm"
                    style={{
                      padding: "4px 8px",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "10px",
                      borderRadius: "4px",
                      backgroundColor: "#E5E5E5",
                      color: "#000",
                    }}
                  >
                    {snake.humanEncounterChance}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Right Column - Symptoms (venomous) or Info (non-venomous) */}
          <div className={venomous ? "md:col-span-2" : "md:col-span-3"}>
            <div className="bg-white rounded-xl p-6">
              {venomous && snake.symptoms ? (
                <>
                  <h3 className="text-lg font-bold text-[#2c2c2c] mb-4">Clinical Symptoms</h3>
                  <div className="space-y-5">
                    {snake.symptoms.localEffects && snake.symptoms.localEffects.length > 0 && !(snake.symptoms.localEffects.length === 1 && snake.symptoms.localEffects[0] === 'N/A') && (
                      <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                        <span className="mt-px">🩹</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-600 mb-2">Local Effects</h4>
                          <div className="flex flex-wrap gap-2">
                            {snake.symptoms.localEffects.map((symptom) => (
                              <SymptomChip key={symptom} symptom={symptom} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {snake.symptoms.neurological && snake.symptoms.neurological.length > 0 && !(snake.symptoms.neurological.length === 1 && snake.symptoms.neurological[0] === 'N/A') && (
                       <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                        <span className="mt-px">🧠</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-600 mb-2">Neurological</h4>
                          <div className="flex flex-wrap gap-2">
                            {snake.symptoms.neurological.map((symptom) => (
                              <SymptomChip key={symptom} symptom={symptom} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                     {snake.symptoms.blood && snake.symptoms.blood.length > 0 && !(snake.symptoms.blood.length === 1 && snake.symptoms.blood[0] === 'N/A') && (
                       <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                        <span className="mt-px">🩸</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-600 mb-2">Blood & Circulation</h4>
                          <div className="flex flex-wrap gap-2">
                            {snake.symptoms.blood.map((symptom) => (
                              <SymptomChip key={symptom} symptom={symptom} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {snake.symptoms.muscle && snake.symptoms.muscle.length > 0 && !(snake.symptoms.muscle.length === 1 && snake.symptoms.muscle[0] === 'N/A') && (
                       <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                        <span className="mt-px">💪</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-600 mb-2">Muscle & Kidney</h4>
                          <div className="flex flex-wrap gap-2">
                            {snake.symptoms.muscle.map((symptom) => (
                              <SymptomChip key={symptom} symptom={symptom} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {snake.symptoms.gastrointestinal && snake.symptoms.gastrointestinal.length > 0 && !(snake.symptoms.gastrointestinal.length === 1 && snake.symptoms.gastrointestinal[0] === 'N/A') && (
                       <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                        <span className="mt-px">🤢</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-600 mb-2">Gastrointestinal</h4>
                          <div className="flex flex-wrap gap-2">
                            {snake.symptoms.gastrointestinal.map((symptom) => (
                              <SymptomChip key={symptom} symptom={symptom} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {snake.causesOfDeath && snake.causesOfDeath.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-stone-200">
                      <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                        <span className="mt-px">💀</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-600 mb-2">Primary Causes of Death</h4>
                          <div className="flex flex-wrap gap-2">
                            {snake.causesOfDeath.map((cause) => (
                              <SymptomChip key={cause} symptom={cause} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {(snake.maxLength || snake.diet || snake.constrictor) && (
                    <div className="mb-6 space-y-4">
                      {snake.maxLength && (
                        <div>
                          <h4 className="text-xs font-bold text-[#2c2c2c] mb-1">Max Length</h4>
                          <p className="text-sm text-stone-600">
                            Up to {snake.maxLength.value} {snake.maxLength.unit}
                          </p>
                        </div>
                      )}
                      {snake.constrictor && (
                        <div>
                          <h4 className="text-xs font-bold text-[#2c2c2c] mb-1">Method</h4>
                          <p className="text-sm text-stone-600">Constrictor (kills prey by constriction)</p>
                        </div>
                      )}
                      {snake.diet && snake.diet.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold text-[#2c2c2c] mb-1">Diet</h4>
                          <p className="text-sm text-stone-600">{snake.diet.join(", ")}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Habitat / regions info */}
              <div className={venomous && snake.symptoms ? "mt-6 pt-5 border-t border-stone-200" : ""}>
                <h4 className="text-xs font-bold text-[#2c2c2c] mb-2">Habitat</h4>
                <p className="text-sm text-stone-600 mb-1">
                  <strong className="font-semibold">Regions:</strong> {snake.distribution.regions.join(", ")}
                </p>
                <p className="text-xs text-stone-500">{snake.distribution.habitat}</p>
              </div>

              {/* Commonly misidentified as */}
              {snake.commonlyMisidentifiedAs && snake.commonlyMisidentifiedAs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-200">
                  <h4 className="text-xs font-bold text-[#2c2c2c] mb-2">Commonly misidentified as</h4>
                  <ul className="space-y-1">
                    {snake.commonlyMisidentifiedAs.map((misidentifiedId) => {
                      const misidentifiedSnake = getSnakeById(misidentifiedId);
                      if (!misidentifiedSnake) return null;
                      return (
                        <li key={misidentifiedId} className="text-sm text-stone-600">
                          <Link
                            href={`/snakes/${misidentifiedId}`}
                            className="hover:text-stone-800 hover:underline transition-colors"
                          >
                            {misidentifiedSnake.commonName}
                            <span className="text-xs text-stone-400 italic ml-1">
                              ({misidentifiedSnake.scientificName})
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Sources */}
              {snake.sources && snake.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-400">
                    <strong className="font-medium">Sources:</strong> {snake.sources.join(", ")}
                  </p>
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Bottom Right Text - venomous only */}
      {venomous && (
        <div className="relative z-20 text-right mt-4">
          <p className="text-sm text-stone-500">What to do if bitten?</p>
        </div>
      )}

      {/* Footer Attribution */}
      <div className="relative z-20 text-center mt-8 text-sm text-stone-500">
        <p>
          Researched 🔬 by{" "}
          <a 
            href="https://github.com" 
            className="hover:text-stone-700 transition-colors"
          >
            Atharva
          </a>
        </p>
      </div>
    </div>
  );
}
