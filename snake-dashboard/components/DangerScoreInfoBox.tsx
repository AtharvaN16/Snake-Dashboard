"use client";

import { useEffect, useMemo, useState } from "react";
import { Kbd } from "@/components/ui/kbd";

interface DangerScoreInfoBoxProps {
  onClose: () => void;
}

export function DangerScoreInfoBox({ onClose }: DangerScoreInfoBoxProps) {
  const [isMac, setIsMac] = useState(true);

  // Section-specific toggle states
  const [yieldToggle, setYieldToggle] = useState(true);
  const [morbidityToggle, setMorbidityToggle] = useState(true);
  const [exposureToggle, setExposureToggle] = useState(true);

  useEffect(() => {
    const platform = navigator.platform || "";
    const ua = navigator.userAgent || "";
    setIsMac(/Mac|iPhone|iPad|iPod/i.test(platform) || /Mac/i.test(ua));
  }, []);

  const closeKeyLabel = useMemo(() => (isMac ? "Del" : "Bksp"), [isMac]);
  const closeKeys = useMemo(() => (isMac ? ["Backspace", "Delete"] : ["Backspace"]), [isMac]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select") || target?.isContentEditable) return;
      if (closeKeys.includes(e.key)) {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, closeKeys]);

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-30 w-auto sm:w-[640px]">
      <button
        onClick={onClose}
        className="absolute right-0 -top-2 -translate-y-full text-stone-500 hover:text-stone-800 transition-colors"
        aria-label="Close"
      >
        <Kbd className="py-1 px-2 text-center">{closeKeyLabel}</Kbd>
      </button>

      <div className="max-h-[85vh] overflow-y-auto bg-[#fcfbf9] border border-stone-300 rounded-2xl shadow-2xl p-5 sm:p-6 animate-in slide-in-from-bottom-8 duration-300">
        {/* Editorial Header */}
        <div className="mb-5 pb-4 border-b border-stone-200">
          <h3 className="text-xl font-black text-stone-900 tracking-tight">How the Danger Score Is Calculated</h3>
          <p className="text-xs text-stone-500 mt-1">
            An experimental 0–100 comparative index evaluating toxicological capacity, human clinical outcomes, and ecological risk factors.
          </p>
        </div>

        <div className="space-y-6 text-sm text-stone-700 leading-relaxed">
          {/* Formula Overview */}
          <section className="rounded-xl border border-stone-200 bg-stone-100/60 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Master Formula Topology</h4>
            <div className="font-mono text-xs text-stone-800 space-y-1">
              <p>Intrinsic Danger = 0.55 × Lethality + 0.45 × Clinical Severity</p>
              <p>Danger Score = Intrinsic Danger × SpeedMod × DeliveryMod × ExposureMod</p>
            </div>
          </section>

          {/* Section 1: Lethality */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              1. Lethality (55% Intrinsic Weight)
            </h4>
            <p>
              Lethality measures the total theoretical human-lethal capacity delivered per bite, rather than drop-for-drop venom potency alone. Potency-only scoring over-ranks snakes with toxic venom that deliver minimal volume; yield-only scoring over-ranks snakes injecting massive quantities of weak venom.
            </p>

            <div className="mt-3 space-y-2 text-xs">
              <p>
                <strong className="text-stone-900">LD50 Normalization:</strong> Published $\text{LD}_{50}$ values use varying administration routes (IV, IP, SC, IM). Because absorption kinetics differ by route, all published values are converted to a standard Subcutaneous ($\text{SC}$) baseline (Broad et al. 1979) prior to scoring.
              </p>
              <p>
                <strong className="text-stone-900">Lethal Dose Equivalents:</strong> For a 70kg reference human body mass:
              </p>
              <div className="font-mono text-[12px] bg-stone-100 p-2 rounded border border-stone-200 text-stone-800">
                lethalDoseEquivalents = yield_mg / (LD50_SC_mg_per_kg × 70)
              </div>
              <p>
                Raw lethal dose equivalents span over three orders of magnitude. The value is log-scaled and bounded to [0, 100] to prevent extreme toxicological outliers from collapsing comparative spread across other species.
              </p>
            </div>

            {/* Section 1 Interactive Toggle */}
            <div className="mt-4 p-3.5 bg-stone-100/80 rounded-xl border border-stone-200/80 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-stone-800">Example: Eastern Coral Snake vs. Gaboon Viper</span>
                <button
                  onClick={() => setYieldToggle(!yieldToggle)}
                  className="px-2.5 py-1 bg-white border border-stone-300 rounded font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  {yieldToggle ? "Mode: Potency + Yield" : "Mode: Potency Only"}
                </button>
              </div>
              {yieldToggle ? (
                <p className="text-stone-600">
                  <strong className="text-stone-900">Combined Lethality (Current):</strong> The <strong>Gaboon Viper</strong> ranks significantly higher. Although its venom is moderately potent, it yields up to 450mg per bite, delivering dozens of lethal doses.
                </p>
              ) : (
                <p className="text-stone-600">
                  <strong className="text-stone-900">Potency Only (Hypothetical):</strong> The <strong>Eastern Coral Snake</strong> would rank higher due to its superior drop-for-drop $\text{LD}_{50}$ (0.3 mg/kg), despite yielding only 5mg of venom per bite.
                </p>
              )}
            </div>
          </section>

          {/* Section 2: Clinical Severity */}
          <section className="pt-5 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              2. Clinical Severity (45% Intrinsic Weight)
            </h4>
            <p>
              While Lethality evaluates theoretical chemical capacity, Clinical Severity measures real-world human medical outcomes. It combines untreated case-fatality rates (CFR) with non-fatal morbidity metrics.
            </p>

            <div className="mt-3 space-y-2 text-xs">
              <p>
                <strong className="text-stone-900">Untreated Fatality Rate (CFR):</strong> Uses the midpoint of published untreated mortality ranges ($\text{midCFR}$). A square-root transformation ($\sqrt{\text{midCFR}/100} \times 100$) compresses high-fatality estimates so top-end variance does not dominate the score.
              </p>
              <p>
                <strong className="text-stone-900">Morbidity Bonuses:</strong> To capture permanent systemic damage, organ failure, or local tissue necrosis requiring amputation, additive point bonuses are applied based on clinical severity label:
              </p>
              <div className="font-mono text-[12px] bg-stone-100 p-2 rounded border border-stone-200 text-stone-800">
                Life-threatening: +20 | Severe: +10 | Moderate: +5
              </div>
              <p className="text-stone-500">
                *Note: WHO Medical Importance Category is displayed as an external validation reference and is not included as a numerical bonus to eliminate circular double-counting.
              </p>
            </div>

            {/* Section 2 Interactive Toggle */}
            <div className="mt-4 p-3.5 bg-stone-100/80 rounded-xl border border-stone-200/80 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-stone-800">Example: Black Mamba vs. Puff Adder</span>
                <button
                  onClick={() => setMorbidityToggle(!morbidityToggle)}
                  className="px-2.5 py-1 bg-white border border-stone-300 rounded font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  {morbidityToggle ? "Mode: Fatality + Morbidity" : "Mode: Fatality Only"}
                </button>
              </div>
              {morbidityToggle ? (
                <p className="text-stone-600">
                  <strong className="text-stone-900">Fatality + Morbidity (Current):</strong> The <strong>Puff Adder</strong> receives a substantial clinical boost for severe tissue necrosis, compartment syndrome, and amputation risk, reflecting total human medical impact alongside the highly fatal <strong>Black Mamba</strong>.
                </p>
              ) : (
                <p className="text-stone-600">
                  <strong className="text-stone-900">Fatality Only (Hypothetical):</strong> Cytotoxic snakes like the Puff Adder would drop significantly, ignoring non-fatal severe outcomes.
                </p>
              )}
            </div>
          </section>

          {/* Section 3: Real-World Risk Modifiers */}
          <section className="pt-5 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">
              3. Real-World Risk Modifiers (Multipliers)
            </h4>
            <p>
              Behavioral, physiological, and ecological factors modulate intrinsic danger as multiplicative terms. Multipliers can scale intrinsic danger up or down, but cannot generate danger where intrinsic toxicity is zero.
            </p>

            <div className="mt-3 space-y-2 text-xs">
              <p>
                <strong className="text-stone-900">Venom Onset Modifier ($0.94\times - 1.08\times$):</strong> Rapidly acting venom reduces the window available for antivenom administration ($\text{speedMod} = 0.90 + 0.20 \times \frac{\text{speedScore}}{100}$).
              </p>
              <p>
                <strong className="text-stone-900">Delivery Modifier ($0.5\times - 1.0\times$):</strong> Rear-fanged (Colubrid) snakes possess inefficient delivery mechanics. Non-highly venomous rear-fanged species receive a $0.5\times$ penalty.
              </p>
              <p>
                <strong className="text-stone-900">Human Exposure Modifier ($0.70\times - 1.10\times$):</strong> Evaluates geographic human density and habitat overlap. A snake&apos;s behavioral disposition adjusts its effective encounter score:
              </p>
              <div className="font-mono text-[12px] bg-stone-100 p-2 rounded border border-stone-200 text-stone-800">
                Aggressive: +15 | Defensive: +7.5 | Neutral: 0 | Docile: -10 | Placid: -20
              </div>
            </div>

            {/* Section 3 Interactive Toggle */}
            <div className="mt-4 p-3.5 bg-stone-100/80 rounded-xl border border-stone-200/80 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-stone-800">Example: Inland Taipan vs. Russell&apos;s Viper</span>
                <button
                  onClick={() => setExposureToggle(!exposureToggle)}
                  className="px-2.5 py-1 bg-white border border-stone-300 rounded font-medium text-stone-700 hover:bg-stone-50 transition-colors"
                >
                  {exposureToggle ? "Mode: With Human Exposure" : "Mode: Intrinsic Only"}
                </button>
              </div>
              {exposureToggle ? (
                <p className="text-stone-600">
                  <strong className="text-stone-900">With Exposure (Current):</strong> <strong>Russell&apos;s Viper</strong> holds Rank #1 because it occupies dense agricultural farmlands across Asia. The <strong>Inland Taipan</strong> sits at Rank #5 because it inhabits sparsely populated central Australian deserts.
                </p>
              ) : (
                <p className="text-stone-600">
                  <strong className="text-stone-900">Intrinsic Danger Only:</strong> The <strong>Inland Taipan</strong> takes Rank #1 due to its unrivaled toxicological lethality and 80–100% untreated fatality rate.
                </p>
              )}
            </div>
          </section>

          {/* Sources Footnote */}
          <section className="pt-4 border-t border-stone-200 text-xs text-stone-500 space-y-1">
            <p className="font-semibold text-stone-700">Data Sources &amp; Literature Standards:</p>
            <p>
              WHO Snakebite Information Platform, Snake Venom Database (SVDB), snakeDB.org, The Reptile Database, and Broad et al. (1979) conversion factors for $\text{LD}_{50}$ route normalization.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

