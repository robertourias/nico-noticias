"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type Tab = { id: string; label: string };

const STORAGE_KEY = "nico-noticias-tab";

/**
 * Abas de editorias. Os painéis chegam prontos do servidor (HTML estático);
 * aqui só alternamos qual fica visível, lembrando a última aba do leitor.
 */
export function NewsTabs({ tabs, panels }: { tabs: Tab[]; panels: Record<string, ReactNode> }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const buttons = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    let start = window.location.hash.slice(1);
    if (!tabs.some((t) => t.id === start)) {
      try {
        start = localStorage.getItem(STORAGE_KEY) ?? "";
      } catch {
        start = "";
      }
    }
    // Restaura a aba do leitor (hash ou última visita) depois da hidratação.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tabs.some((t) => t.id === start)) setActive(start);
  }, [tabs]);

  function select(id: string, focus = false) {
    setActive(id);
    // Mantém a aba no endereço (#ia, #economia...) para o link poder ser compartilhado.
    history.replaceState(null, "", `#${id}`);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* armazenamento indisponível: ignora */
    }
    const b = buttons.current[id];
    if (b) {
      if (focus) b.focus();
      b.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }

  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    let n: number | null = null;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") n = 0;
    if (e.key === "End") n = tabs.length - 1;
    if (n !== null) {
      e.preventDefault();
      select(tabs[n].id, true);
    }
  }

  return (
    <>
      <nav className="tabbar" aria-label="Editorias">
        <div className="wrap tabs" role="tablist">
          {tabs.map((t, i) => (
            <button
              key={t.id}
              ref={(el) => {
                buttons.current[t.id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-controls={`panel-${t.id}`}
              aria-selected={active === t.id}
              tabIndex={active === t.id ? 0 : -1}
              className="tab"
              style={{ ["--accent" as string]: `var(--c-${t.id})` }}
              onClick={() => select(t.id)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </nav>
      {tabs.map((t) => (
        <main
          key={t.id}
          id={`panel-${t.id}`}
          className="wrap panel"
          role="tabpanel"
          aria-labelledby={`tab-${t.id}`}
          tabIndex={-1}
          hidden={active !== t.id}
          style={{ ["--accent" as string]: `var(--c-${t.id})` }}
        >
          {panels[t.id]}
        </main>
      ))}
    </>
  );
}
