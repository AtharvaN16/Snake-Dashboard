"use client";

import { useEffect, useMemo, useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import { ChevronDown, ChevronUp } from "lucide-react";

interface DangerScoreInfoBoxProps {
  onClose: () => void;
}

export function DangerScoreInfoBox({ onClose }: DangerScoreInfoBoxProps) {
  const [isMac, setIsMac] = useState(true);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    lethality: true,
    clinical: false,
    modifiers: false,
    who: false,
  });

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

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-30 w-auto sm:w-[640px]">
      <button
        onClick={onClose}
        className="absolute right-0 -top-2 -translate-y-full text-stone-500 hover:text-stone-800 transition-colors"
        aria-label="Close"
      >
        <Kbd className="py-1 px-2 text-center">{closeKeyLabel}</Kbd>
      </button>

      <div className="max-h-[85vh] overflow-y-auto bg-[#fcfbf9] border border-stone-300 rounded-2xl shadow-2xl p-5 sm:p-6 animate-in slide-in-from-bottom-8 duration-300 text-stone-800">
        {/* Editorial Header */}
        <div className="mb-5 pb-4 border-b border-stone-200">
          <h3 className="text-xl font-black text-stone-900 tracking-tight">
            How is the Danger Score calculated?
          </h3>
          <p className="text-xs text-stone-500 font-medium mt-1">
            An experimental 0–100 index of snakebite danger
          </p>
        </div>

        {/* 3-Second Summary Card */}
        <div className="mb-6 p-4 rounded-xl border border-stone-200 bg-stone-100/70 text-xs sm:text-sm space-y-2">
          <p className="text-stone-700 font-medium">
            The most venomous snake isn&apos;t necessarily the most dangerous snake. The model combines:
          </p>
          <div className="space-y-1.5 pt-1 text-xs">
            <div className="flex items-start gap-2">
              <span className="font-semibold text-stone-900 shrink-0">🧪 55% Lethality:</span>
              <span className="text-stone-600">How much toxic venom a bite can potentially deliver.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-stone-900 shrink-0">🩺 45% Clinical Severity:</span>
              <span className="text-stone-600">How severe the effects of envenoming can be—even if you survive.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold text-stone-900 shrink-0">🌎 Real-World Modifiers:</span>
              <span className="text-stone-600">Venom onset · Delivery · Human exposure</span>
            </div>
          </div>
          <div className="pt-2 border-t border-stone-200/80 text-[11px] text-stone-500 italic">
            Questions answered: Rather than &quot;Which snake has the most potent venom?&quot;, it asks &quot;How dangerous could a bite from this snake be to a human?&quot;
          </div>
        </div>

        {/* Section Accordions */}
        <div className="space-y-3">
          {/* Section 01: Lethality */}
          <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => toggleSection("lethality")}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-stone-900 hover:bg-stone-50 transition-colors"
            >
              <span>01 — Lethality (55%)</span>
              {openSections.lethality ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
            </button>

            {openSections.lethality && (
              <div className="p-4 pt-0 text-xs sm:text-sm text-stone-600 space-y-3 border-t border-stone-100 leading-relaxed">
                <p className="font-medium text-stone-800">How much toxic venom can a bite potentially deliver?</p>
                <p>
                  Venom <strong>potency</strong> isn&apos;t the same as the amount of venom a snake can deliver. A snake can have extremely toxic venom but produce very little of it. Another can have less potent venom but deliver a much larger quantity. That&apos;s why we combine <strong>potency + venom yield</strong>.
                </p>

                {/* Real Example Box */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1.5">
                  <p className="font-bold text-stone-800">A real example: Eastern Coral Snake vs. Gaboon Viper</p>
                  <p>
                    The Eastern Coral Snake has highly potent venom, but its venom yield is relatively small (~5mg). The Gaboon Viper&apos;s venom is less potent by comparison, but it can produce a very large yield—reported up to around 450 mg.
                  </p>
                  <p>
                    A potency-only ranking would favor the Coral Snake. A yield-only ranking would favor the Gaboon Viper. Our model combines both for a balanced measure of <strong>toxicological capacity per bite</strong>.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-stone-700">
                  <p>
                    <strong className="text-stone-900">What is LD50?</strong> LD50 is the dose of venom that kills 50% of test animals under controlled experimental conditions (mg/kg). Lower LD50 = more potent venom.
                  </p>
                  <p>
                    <strong className="text-stone-900">Why do we normalize LD50?</strong> Studies use different administration routes (IV, IP, SC, IM). The route changes how venom is absorbed and distributed. We convert published values to a <strong>subcutaneous-equivalent (SC) baseline</strong> (Broad et al. 1979) prior to comparison.
                  </p>
                  <p>
                    <strong className="text-stone-900">Lethal-dose equivalents:</strong> For a 70 kg reference body mass:
                  </p>
                  <div className="font-mono text-[11px] bg-stone-100 p-2 rounded border border-stone-200 text-stone-800">
                    lethalDoseEquivalents = venom yield ÷ (SC-equivalent LD50 × 70)
                  </div>
                  <p className="text-stone-500 italic">
                    Note: These are LD50-equivalent estimates derived from animal toxicology data—not predictions of how many humans a bite could kill.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 02: Clinical Severity */}
          <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => toggleSection("clinical")}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-stone-900 hover:bg-stone-50 transition-colors"
            >
              <span>02 — Clinical Severity (45%)</span>
              {openSections.clinical ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
            </button>

            {openSections.clinical && (
              <div className="p-4 pt-0 text-xs sm:text-sm text-stone-600 space-y-3 border-t border-stone-100 leading-relaxed">
                <p className="font-medium text-stone-800">What happens when a person is bitten?</p>
                <p>
                  Lethality measures theoretical toxicological capacity. Clinical Severity measures what envenoming can actually do to a person.
                </p>

                {/* Real Example Box */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1.5">
                  <p className="font-bold text-stone-800">A real example: Black Mamba vs. Puff Adder</p>
                  <p>
                    The <strong>Black Mamba</strong> has severe neurotoxic effects causing rapid paralysis. The <strong>Puff Adder</strong> causes extensive local tissue damage and necrosis, sometimes requiring surgery or amputation.
                  </p>
                  <p>
                    A lethality-only ranking would miss part of the Puff Adder&apos;s human impact. The Clinical Severity component allows non-fatal damage to influence the ranking.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-stone-700">
                  <p>
                    <strong className="text-stone-900">Step 1 — Fatality:</strong> Uses the midpoint of untreated fatality ranges (<code className="bg-stone-100 px-1 rounded">midCFR = (low + high) / 2</code>). A square-root transformation (<code className="bg-stone-100 px-1 rounded">√(midCFR / 100) × 100</code>) compresses upper-end variance so high-fatality estimates do not dominate the score.
                  </p>
                  <p>
                    <strong className="text-stone-900">Step 2 — Morbidity:</strong> Additive point bonuses for reported non-fatal harm:
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse border border-stone-200 mt-1">
                      <thead>
                        <tr className="bg-stone-100 text-stone-800">
                          <th className="p-1.5 border border-stone-200">Clinical Severity</th>
                          <th className="p-1.5 border border-stone-200 text-right">Bonus</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-1.5 border border-stone-200">Life-threatening</td>
                          <td className="p-1.5 border border-stone-200 text-right font-mono">+20</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border border-stone-200">Severe</td>
                          <td className="p-1.5 border border-stone-200 text-right font-mono">+10</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 border border-stone-200">Moderate</td>
                          <td className="p-1.5 border border-stone-200 text-right font-mono">+5</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 03: Real-World Risk Modifiers */}
          <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => toggleSection("modifiers")}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-stone-900 hover:bg-stone-50 transition-colors"
            >
              <span>03 — Real-World Risk Modifiers</span>
              {openSections.modifiers ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
            </button>

            {openSections.modifiers && (
              <div className="p-4 pt-0 text-xs sm:text-sm text-stone-600 space-y-3 border-t border-stone-100 leading-relaxed">
                <p>
                  Intrinsic Danger tells us how harmful venom can be. Multipliers adjust the score based on how that venom is encountered and delivered:
                </p>

                {/* Real Example Box */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1.5">
                  <p className="font-bold text-stone-800">A real example: Inland Taipan vs. Russell&apos;s Viper</p>
                  <p>
                    The <strong>Inland Taipan</strong> has exceptionally potent venom, but inhabits sparsely populated regions of central Australia. The <strong>Russell&apos;s Viper</strong> is widespread across densely populated farmlands in South Asia.
                  </p>
                  <p>
                    When human exposure is included, the model ranks <strong>Russell&apos;s Viper above the Inland Taipan</strong>. Extreme toxicity + little exposure produces less real-world risk than lower toxicity + frequent human exposure.
                  </p>
                </div>

                <div className="space-y-2 text-xs text-stone-700">
                  <p>
                    <strong className="text-stone-900">⚡ Venom Onset (0.94×–1.08×):</strong> Measures venom onset speed. Rapidly acting venom leaves less time to reach emergency care.
                  </p>
                  <p>
                    <strong className="text-stone-900">🦷 Delivery (0.5×–1.0×):</strong> Non-highly venomous rear-fanged snakes receive a 0.5× multiplier to reflect lower delivery efficiency.
                  </p>
                  <p>
                    <strong className="text-stone-900">🌎 Human Exposure (0.70×–1.10×):</strong> Combines geographic encounter frequency with snake disposition:
                  </p>
                  <div className="font-mono text-[11px] bg-stone-100 p-2 rounded border border-stone-200 text-stone-800">
                    Aggressive: +15 | Defensive: +7.5 | Neutral: 0 | Docile: -10 | Placid: -20
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 04: WHO Classifications & Notes */}
          <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
            <button
              onClick={() => toggleSection("who")}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-stone-900 hover:bg-stone-50 transition-colors"
            >
              <span>04 — WHO Classifications &amp; Methodology Notes</span>
              {openSections.who ? <ChevronUp className="w-4 h-4 text-stone-500" /> : <ChevronDown className="w-4 h-4 text-stone-500" />}
            </button>

            {openSections.who && (
              <div className="p-4 pt-0 text-xs sm:text-sm text-stone-600 space-y-3 border-t border-stone-100 leading-relaxed">
                <div>
                  <p className="font-bold text-stone-800 mb-1">What about WHO classifications?</p>
                  <p className="text-xs">
                    WHO Medical Importance Categories are shown throughout the site as an <strong>external reference</strong>, but they aren&apos;t part of the numerical score. Adding a numerical WHO bonus would double-count characteristics already represented in the model.
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 text-xs space-y-1.5">
                  <p className="font-bold text-stone-800">Model Disclaimer:</p>
                  <p className="text-stone-500">
                    The Danger Score is an <strong>experimental comparative index</strong>, not a clinically validated measure of individual bite risk. Weights and multipliers are modeling choices designed to make comparisons meaningful.
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-100 text-xs space-y-1 text-stone-500">
                  <p className="font-semibold text-stone-700">Data Sources:</p>
                  <p>
                    WHO Snakebite Information Platform, Snake Venom Database (SVDB), snakeDB.org, The Reptile Database, and Broad et al. (1979) LD50 conversion standards.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

