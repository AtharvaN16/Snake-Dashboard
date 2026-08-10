"use client";

import { PaperTexture } from "@paper-design/shaders-react";
import { useEffect, useState } from "react";

export function PaperAppBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-[#f3f3f3]" />
    );
  }

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#f3f3f3]">
      <div 
        className="w-full h-full transition-opacity duration-1000 ease-in-out"
        style={{ opacity: mounted ? 1 : 0 }}
      >
        {mounted && (
          <PaperTexture
            style={{ width: "100%", height: "100%" }}
            speed={0}
            scale={0.9}
            colorBack="#f3f3f3"
            colorFront="#d9d9d9"
            contrast={0.24}
            roughness={0.42}
            fiber={0.28}
            fiberSize={0.2}
            crumples={0.2}
            crumpleSize={0.38}
            folds={0.3}
            foldCount={4}
            fade={0.08}
            drops={0.12}
            seed={8.4}
          />
        )}
      </div>
    </div>
  );
}
