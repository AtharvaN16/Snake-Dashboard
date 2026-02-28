import { notFound } from "next/navigation";
import { existsSync } from "fs";
import { join } from "path";
import {
  getSnakeById,
  getAllSnakes,
  isVenomous,
} from "@/lib/snakeData";
import { PolaroidStack } from "@/components/PolaroidStack";
import { VenomPaperCard } from "@/components/VenomPaperCard";
import { ClinicalSymptomsCard } from "@/components/ClinicalSymptomsCard";
import { DangerScoreCard } from "@/components/DangerScoreCard";
import { ImageCandidatePicker } from "@/components/ImageCandidatePicker";
import Link from "next/link";
import { DynamicDistributionMap as DistributionMap } from "@/components/DynamicDistributionMap";
import { Kbd } from "@/components/ui/kbd";
import { SnakeDetailMobileHeader } from "@/components/SnakeDetailMobileHeader";

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

  const symptomsForDisplay = snake.symptoms;

  // Resolve confused snakes for the misidentification warning banner
  const confusedSnakesData =
    snake.misidentificationRisk === "high" && snake.commonlyMisidentifiedAs
      ? snake.commonlyMisidentifiedAs.map((cid) => ({
          id: cid,
          snake: getSnakeById(cid),
        }))
      : [];

  return (
    <div className="min-h-screen px-2 pb-5 pt-0 sm:px-4 sm:pb-6 sm:pt-4 lg:px-[68px] lg:py-8">
      <SnakeDetailMobileHeader />

      {/* Mobile distribution map */}
      <div
        className="relative z-10 -mx-2 mb-0 h-[220px] overflow-hidden sm:-mx-4 sm:h-[260px] lg:mx-0 lg:hidden"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 72%, transparent 100%)",
        }}
      >
        <DistributionMap
          distribution={snake.distribution}
          snakeId={snake.id}
          width={640}
          height={360}
          responsive
          className="h-full w-full"
        />
      </div>

      {/* Back + keyboard shortcut hints */}
      <div className="relative z-20 mb-3 mt-2 hidden items-center gap-4 flex-wrap text-sm text-stone-600 lg:flex">
        <span className="flex items-center gap-2">
          <span className="hidden items-center gap-2 lg:inline-flex">
            <Kbd triggerKey="Escape">Esc</Kbd>
          </span>
          <Link
            href="/"
            className="hover:text-stone-800 transition-colors"
          >
            Back
          </Link>
        </span>
        <span className="hidden items-center gap-2 lg:inline-flex">
          <Kbd triggerKey=" ">Space</Kbd>
          <span>Search another snake</span>
        </span>
      </div>

      {/* Snake Info Card + Polaroid photo */}
      <div className="relative z-20 -mt-8 mb-12 max-w-[980px] overflow-hidden pt-6 sm:-mt-10 sm:pt-8 lg:mt-0 lg:mb-20 lg:overflow-visible lg:pt-12">
        {/* Paper card container */}
        <div className="relative -mt-7 bg-transparent px-2 pb-6 pt-7 sm:-mt-8 sm:px-4 lg:mt-0 lg:pb-6 lg:pl-9 lg:pr-6 lg:pt-10">
          {/* Paper background */}
          <div
            aria-hidden
            className="absolute pointer-events-none select-none hidden bottom-[-120px] left-[-16px] right-0 top-[-24px] lg:block lg:bottom-[-210px] lg:left-[-68px] lg:right-[100px] lg:top-[-52px]"
            style={{
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
                </div>

                {/* Scientific name */}
                <p
                  style={{
                    color: "rgba(0, 0, 0, 0.45)",
                    fontFamily: "var(--font-pangram-slim), system-ui, sans-serif",
                    fontSize: "clamp(16px, 4.5vw, 20px)",
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
                    fontSize: "clamp(34px, 10vw, 52px)",
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
                      {(snake.continents.length > 0 || snake.distribution?.regions?.length) ? (
                        <>
                          <Link
                            href={`/rank?region=${encodeURIComponent(snake.continents[0] ?? snake.distribution?.regions?.[0] ?? "")}`}
                            className="underline hover:text-stone-900 transition-colors"
                            style={{ fontWeight: 400, color: "rgba(0, 0, 0, 0.7)" }}
                          >
                            {snake.continents.join(", ") || snake.distribution?.regions?.[0]}
                          </Link>
                          <span style={{ fontWeight: 400, color: "rgba(0, 0, 0, 0.3)" }}>
                            {snake.distribution?.regions?.join(", ") ?? ""}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </p>
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
                      ) {
                        return true;
                      }
                      if (isSnakeVenomous && otherVenomous) return true;
                      return false;
                    });
                    if (pairs.length === 0) return null;

                    return (
                      <div style={{ marginBottom: "14px" }}>
                        <p className="font-semibold text-[#000]">Misidentification risk</p>
                        <div className="mt-2.5">
                          <div
                            className="flex flex-col items-start gap-3 min-[360px]:flex-row min-[360px]:flex-wrap min-[360px]:items-center lg:inline-flex lg:gap-3"
                          >
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
                            <span className="select-none self-start text-stone-600 min-[360px]:hidden" style={{ fontSize: "1.25rem", lineHeight: 1 }} aria-hidden>↕</span>
                            <span className="hidden select-none self-start text-stone-600 min-[360px]:inline-block" style={{ fontSize: "1.25rem", lineHeight: 1 }} aria-hidden>↔</span>
                            {(() => {
                              const orderedPairs = [
                                ...pairs.filter(({ snake: other }) => other),
                                ...pairs.filter(({ snake: other }) => !other),
                              ];

                              return orderedPairs.map(({ id: cid, snake: other }) => {
                                const exists = other !== undefined;
                                const displayName =
                                  other?.commonName ||
                                  cid
                                    .split("-")
                                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                    .join(" ");
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
                                      key={cid}
                                      href={`/snakes/${cid}`}
                                      className="font-semibold transition-opacity hover:opacity-75"
                                      style={pillStyle}
                                    >
                                      {displayName}
                                    </Link>
                                  );
                                }

                                return (
                                  <span
                                    key={cid}
                                    className="font-semibold"
                                    style={pillStyle}
                                    title="Not yet in database"
                                  >
                                    {displayName}
                                  </span>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {snake.images?.primary && (
                <div className="mx-auto hidden w-full max-w-[420px] lg:mx-0 lg:block lg:w-[420px] lg:flex-none">
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

      {snake.images?.primary && (
        <div className="relative z-20 mb-8 lg:hidden">
          <div className="w-full max-w-[420px] ml-auto" style={{ transform: "translateX(6px)" }}>
            <PolaroidStack
              images={polaroidImages}
              caption={snake.commonName}
              attributions={polaroidAttributions}
            />
          </div>
        </div>
      )}

      {process.env.NODE_ENV !== "production" && (
        <ImageCandidatePicker snakeId={snake.id} />
      )}

      {/* Floating overlays — slide up from bottom */}
      <DangerScoreCard snake={snake} />

      {venomous && <VenomPaperCard snake={snake} />}
      
      {venomous && (
        <ClinicalSymptomsCard
          symptoms={symptomsForDisplay ?? {}}
          symptomsProgression={snake.symptomsProgression}
          causesOfDeath={snake.causesOfDeath}
          clinicalData={snake.clinicalData}
        />
      )}

    </div>
  );
}
