import type { Markets } from "@/lib/types";
import { formatChange, trend } from "@/lib/format";

export function MarketsSection({ markets }: { markets: Markets | null }) {
  return (
    <section className="mkt" aria-labelledby="mkt-title">
      <div className="section-head">
        <h2 id="mkt-title">Indicadores</h2>
      </div>
      {!markets || markets.items.length === 0 ? (
        <div className="empty">Os indicadores financeiros aparecem na próxima atualização.</div>
      ) : (
        <>
          <ul className="mkt-grid">
            {markets.items.map((it) => (
              <li key={it.id} className="mkt-item">
                <span className="mkt-label">{it.label}</span>
                <span className="mkt-value">{it.value ?? "–"}</span>
                {typeof it.change === "number" ? (
                  <span className={`mkt-chg ${trend(it.change)}`} aria-label={formatChange(it.change).label}>
                    {formatChange(it.change).text}
                  </span>
                ) : (
                  <span className="mkt-chg none">
                    {it.value == null ? "indisponível" : it.id === "cdi-selic" ? "CDI · meta Selic" : "sem variação"}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {markets.asOf ? <p className="mkt-asof">{markets.asOf}</p> : null}
        </>
      )}
    </section>
  );
}
