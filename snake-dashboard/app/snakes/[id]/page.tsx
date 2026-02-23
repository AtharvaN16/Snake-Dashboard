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
import { DangerScoreWaterfall } from "@/components/DangerScoreWaterfall";
import { VenomPotencyChart } from "@/components/VenomPotencyChart";
import { ImageCandidatePicker } from "@/components/ImageCandidatePicker";
import { Kbd } from "@/components/ui/kbd";
import { PolaroidStack } from "@/components/PolaroidStack";
import { VenomPaperCard } from "@/components/VenomPaperCard";
import { ClinicalSymptomsCard } from "@/components/ClinicalSymptomsCard";

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
    ...galleryWithAttribution.map((item) => item.attr || snake.images.attribution),
  ];

  const tapeImage = Math.random() < 0.5 ? '/paper/scotch-tape-09.webp' : '/paper/scotch-tape-12.webp';

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
      <div className="relative z-20 mb-3 flex items-center gap-4 flex-wrap text-sm text-stone-600">
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
      {/* pt-12 gives space for the tape SVG that sits in the padding zone above the paper */}
      <div className="relative z-20 mb-6 max-w-[980px] pt-12">
        {/* Scotch tape — sits above the paper, slightly higher */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tapeImage}
          alt=""
          aria-hidden
          className="absolute top-1 -translate-x-1/2 z-20 pointer-events-none select-none"
          style={{ width: "200px", height: "auto", left: "calc(50% - 54px)" }}
        />

        {/* Paper card — transparent container, no clipping so torn edges show */}
        <div className="relative pt-10 pb-6 pl-9 pr-6 bg-transparent">
          {/* Paper 48 background — div stretches with content height automatically */}
          <div
            aria-hidden
            className="absolute pointer-events-none select-none"
            style={{
              left: "-68px",
              top: "-52px",
              right: "100px",
              bottom: "-210px",
              backgroundImage: "url('/paper/paper-48.webp')",
              backgroundSize: "cover",
              backgroundPosition: "left top",
            }}
          />

          {/* Content */}
          <div className="relative z-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="lg:max-w-[500px]">
                {/* Classification tags */}
                <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span
                    className="inline-flex"
                    style={{
                      padding: "3px 8px 2px",
                      borderRadius: "4px",
                      backgroundColor: classificationColor,
                      color: "#000000B2",
                      fontFamily: "var(--font-pangram-compressed), system-ui, sans-serif",
                      fontWeight: 800,
                      fontSize: "15px",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {classificationLabel}
                  </span>
                  {(snake.clinicalData?.fatalitySummary === "Rarely Fatal" || snake.causesOfDeath?.includes("Rarely Fatal")) && (
                    <span
                      className="inline-flex"
                      style={{
                        padding: "3px 8px 2px",
                        borderRadius: "4px",
                        backgroundColor: "#E0E7FF",
                        color: "#3730A3",
                        fontFamily: "var(--font-pangram-compressed), system-ui, sans-serif",
                        fontWeight: 800,
                        fontSize: "15px",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      Rarely Fatal
                    </span>
                  )}
                  {snake.constrictor && (
                    <span
                      className="inline-flex"
                      style={{
                        padding: "3px 8px 2px",
                        borderRadius: "4px",
                        backgroundColor: "#A7F3D0",
                        color: "#064E3B",
                        fontFamily: "var(--font-pangram-compressed), system-ui, sans-serif",
                        fontWeight: 800,
                        fontSize: "15px",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      Constrictor
                    </span>
                  )}
                  {snake.accolades && snake.accolades.map(accolade => (
                    <span
                      key={accolade}
                      className="inline-flex"
                      style={{
                        padding: "3px 8px 2px",
                        borderRadius: "4px",
                        backgroundColor: "#FDE68A",
                        color: "#78350F",
                        fontFamily: "var(--font-pangram-compressed), system-ui, sans-serif",
                        fontWeight: 800,
                        fontSize: "15px",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
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
                    fontFamily: "var(--font-pangram-slim), system-ui, sans-serif",
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
                    fontFamily: "var(--font-pangram-compressed), system-ui, sans-serif",
                    fontSize: "52px",
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
                    fontFamily: "var(--font-pangram-sans), system-ui, sans-serif",
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
        </div>
      </div>

      {process.env.NODE_ENV !== "production" && (
        <ImageCandidatePicker snakeId={snake.id} />
      )}

      {/* Floating overlays — slide up from bottom */}
      {venomous && <VenomPaperCard snake={snake} />}
      {venomous && symptomsForDisplay && (
        <ClinicalSymptomsCard
          symptoms={symptomsForDisplay}
          causesOfDeath={snake.causesOfDeath}
        />
      )}

      {/* Main Content Grid */}
      <div className="relative z-20 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left/Top: Danger Analysis */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-stone-400 uppercase tracking-[0.2em]">Danger Analysis</h3>
                <span className="text-[10px] font-black bg-stone-100 text-stone-500 px-2 py-0.5 rounded uppercase tracking-widest">
                  RANK {snake.dangerRank}
                </span>
              </div>
              
              {snake.dangerScoreComponents ? (
                <DangerScoreWaterfall
                  dangerScore={snake.dangerScore}
                  components={snake.dangerScoreComponents}
                  venomClassification={snake.venomClassification}
                  fangType={snake.fangType}
                />
              ) : (
                <div className="flex flex-col items-center py-6">
                  <span className="text-6xl font-black text-stone-900 font-pangram-compressed leading-none">
                    {snake.dangerScore}
                  </span>
                  <span className="text-xs text-stone-400 font-bold uppercase tracking-widest mt-2">
                    Danger Score / 100
                  </span>
                </div>
              )}

              <Link
                href={`/rank?view=danger&snakeId=${snake.id}`}
                className="block mt-6 text-center text-[10px] font-black text-stone-300 hover:text-stone-800 transition-colors uppercase tracking-widest"
              >
                View full global rankings →
              </Link>
            </div>

            {venomous && snake.venomPotency && (
              <div className="hidden lg:block">
                <VenomPotencyChart currentSnake={snake} medianLD50={medianLD50} />
              </div>
            )}
          </div>

            {/* Clinical & Habitat Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Non-venomous info */}
            {(!venomous || !symptomsForDisplay) && (
              <div className="bg-white rounded-xl p-8 shadow-sm space-y-6">
                {snake.maxLength && (
                  <div className="flex items-baseline gap-4">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest w-24">Max Length</span>
                    <span className="text-lg font-bold text-stone-800">Up to {snake.maxLength.value} {snake.maxLength.unit}</span>
                  </div>
                )}
                {snake.diet && snake.diet.length > 0 && (
                  <div className="flex items-start gap-4">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest w-24 mt-1">Diet</span>
                    <div className="flex flex-wrap gap-2 font-medium text-stone-700">
                      {snake.diet.join(", ")}
                    </div>
                  </div>
                )}
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
