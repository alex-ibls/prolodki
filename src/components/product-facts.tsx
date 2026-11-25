"use client";

import { useState } from "react";
import { SpecGrid } from "@/components/catalog-ui";

type Spec = { key: string; code: string; icon?: string; label: string; value: string; href?: string };

export function ProductFacts({ description, specs }: { description: string; specs: Spec[] }) {
  const text = description.trim();
  const [tab, setTab] = useState<"description" | "specs">(text ? "description" : "specs");
  if (!text && specs.length === 0) return null;
  return (
    <section>
      <div role="tablist" aria-label="Описание и характеристики" className="flex gap-4 border-b border-line">
        <TabButton id="description" active={tab === "description"} onClick={() => setTab("description")}>
          Описание
        </TabButton>
        <TabButton id="specs" active={tab === "specs"} onClick={() => setTab("specs")}>
          Характеристики
        </TabButton>
      </div>
      <div className="mt-3" role="tabpanel">
        {tab === "description" ? (
          text ? <p className="whitespace-pre-wrap text-sm leading-6">{text}</p> : <p className="text-sm text-muted">Описание пока не заполнено.</p>
        ) : specs.length ? (
          <SpecGrid items={specs} />
        ) : (
          <p className="text-sm text-muted">Характеристики пока не заполнены.</p>
        )}
      </div>
    </section>
  );
}

function TabButton({
  id,
  active,
  onClick,
  children,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      id={`product-tab-${id}`}
      aria-selected={active}
      className={`border-b-2 px-1 py-2 text-sm font-semibold ${active ? "border-navy text-deep" : "border-transparent text-muted"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
