"use client";

import { useEffect, useMemo, useState } from "react";
import { Kbd } from "@/components/ui/kbd";

interface DangerScoreInfoBoxProps {
  onClose: () => void;
}

export function DangerScoreInfoBox({ onClose }: DangerScoreInfoBoxProps) {
  const [isMac, setIsMac] = useState(true);
  const [interactiveMode, setInteractiveMode] = useState<"exposure" | "yield" | "morbidity">("exposure");
  const [toggleState, setToggleState] = useState(true);

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
        {/* Header */}
        <div className="mb-4 pb-3 border-b border-stone-200">
          <h3 className="text-xl font-black text-[#2c2c2c] tracking-tight">How the Danger Score Works</h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Why the world&apos;s most toxic snake isn&apos;t always the most dangerous to humans.
          </p>
        </div>

        <div className="space-y-5 text-sm text-stone-700 leading-relaxed">
          {/* Summary Banner */}
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 text-xs sm:text-sm">
            <p className="font-semibold text-stone-800 mb-1">The 3-Second Summary:</p>
            <p className="text-stone-600">
              The <strong>Danger Score (0–100)</strong> measures overall risk to humans by balancing chemical venom power with real-world outcomes:
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2 text-xs font-medium">
              <span className="bg-white border border-amber-300/60 text-amber-900 px-2.5 py-1 rounded-md shadow-xs">
                🧪 55% Venom Lethality
              </span>
              <span className="bg-white border border-amber-300/60 text-amber-900 px-2.5 py-1 rounded-md shadow-xs">
                🩺 45% Human Outcomes
              </span>
              <span className="bg-white border border-amber-300/60 text-amber-900 px-2.5 py-1 rounded-md shadow-xs">
                👤 Multiplied by Human Exposure
              </span>
            </div>
          </div>

          {/* Interactive Toggle Simulator Widget */}
          <section className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                🎮 Interactive Ranking Simulator
              </h4>
              <span className="text-[11px] text-stone-400">See how formula rules change rankings</span>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-1.5 p-1 bg-stone-200/60 rounded-lg mb-3 text-xs">
              <button
                onClick={() => { setInteractiveMode("exposure"); setToggleState(true); }}
                className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all ${
                  interactiveMode === "exposure" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Human Exposure
              </button>
              <button
                onClick={() => { setInteractiveMode("yield"); setToggleState(true); }}
                className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all ${
                  interactiveMode === "yield" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Venom Volume
              </button>
              <button
                onClick={() => { setInteractiveMode("morbidity"); setToggleState(true); }}
                className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all ${
                  interactiveMode === "morbidity" ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Tissue Damage
              </button>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-stone-200 mb-3">
              <span className="text-xs font-semibold text-stone-800">
                {interactiveMode === "exposure" && "Include Human Encounter Frequency"}
                {interactiveMode === "yield" && "Include Venom Dose Volume (Yield)"}
                {interactiveMode === "morbidity" && "Include Morbidity / Permanent Tissue Damage"}
              </span>
              <button
                onClick={() => setToggleState(!toggleState)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  toggleState ? "bg-stone-900" : "bg-stone-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    toggleState ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Toggle Result Box */}
            <div className="text-xs space-y-2">
              {interactiveMode === "exposure" && (
                toggleState ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                    <p className="font-bold text-emerald-950 mb-0.5">🏆 #1 Russell&apos;s Viper &gt; #5 Inland Taipan</p>
                    <p>
                      <strong>Why?</strong> Russell&apos;s Viper lives in heavily populated farmlands across Asia, encountering thousands of people a year. Exposure multiplier boosts its real-world risk.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                    <p className="font-bold text-amber-950 mb-0.5">⚠️ #1 Inland Taipan &gt; #2 Russell&apos;s Viper</p>
                    <p>
                      <strong>Without Exposure:</strong> Inland Taipan takes #1 because its venom is drop-for-drop 100x more toxic, even though it lives in an empty desert and rarely sees a human.
                    </p>
                  </div>
                )
              )}

              {interactiveMode === "yield" && (
                toggleState ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                    <p className="font-bold text-emerald-950 mb-0.5">🏆 Gaboon Viper (High Rank) &gt; Eastern Coral Snake</p>
                    <p>
                      <strong>Why?</strong> A Gaboon Viper injects a massive flood of venom (~450mg) in one bite, making it far more lethal overall than a tiny coral snake.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                    <p className="font-bold text-amber-950 mb-0.5">⚠️ Eastern Coral Snake &gt; Gaboon Viper</p>
                    <p>
                      <strong>Potency Only:</strong> The Coral Snake has higher drop-for-drop toxicity (LD50), but only produces a tiny 5mg droplet. Ignoring volume gives a false rank!
                    </p>
                  </div>
                )
              )}

              {interactiveMode === "morbidity" && (
                toggleState ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900">
                    <p className="font-bold text-emerald-950 mb-0.5">🏆 Puff Adder Gets High Clinical Rank</p>
                    <p>
                      <strong>Why?</strong> Even when victims survive a Puff Adder bite, the cytotoxic venom causes severe necrosis, tissue destruction, and frequent amputations.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                    <p className="font-bold text-amber-950 mb-0.5">⚠️ Puff Adder Score Drops Significantly</p>
                    <p>
                      <strong>Fatality Only:</strong> Ignoring non-fatal damage severely under-ranks snakes that maim people for life.
                    </p>
                  </div>
                )
              )}
            </div>
          </section>

          {/* Section 1: Lethality */}
          <section>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
              1. Venom Lethality (55%)
            </h4>
            <p>
              We measure how many human-lethal doses a single bite can deliver. This combines two factors:
            </p>
            <ul className="list-disc pl-5 mt-1.5 space-y-1 text-stone-600">
              <li>
                <strong className="text-stone-800">Potency (LD50):</strong> How toxic the venom is drop-for-drop. Lower LD50 means stronger venom.
              </li>
              <li>
                <strong className="text-stone-800">Yield:</strong> How much venom the snake injects in a full bite.
              </li>
            </ul>
            <p className="mt-2 text-stone-600 text-xs">
              *All published LD50 lab tests are normalized to a standard Subcutaneous (SC) baseline so different species can be compared fairly.
            </p>
          </section>

          {/* Section 2: Clinical Severity */}
          <section className="pt-4 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
              2. Clinical Severity &amp; Human Harm (45%)
            </h4>
            <p>
              Lethality tells us if venom <em>can</em> kill. Clinical Severity measures what <em>actually happens</em> to human victims:
            </p>
            <ul className="list-disc pl-5 mt-1.5 space-y-1 text-stone-600">
              <li>
                <strong className="text-stone-800">Fatality Rate:</strong> The percentage of untreated bites that result in death.
              </li>
              <li>
                <strong className="text-stone-800">Morbidity (Tissue Damage):</strong> Point bonuses for severe non-fatal harm like paralysis, organ damage, or necrosis (tissue destruction leading to amputation).
              </li>
            </ul>
          </section>

          {/* Section 3: Real-World Modifiers */}
          <section className="pt-4 border-t border-stone-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">
              3. Real-World Risk Multipliers
            </h4>
            <p>
              Intrinsic toxicity is multiplied by real-world behavioral and ecological factors:
            </p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <span className="font-semibold text-stone-800 block mb-0.5">⚡ Venom Speed</span>
                Fast-acting venom leaves less time to reach emergency care.
              </div>
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <span className="font-semibold text-stone-800 block mb-0.5">🦷 Delivery Method</span>
                Rear-fanged snakes that chew venom are less efficient than front-fanged vipers.
              </div>
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <span className="font-semibold text-stone-800 block mb-0.5">👤 Human Exposure</span>
                Combines geographic overlap with snake aggression (will it strike if approached?).
              </div>
            </div>
            <p className="mt-2 text-stone-500 text-xs">
              Because these are multipliers, a fast or aggressive snake that has non-venomous bite will still receive a Danger Score of 0.
            </p>
          </section>

          {/* Footer Note */}
          <div className="pt-3 border-t border-stone-200 text-xs text-stone-500">
            <p>
              <strong>Data Sources:</strong> WHO Snakebite Information Platform, Snake Venom Database (SVDB), snakeDB.org, The Reptile Database, and Broad et al. (1979) LD50 conversion standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

