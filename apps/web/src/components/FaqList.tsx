"use client";

import { useRef } from "react";
import { track } from "@/lib/analytics";

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  const seen = useRef(new Set<string>());

  return (
    <div className="mt-10 divide-y divide-line rounded-3xl border border-line bg-card">
      {items.map((f) => (
        <details
          key={f.q}
          className="group px-6 py-5"
          onToggle={(e) => {
            if ((e.currentTarget as HTMLDetailsElement).open && !seen.current.has(f.q)) {
              seen.current.add(f.q);
              track("faq_open", { question: f.q });
            }
          }}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
            {f.q}
            <span className="text-muted transition group-open:rotate-45">+</span>
          </summary>
          <p className="mt-3 leading-relaxed text-muted">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
