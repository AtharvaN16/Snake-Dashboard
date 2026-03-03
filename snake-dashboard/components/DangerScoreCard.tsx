"use client";

import { useState, memo, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Snake } from "@/lib/types";
import {
  getIntrinsicWeights,
  getSpeedModifier,
  getEncounterModifier,
  getEffectiveEncounterScore,
  getDeliveryModifier,
  deriveVenomClassification,
} from "@/lib/dangerScore";

const CONTENT_H = 580;
const CARD_H = CONTENT_H;
const EASE = [0.32, 0.72, 0, 1] as const;

const COMPRESSED = "var(--font-pangram-compressed), system-ui, sans-serif";
const COMPACT = "var(--font-pangram-compact), system-ui, sans-serif";

interface DangerScoreCardProps {
  snake: Snake;
}

const DangerScoreCardComponent = memo(function DangerScoreCard({ snake }: DangerScoreCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const { intrinsicExact, speedMod, encounterMod, deliveryMod } = useMemo(() => {
    if (!snake.dangerScoreComponents) {
      return { intrinsicExact: 0, speedMod: 1, encounterMod: 1, deliveryMod: 1 };
    }

    const weights = getIntrinsicWeights();
    const intrinsic =
      snake.dangerScoreComponents.lethalityScore * weights.lethalityScore +
      snake.dangerScoreComponents.clinicalScore * weights.clinicalScore;

    const venomClass = deriveVenomClassification(snake.dangerScoreComponents, snake.clinicalData);
    const effectiveEncounterScore = getEffectiveEncounterScore(
      snake.dangerScoreComponents.encounterScore,
      snake.dangerScoreComponents.dispositionScore
    );

    return {
      intrinsicExact: intrinsic,
      speedMod: getSpeedModifier(snake.dangerScoreComponents.speedScore),
      encounterMod: getEncounterModifier(effectiveEncounterScore),
      deliveryMod: getDeliveryModifier(snake.fangType, venomClass),
    };
  }, [snake]);

  const lethalityScore = snake.dangerScoreComponents?.lethalityScore;
  const clinicalScore = snake.dangerScoreComponents?.clinicalScore;

  const afterSpeed = intrinsicExact * speedMod;
  const afterDelivery = afterSpeed * deliveryMod;
  const afterEncounter = afterDelivery * encounterMod;

  const details = (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-stone-200" />
        <span style={{ fontFamily: COMPRESSED }} className="text-[9px] font-black text-stone-400 uppercase tracking-widest whitespace-nowrap">
          Venom Core
        </span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>
      <p style={{ fontFamily: COMPACT }} className="text-[11px] text-stone-400 leading-snug">
        Lethality weighted 55% (potency × yield). Clinical weighted 45% (real-world CFR).
      </p>
      {lethalityScore != null && clinicalScore != null && (
        <div className="flex justify-between items-baseline gap-3 pt-0.5">
          <span style={{ fontFamily: COMPACT }} className="text-[11px] text-stone-500">
            0.55 × <span className="font-bold text-stone-700">{lethalityScore}</span> + 0.45 × <span className="font-bold text-stone-700">{clinicalScore}</span>
          </span>
          <span style={{ fontFamily: COMPACT }} className="text-[11px] font-bold text-stone-700 tabular-nums shrink-0">
            {intrinsicExact.toFixed(1)}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <div className="flex-1 h-px bg-stone-200" />
        <span style={{ fontFamily: COMPRESSED }} className="text-[9px] font-black text-stone-400 uppercase tracking-widest whitespace-nowrap">
          Modifiers
        </span>
        <div className="flex-1 h-px bg-stone-200" />
      </div>
      <p style={{ fontFamily: COMPACT }} className="text-[11px] text-stone-400 leading-snug">
        Multiplicative scalers - amplify or reduce existing danger, can&apos;t create it from nothing.
      </p>
      <div className="space-y-1 pt-0.5">
        {[
          { label: "Speed", mod: speedMod, after: afterSpeed },
          { label: "Delivery", mod: deliveryMod, after: afterDelivery },
          { label: "Encounter", mod: encounterMod, after: afterEncounter },
        ].map(({ label, mod, after }) => {
          const modColor = mod > 1 ? "#16a34a" : mod < 1 ? "#dc2626" : "#78716c";
          return (
            <div key={label} className="flex justify-between items-baseline gap-3">
              <span style={{ fontFamily: COMPACT }} className="text-[11px] text-stone-500">
                <span className="text-[14px] font-bold" style={{ color: modColor }}>×</span>{" "}
                {label}{" "}
                (<span className="font-bold" style={{ color: modColor }}>{mod.toFixed(2)}</span>)
              </span>
              <span style={{ fontFamily: COMPACT }} className="text-[11px] font-bold text-stone-700 tabular-nums shrink-0">
                {after.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
      <p style={{ fontFamily: COMPACT }} className="text-[10px] text-stone-400 leading-snug border-t border-stone-100 pt-1.5">
        Speed = antivenom window. Delivery = fang efficiency. Encounter = exposure × temperament.
      </p>

      <div className="flex justify-between items-baseline gap-3 border-t border-stone-200 pt-2">
        <span style={{ fontFamily: COMPRESSED }} className="text-[9px] font-black text-stone-500 uppercase tracking-wide">
          Score
        </span>
        <span style={{ fontFamily: COMPRESSED }} className="text-[15px] font-black text-stone-900 tabular-nums">
          {snake.dangerScore}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <div className="relative z-20 mb-8 lg:hidden">
        <div className="relative z-10 px-5 pb-4 pt-4">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2"
            aria-expanded={isExpanded}
            aria-controls={`danger-score-mobile-${snake.id}`}
          >
            <div className="mb-2 text-center">
              <h2
                style={{
                  fontFamily: COMPRESSED,
                  fontWeight: 800,
                  fontSize: "30px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#2c2c2c",
                  lineHeight: 1,
                  marginBottom: "4px",
                }}
              >
                Danger Score
              </h2>
              <div className="text-[12px] font-black text-stone-400 uppercase tracking-widest">RANK {snake.dangerRank}</div>
            </div>

            <div className="flex items-baseline justify-center gap-1">
              <span
                style={{
                  fontFamily: COMPRESSED,
                  fontSize: "64px",
                  fontWeight: 800,
                  lineHeight: 0.9,
                  color: "#000",
                }}
              >
                {snake.dangerScore}
              </span>
            </div>
            <div
              style={{ fontFamily: COMPACT }}
              className="mt-1 text-center text-[12px] font-bold uppercase tracking-[0.04em] text-stone-500"
            >
              {isExpanded ? "Tap to collapse" : "Tap to expand details"}
            </div>
          </button>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                id={`danger-score-mobile-${snake.id}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="overflow-hidden pt-5 pb-4"
              >
                {details}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="fixed bottom-[-40px] right-[68px] z-40 hidden w-[24%] max-w-[280px] min-w-[240px] pointer-events-none transition-[z-index] delay-300 duration-0 hover:z-[60] lg:block">
        <motion.div
          onClick={() => setIsExpanded(!isExpanded)}
          initial={{ y: 800 }}
          animate={{ y: isExpanded ? -60 : 310 }}
          whileHover={{
            y: isExpanded ? -60 : 295,
            transition: { delay: 0.3, duration: 0.2, ease: "easeOut" },
          }}
          transition={{ ease: EASE, duration: 0.6 }}
          className="relative flex cursor-pointer select-none flex-col will-change-transform pointer-events-auto"
          style={{ height: CARD_H }}
        >
          <div
            aria-hidden
            className="absolute pointer-events-none select-none"
            style={{
              top: -48,
              left: -48,
              right: -48,
              bottom: -100,
              backgroundImage: "url('/paper/paper-27.png')",
              backgroundSize: "100% 100%",
              backgroundPosition: "center center",
              backgroundRepeat: "no-repeat",
              filter: "drop-shadow(0 -15px 30px rgba(0,0,0,0.12))",
              WebkitFilter: "drop-shadow(0 -15px 30px rgba(0,0,0,0.12))",
              transform: "translateZ(0)",
            }}
          />

          <div className="relative z-10 flex-1 px-8 pt-10 pb-16">
            <div className="text-center mb-6">
              <h2
                style={{
                  fontFamily: COMPRESSED,
                  fontWeight: 800,
                  fontSize: "30px",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#2c2c2c",
                  lineHeight: 1,
                  marginBottom: "4px",
                }}
              >
                Danger Score
              </h2>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  router.push(`/rank?view=danger&snakeId=${snake.id}`);
                }}
                className="mt-0.5 inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[12px] font-black uppercase tracking-widest text-stone-400 hover:text-stone-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100"
                aria-label={`View danger rankings position for ${snake.commonName}`}
              >
                <span>Rank {snake.dangerRank}</span>
              </button>
            </div>

            <div className="flex flex-col items-center mb-8">
              <div className="flex items-baseline gap-1">
                <span
                  style={{
                    fontFamily: COMPRESSED,
                    fontSize: "76px",
                    fontWeight: 800,
                    lineHeight: 0.9,
                    color: "#000",
                  }}
                >
                  {snake.dangerScore}
                </span>
                </div>
              <div
                style={{
                  fontFamily: COMPACT,
                  fontSize: "14px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#78716c",
                  marginTop: "4px",
                }}
              >
                Final Danger Score
              </div>
            </div>

            <motion.div animate={{ opacity: isExpanded ? 1 : 0.35 }} transition={{ duration: 0.3, ease: "easeOut" }}>
              {details}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </>
  );
});

export { DangerScoreCardComponent as DangerScoreCard };
export default DangerScoreCardComponent;
