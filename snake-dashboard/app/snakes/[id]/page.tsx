import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { existsSync } from "fs";
import { join } from "path";
import { ChevronLeft } from "lucide-react";
import {
  getSnakeById,
  getAllSnakes,
  isVenomous,
  getMedianLD50,
} from "@/lib/snakeData";import { VenomTypeChip } from "@/components/VenomTypeChip";
import { VenomSpeedChip } from "@/components/VenomSpeedChip";
import { VenomYieldChip } from "@/components/VenomYieldChip";
import { FangTypeChip } from "@/components/FangTypeChip";
import { SymptomChip } from "@/components/SymptomChip";
import { DistributionMap } from "@/components/DistributionMap";
import { DangerScoreWaterfall } from "@/components/DangerScoreWaterfall";
import { VenomPotencyChart } from "@/components/VenomPotencyChart";
import { hasRangeMapForSnake } from "@/lib/rangeMaps";
import { ImageCandidatePicker } from "@/components/ImageCandidatePicker";
import { Kbd } from "@/components/ui/kbd";
import { PolaroidStack } from "@/components/PolaroidStack";

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

  const medianLD50 = getMedianLD50();

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

  const galleryWithAttribution = (snake.images?.gallery ?? [])
    .map((imgSrc, idx) => ({
      imgSrc,
      idx,
      attr: snake.images?.galleryAttributions?.[idx],
    }))
    .filter(({ imgSrc }) => existsSync(join(process.cwd(), "public", imgSrc.replace(/^\//, ""))));
  const galleryImages = galleryWithAttribution.map((item) => item.imgSrc);
  const galleryAttributions = galleryWithAttribution
    .map((item) => item.attr)
    .filter((attr): attr is NonNullable<typeof attr> => Boolean(attr));
  const polaroidImages = [snake.images.primary, ...galleryImages];
  const polaroidAttributions = [
    snake.images.attribution,
    ...galleryWithAttribution.map((item) => item.attr ?? snake.images.attribution),
  ];

  // Use symptoms if present; otherwise derive from symptomsProgression for venomous snakes
  const sp = (snake as { symptomsProgression?: { short?: string[]; prog?: string[]; crit?: string[] } }).symptomsProgression;
  const symptomsForDisplay =
    snake.symptoms ??
    (venomous && sp
      ? {
          localEffects: sp.short ?? [],
          neurological: sp.prog ?? [],
          blood: sp.crit ?? [],
          muscle: [] as string[],
          gastrointestinal: [] as string[],
        }
      : undefined);

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
          <Kbd triggerKey="Escape">Esc</Kbd>
          <Link
            href="/"
            className="hover:text-stone-800 transition-colors"
          >
            Back
          </Link>
        </span>
        <span className="flex items-center gap-2">
          <Kbd triggerKey=" ">Space</Kbd>
          <span>Search another snake</span>
        </span>
      </div>

      {/* Snake Info Card + Polaroid photo */}
      <div className="relative z-20 rounded-xl p-6 mb-6 max-w-[980px]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="lg:max-w-[500px]">
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
              {(snake.clinicalData?.fatalitySummary === "Rarely Fatal" || snake.causesOfDeath?.includes("Rarely Fatal")) && (
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
              {snake.constrictor && (
                <span
                  className="inline-flex font-bold text-base"
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    backgroundColor: "#A7F3D0", // Emerald-200
                    color: "#064E3B", // Emerald-900
                  }}
                >
                  Constrictor
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

            {/* Scientific name: light grey, Inter, 20px, italic, 600 */}
            <p
              style={{
                color: "rgba(0, 0, 0, 0.45)",
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
            {/* Common name: #000, Inter, 40px, normal, 800 */}
            <h1
              style={{
                color: "#000",
                fontFamily: "var(--font-inter), Inter, sans-serif",
                fontSize: "40px",
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
                style={{ marginBottom: "40px", fontSize: "16px" }}
              >
                {snake.description}
              </p>
            )}

            {/* Taxonomy - Labels: 16px semi-bold; Values: 16px regular, black 70% */}
            <div
              style={{
                fontFamily: "var(--font-inter), Inter, sans-serif",
                fontSize: "16px",
              }}
            >
              {snake.otherCommonNames && snake.otherCommonNames.length > 0 && (
                <p style={{ marginBottom: "14px", display: "flex", alignItems: "baseline" }}>
                  <span className="font-semibold text-[#000]" style={{ minWidth: "90px" }}>Also Known As</span>
                  <span
                    style={{ fontWeight: 400, color: "rgba(0, 0, 0, 0.7)", marginLeft: "24px" }}
                  >
                    {snake.otherCommonNames[0]}
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
                  {(snake.continent || snake.distribution?.regions?.length) ? (
                    <>
                      <Link
                        href={`/rank?region=${encodeURIComponent(snake.continent ?? snake.distribution?.regions?.[0] ?? "")}`}
                        className="underline hover:text-stone-900 transition-colors"
                        style={{ fontWeight: 400, color: "rgba(0, 0, 0, 0.7)" }}
                      >
                        {snake.continent ?? snake.distribution?.regions?.[0]}
                      </Link>
                      <span style={{ fontWeight: 400, color: "rgba(0, 0, 0, 0.3)" }}>
                        {(Array.isArray(snake.subregions) ? snake.subregions : snake.distribution?.regions)?.join(", ") ?? ""}
                      </span>
                    </>
                  ) : null}
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
                  <p className="flex flex-col items-start">
                    <span className="font-semibold text-[#000]">Misidentification risk</span>
                    <span
                      className="inline-flex w-full flex-wrap items-center gap-1 mt-4"
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
                          color: exists ? "#000000B2" : "#999999",
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

          {snake.images?.primary && (
            <div className="mx-auto w-full max-w-[420px] lg:mx-0 lg:w-[420px] lg:flex-none">
              <PolaroidStack
                images={polaroidImages}
                caption={snake.commonName}
                attributions={polaroidAttributions}
              />
            </div>
          )}
        </div>
      </div>

      {process.env.NODE_ENV !== "production" && (
        <ImageCandidatePicker snakeId={snake.id} />
      )}

      {/* Gallery Section */}
      {galleryImages.length > 0 && (
        <div className="relative z-20 rounded-xl bg-white p-6 mb-6 max-w-[760px]">
          <h3 className="text-sm font-bold text-[#2c2c2c] mb-4">Additional Images</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {galleryImages.map((imgSrc, idx) => (
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
          {galleryAttributions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-200 text-xs text-stone-500">
              <p className="font-medium mb-2">Gallery image credits:</p>
              {galleryAttributions.map((attr, idx) => (
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
          {/* Left Column - Danger Score & Venom cards (venomous only) */}
          {venomous && (
            <div className="space-y-4">
              {/* Danger Score card */}
              <div className="bg-white rounded-xl p-6">
                {snake.dangerScoreComponents ? (
                  <>
                    <DangerScoreWaterfall
                      dangerScore={snake.dangerScore}
                      components={snake.dangerScoreComponents}
                      venomClassification={snake.venomClassification}
                      fangType={snake.fangType}
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

              {/* Venom & encounter attributes card */}
              <div className="bg-white rounded-xl p-6">
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

                {/* Fang Type */}
                {snake.fangType && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-[#2c2c2c] mb-3">Fang Type</h3>
                    <FangTypeChip fangType={snake.fangType} />
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
              {venomous && symptomsForDisplay ? (
                <>
                  <h3 className="text-lg font-bold text-[#2c2c2c] mb-4">Clinical Symptoms</h3>
                  <div className="space-y-5">
                    {symptomsForDisplay.localEffects && symptomsForDisplay.localEffects.length > 0 && !(symptomsForDisplay.localEffects.length === 1 && symptomsForDisplay.localEffects[0] === 'N/A') && (
                      <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                        <span className="mt-px">🩹</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-600 mb-2">Local Effects</h4>
                          <div className="flex flex-wrap gap-2">
                            {symptomsForDisplay.localEffects.map((symptom) => (
                              <SymptomChip key={symptom} symptom={symptom} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {symptomsForDisplay.neurological && symptomsForDisplay.neurological.length > 0 && !(symptomsForDisplay.neurological.length === 1 && symptomsForDisplay.neurological[0] === 'N/A') && (
                       <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                        <span className="mt-px">🧠</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-600 mb-2">Neurological</h4>
                          <div className="flex flex-wrap gap-2">
                            {symptomsForDisplay.neurological.map((symptom) => (
                              <SymptomChip key={symptom} symptom={symptom} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                     {symptomsForDisplay.blood && symptomsForDisplay.blood.length > 0 && !(symptomsForDisplay.blood.length === 1 && symptomsForDisplay.blood[0] === 'N/A') && (
                       <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                        <span className="mt-px">🩸</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-600 mb-2">Blood & Circulation</h4>
                          <div className="flex flex-wrap gap-2">
                            {symptomsForDisplay.blood.map((symptom) => (
                              <SymptomChip key={symptom} symptom={symptom} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {symptomsForDisplay.muscle && symptomsForDisplay.muscle.length > 0 && !(symptomsForDisplay.muscle.length === 1 && symptomsForDisplay.muscle[0] === 'N/A') && (
                       <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                        <span className="mt-px">💪</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-600 mb-2">Muscle & Kidney</h4>
                          <div className="flex flex-wrap gap-2">
                            {symptomsForDisplay.muscle.map((symptom) => (
                              <SymptomChip key={symptom} symptom={symptom} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {symptomsForDisplay.gastrointestinal && symptomsForDisplay.gastrointestinal.length > 0 && !(symptomsForDisplay.gastrointestinal.length === 1 && symptomsForDisplay.gastrointestinal[0] === 'N/A') && (
                       <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                        <span className="mt-px">🤢</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-600 mb-2">Gastrointestinal</h4>
                          <div className="flex flex-wrap gap-2">
                            {symptomsForDisplay.gastrointestinal.map((symptom) => (
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
              <div className={venomous && symptomsForDisplay ? "mt-6 pt-5 border-t border-stone-200" : ""}>
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

            {/* Detailed Venom Potency (Logarithmic Distribution) */}
            {venomous && snake.venomPotency && (
              <div className="mt-6">
                <VenomPotencyChart currentSnake={snake} medianLD50={medianLD50} />
              </div>
            )}
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
