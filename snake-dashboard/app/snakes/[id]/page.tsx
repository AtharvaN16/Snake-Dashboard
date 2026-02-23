import { notFound } from "next/navigation";
import Link from "next/link";
import { existsSync } from "fs";
import { join } from "path";
import {
  getSnakeById,
  getAllSnakes,
  isVenomous,
  getMedianLD50,
} from "@/lib/snakeData";
import { VenomTypeChip } from "@/components/VenomTypeChip";
import { VenomSpeedChip } from "@/components/VenomSpeedChip";
import { VenomYieldChip } from "@/components/VenomYieldChip";
import { FangTypeChip } from "@/components/FangTypeChip";
import { SymptomChip } from "@/components/SymptomChip";
import { DangerScoreWaterfall } from "@/components/DangerScoreWaterfall";
import { VenomPotencyChart } from "@/components/VenomPotencyChart";
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

  const galleryWithAttribution = (snake.images?.gallery ?? [])
    .map((imgSrc, idx) => ({
      imgSrc,
      idx,
      attr: snake.images?.galleryAttributions?.[idx],
    }))
    .filter(({ imgSrc }) => existsSync(join(process.cwd(), "public", imgSrc.replace(/^\//, ""))));
  const galleryImages = galleryWithAttribution.map((item) => item.imgSrc);
  const polaroidImages = [snake.images.primary, ...galleryImages];
  const polaroidAttributions = [
    snake.images.attribution,
    ...galleryWithAttribution.map((item) => item.attr ?? snake.images.attribution),
  ];

  // Use symptoms if present; otherwise derive from symptomsProgression for venomous snakes
  const sp = (snake as { symptomsProgression?: { shortTerm?: string[]; progressive?: string[]; critical?: string[] } }).symptomsProgression;
  const symptomsForDisplay =
    snake.symptoms ??
    (venomous && sp
      ? {
          localEffects: sp.shortTerm ?? [],
          neurological: sp.progressive ?? [],
          blood: sp.critical ?? [],
          muscle: [] as string[],
          gastrointestinal: [] as string[],
        }
      : undefined);

  // Resolve confused snakes for the misidentification warning banner
  const confusedSnakesData =
    snake.misidentificationRisk === "high" && snake.commonlyMisidentifiedAs
      ? snake.commonlyMisidentifiedAs.map((cid) => ({
          id: cid,
          snake: getSnakeById(cid),
        }))
      : [];

  return (
    <div className="min-h-screen py-8 px-[68px]">

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

            {/* Scientific name */}
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
            {/* Common name */}
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

            {/* Taxonomy */}
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

              {/* Misidentified as */}
              {snake.misidentificationRisk === "high" && confusedSnakesData.length > 0 && (() => {
                const isSnakeVenomous = snake.venomClassification !== "Non-venomous";
                const pairs = confusedSnakesData.filter(({ snake: other }) => {
                  if (!other) return true;
                  const otherVenomous = other.venomClassification !== "Non-venomous";
                  if (isSnakeVenomous !== otherVenomous) return true;
                  if (
                    snake.venomClassification === "Highly Venomous" &&
                    (other.venomClassification === "Venomous" ||
                      other.venomClassification === "Moderately Venomous" ||
                      other.venomClassification === "Mildly Venomous")
                  )
                    return true;
                  if (isSnakeVenomous && otherVenomous) return true;
                  return false;
                });
                if (pairs.length === 0) return null;
                return (
                  <p className="flex flex-col items-start mt-4">
                    <span className="font-semibold text-[#000]">Misidentification risk</span>
                    <span className="inline-flex w-full flex-wrap items-center gap-1 mt-3">
                      <span
                        className="font-semibold"
                        style={{
                          padding: "3px 10px",
                          borderRadius: "6px",
                          fontSize: "14px",
                          background: classificationColor,
                          color: "#000000B2",
                        }}
                      >
                        {snake.commonName}
                      </span>
                      <span className="text-stone-400 font-medium select-none" style={{ fontSize: "15px" }}>↔</span>
                      {pairs.map(({ id, snake: other }) => {
                        const exists = other !== undefined;
                        const displayName = other?.commonName || id.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                        const pillStyle = {
                          padding: "3px 10px",
                          borderRadius: "6px",
                          fontSize: "14px",
                          background: exists ? (
                            other.venomClassification === "Highly Venomous" ? "#FF7373" :
                            other.venomClassification === "Venomous" ? "#FFAB73" :
                            other.venomClassification === "Moderately Venomous" ? "#FEF08A" :
                            other.venomClassification === "Mildly Venomous" ? "#B9E948" : "#CCCCCC"
                          ) : "#E5E5E5",
                          color: exists ? "#000000B2" : "#999999",
                          opacity: exists ? 1 : 0.6,
                        };
                        if (exists) {
                          return (
                            <Link key={id} href={`/snakes/${id}`} className="font-semibold transition-opacity hover:opacity-75" style={pillStyle}>
                              {displayName}
                            </Link>
                          );
                        }
                        return <span key={id} className="font-semibold" style={pillStyle} title="Not yet in database">{displayName}</span>;
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

      {/* Main Content Grid */}
      <div className="relative z-20 grid md:grid-cols-3 gap-4">
          {/* Left Column */}
          {venomous && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-6">
                {snake.dangerScoreComponents ? (
                  <DangerScoreWaterfall
                    dangerScore={snake.dangerScore}
                    components={snake.dangerScoreComponents}
                    venomClassification={snake.venomClassification}
                    fangType={snake.fangType}
                  />
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

              <div className="bg-white rounded-xl p-6">
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
                {snake.venomYield && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-[#2c2c2c] mb-3">Venom yield</h3>
                    <VenomYieldChip yield={snake.venomYield} />
                  </div>
                )}
                {snake.venomSpeed && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-[#2c2c2c] mb-3">Venom Speed</h3>
                    <VenomSpeedChip speed={snake.venomSpeed} />
                  </div>
                )}
                {snake.fangType && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-[#2c2c2c] mb-3">Fang Type</h3>
                    <FangTypeChip fangType={snake.fangType} />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-[#2c2c2c] mb-3">Chance of human encounters</h3>
                  <span
                    className="inline-flex font-semibold text-sm px-2 py-1 bg-stone-100 rounded text-black"
                  >
                    {snake.humanEncounterChance}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Right Column */}
          <div className={venomous ? "md:col-span-2" : "md:col-span-3"}>
            <div className="bg-white rounded-xl p-6">
              {venomous && symptomsForDisplay ? (
                <>
                  <h3 className="text-lg font-bold text-[#2c2c2c] mb-4">Clinical Symptoms</h3>
                  <div className="space-y-5">
                    {Object.entries(symptomsForDisplay).map(([key, list]) => (
                      (Array.isArray(list) && list.length > 0 && !(list.length === 1 && list[0] === 'N/A')) ? (
                        <div key={key} className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                          <span className="mt-px">
                            {key === 'localEffects' ? '🩹' : key === 'neurological' ? '🧠' : key === 'blood' ? '🩸' : key === 'muscle' ? '💪' : '🤢'}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-stone-600 mb-2 uppercase tracking-tight text-xs">
                              {key.replace(/([A-Z])/g, ' $1')}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {list.map((s, idx) => <SymptomChip key={s} symptom={s} index={idx} />)}
                            </div>
                          </div>
                        </div>
                      ) : null
                    ))}
                  </div>

                  {snake.causesOfDeath && snake.causesOfDeath.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-stone-200">
                      <div className="grid grid-cols-[auto_1fr] items-start gap-x-3">
                        <span className="mt-px">💀</span>
                        <div>
                          <h4 className="text-sm font-bold text-stone-600 mb-2 uppercase tracking-tight text-xs">Primary Causes of Death</h4>
                          <div className="flex flex-wrap gap-2">
                            {snake.causesOfDeath.map((cause, idx) => (
                              <SymptomChip key={cause} symptom={cause} index={idx} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  {snake.maxLength && (
                    <p className="text-sm text-stone-600"><strong className="font-bold text-black">Max Length:</strong> Up to {snake.maxLength.value} {snake.maxLength.unit}</p>
                  )}
                  {snake.diet && snake.diet.length > 0 && (
                    <p className="text-sm text-stone-600"><strong className="font-bold text-black">Diet:</strong> {snake.diet.join(", ")}</p>
                  )}
                </div>
              )}

              <div className={venomous && symptomsForDisplay ? "mt-6 pt-5 border-t border-stone-200" : ""}>
                <h4 className="text-xs font-bold text-[#2c2c2c] mb-2 uppercase tracking-tight">Habitat</h4>
                <p className="text-sm text-stone-600 mb-1">
                  <strong className="font-semibold">Regions:</strong> {snake.distribution.regions.join(", ")}
                </p>
                <p className="text-xs text-stone-500">{snake.distribution.habitat}</p>
              </div>

              {snake.sources && snake.sources.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-400">
                    <strong className="font-medium">Sources:</strong> {snake.sources.join(", ")}
                  </p>
                </div>
              )}
            </div>

            {venomous && snake.venomPotency && (
              <div className="mt-6">
                <VenomPotencyChart currentSnake={snake} medianLD50={medianLD50} />
              </div>
            )}
          </div>
      </div>

      <div className="relative z-20 text-center mt-8 text-sm text-stone-500">
        <p>Researched 🔬 by Atharva</p>
      </div>
    </div>
  );
}
