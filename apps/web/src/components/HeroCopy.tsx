"use client";

import { useEffect, useState } from "react";
import { onFeatureFlagsReady } from "@/lib/analytics";

export interface HookVariant {
  hook: string;
  subhead: string;
}

export function HeroCopy({
  defaultVariant,
  variants,
}: {
  defaultVariant: HookVariant;
  variants: Record<string, HookVariant>;
}) {
  const [active, setActive] = useState<HookVariant>(defaultVariant);

  useEffect(() => {
    return onFeatureFlagsReady((flag) => {
      if (typeof flag === "string" && variants[flag]) {
        setActive(variants[flag]);
      }
    });
  }, [variants]);

  return (
    <>
      <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
        {active.hook}
      </h1>
      <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-muted md:mx-0">
        {active.subhead}
      </p>
    </>
  );
}
