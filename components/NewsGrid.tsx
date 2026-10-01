import type { Category } from "@/lib/types";
import { safeUrl } from "@/lib/format";

export function NewsGrid({ category }: { category: Category }) {
  const items = category.items;
  return (
    <>
      <div className="section-head">
        <h2>{category.label}</h2>
        {items.length ? <p>{items.length} notícias</p> : null}
      </div>
      {items.length === 0 ? (
        <div className="empty">
          <strong>As notícias de {category.label} chegam na próxima atualização</strong>
          <span>A página é atualizada automaticamente às 8h e às 14h.</span>
        </div>
      ) : (
        <div className="grid">
          {items.map((it) => {
            const href = safeUrl(it.url);
            return (
              <article key={it.url + it.title} className="card">
                <div className="meta">
                  {it.source}
                  {it.time ? <span className="time">{it.time}</span> : null}
                </div>
                <h3>
                  <a className="title-link" href={href} target="_blank" rel="noopener noreferrer">
                    {it.title}
                  </a>
                </h3>
                <p className="summary">{it.summary}</p>
                <a
                  className="read"
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ler matéria completa: ${it.title}`}
                >
                  Ler matéria completa
                </a>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
