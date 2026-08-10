"use client";

import { useEffect, useMemo, useState } from "react";
import { Kbd } from "@/components/ui/kbd";

interface DangerScoreInfoBoxProps {
  onClose: () => void;
}

export function DangerScoreInfoBox({ onClose }: DangerScoreInfoBoxProps) {
  const [isMac, setIsMac] = useState(true);

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
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-30 w-auto sm:w-[620px]">
      <button
        onClick={onClose}
        className="absolute right-0 -top-2 -translate-y-full text-stone-500 hover:text-stone-800 transition-colors"
        aria-label="Close"
      >
        <Kbd className="py-1 px-2 text-center">{closeKeyLabel}</Kbd>
      </button>

      <div className="max-h-[84vh] overflow-y-auto bg-white/95 backdrop-blur-sm border border-stone-300 rounded-2xl shadow-2xl p-5 sm:p-6 animate-in slide-in-from-bottom-8 duration-300">
        <div className="mb-5 pb-4 border-b border-stone-200">
          <h3 className="text-xl font-black text-[#2c2c2c] tracking-tight">How the Danger Score Is Calculated</h3>
        </div>

        <div className="space-y-5 text-sm text-stone-700 leading-relaxed">
          <section className="rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-1.5">Formula</h4>
            <p className="mt-1 font-mono text-[13px] text-stone-800">intrinsic = 0.55 x lethality + 0.45 x clinical</p>
            <p className="font-mono text-[13px] text-stone-800">dangerScore = intrinsic x speedMod x deliveryMod x encounterMod</p>
          </section>

          <section>
            <h4 className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">1. Lethality (55%)</h4>
            <p>
              Lethality is based on <strong className="text-stone-900">lethal doses per bite</strong>, not potency alone. Potency-only scoring can over-rank snakes with very toxic venom but tiny delivered volume. Yield-only scoring can over-rank snakes that inject a lot of venom that is comparatively weak.
            </p>
            <p className="mt-2">
              <strong className="text-stone-900">LD50 basics:</strong> LD50 is the dose that kills 50% of test animals under controlled conditions, typically in mg/kg. Lower LD50 indicates higher venom potency.
            </p>
            <p className="mt-2">
              <strong className="text-stone-900">Why we normalize LD50:</strong> published LD50 values use different administration routes (IV, IP, SC, IM). Route changes apparent potency because absorption and distribution differ. We convert to SC-equivalent values so all species are compared on one route baseline.
            </p>
            <p className="mt-2">
              <strong className="text-stone-900">Composite lethality quantity:</strong>
            </p>
            <p className="mt-1 font-mono text-[13px] text-stone-800">lethalDoses = yield_mg / (LD50_SC_mg_per_kg x 70)</p>
            <p className="mt-1">
              This estimates how many human-lethal doses one bite can deliver for a 70kg human reference mass. We then log-scale and clamp to a bounded 0-100 lethality score to stabilize large cross-species ranges.
            </p>
          </section>

          <section className="pt-4 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">2. Clinical severity (45%)</h4>
            <p>
              Clinical severity is the human-outcome branch of the model. It starts from untreated case-fatality-rate (CFR) range data and then applies medically motivated adjustments.
            </p>
            <p className="mt-2">
              <strong className="text-stone-900">Step A: CFR midpoint.</strong> We use the midpoint of the untreated fatality range:
            </p>
            <p className="mt-1 font-mono text-[13px] text-stone-800">midCfr = (low + high) / 2</p>
            <p className="mt-2">
              <strong className="text-stone-900">Step B: square-root transform.</strong> CFR is transformed with a square root before scaling to 0-100:
            </p>
            <p className="mt-1 font-mono text-[13px] text-stone-800">base = sqrt(midCfr / 100) x 100</p>
            <p className="mt-1 text-stone-600">
              This compresses the extreme upper tail so high-CFR species remain distinct without letting noisy top-end estimates dominate rankings.
            </p>
            <p className="mt-2">
              <strong className="text-stone-900">Step C: morbidity bonuses.</strong> We apply additive point bonuses based on clinical severity labels to ensure severe non-fatal outcomes (like necrosis) are heavily represented without hiding the fatality gap.
            </p>
            <p className="mt-1 font-mono text-[13px] text-stone-800">Life-threatening: +20, Severe: +10, Moderate: +5</p>
            <p className="mt-2">
              <strong className="text-stone-900">Step D: WHO medical-importance bonus.</strong> WHO Category 1 gets +10; Category 2 gets +5.
            </p>
            <p className="mt-2">
              <strong className="text-stone-900">Step E: bound and round.</strong> Final clinical score is clamped to [0,100] and rounded.
            </p>
          </section>

          <section className="pt-4 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">3. Modifiers (multipliers)</h4>
            <p>
              The model treats speed, delivery efficiency, and encounter frequency as multipliers instead of additive point sources. These factors affect realized risk, but they should not create danger where intrinsic toxicity is low.
            </p>
            <p className="mt-2">
              <strong className="text-stone-900">Speed modifier:</strong> Extremely quick -&gt; 90, Quick -&gt; 55, Slow -&gt; 20.
            </p>
            <p className="mt-1 font-mono text-[13px] text-stone-800">speedMod = 0.9 + 0.2 x (speedScore / 100)</p>
            
            <p className="mt-2">
              <strong className="text-stone-900">Delivery modifier:</strong> 0.5 if rear-fanged and not classified as highly venomous or venomous; otherwise 1.0.
            </p>

            <p className="mt-2">
              <strong className="text-stone-900">Encounter score input:</strong> Low -&gt; 20, Moderate -&gt; 40, High -&gt; 65, Very High -&gt; 85.
            </p>
            <p className="mt-1">
              <strong className="text-stone-900">Disposition adjustment:</strong> A snake's aggression is folded directly into its encounter score to calculate an <code className="text-[12px] bg-stone-200 px-1 rounded">effectiveEncounterScore</code>. Aggressive adds +15, Defensive adds +7.5, Docile subtracts -10, Placid subtracts -20.
            </p>
            <p className="mt-1 font-mono text-[13px] text-stone-800">encounterMod = 0.70 + 0.40 x (effectiveEncounterScore / 100)</p>
            <p className="mt-2 text-stone-600">
              Using multipliers ensures these terms can amplify or attenuate intrinsic danger but cannot manufacture it.
            </p>
          </section>

          <section className="pt-4 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">Sources</h4>
            <ul className="list-disc pl-5 space-y-1 text-stone-700">
              <li>WHO Snakebite Information Platform (medical importance categories and clinical context)</li>
              <li>Snake Venom Database (SVDB) (venom profiles and LD50 references)</li>
              <li>snakeDB.org (toxicity and morphology cross-reference)</li>
              <li>The Reptile Database (taxonomy verification)</li>
              <li>Wikipedia (secondary cross-reference for species-level context)</li>
              <li>Broad et al. 1979 conversion factors for LD50 route normalization (IV to SC; IP to SC handling)</li>
            </ul>
            <p className="mt-2 text-stone-600">
              Species-specific citations are stored with records in <span className="font-mono text-[12px]">data/snakes/index.json</span> under the <span className="font-mono text-[12px]">sources</span> field.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
