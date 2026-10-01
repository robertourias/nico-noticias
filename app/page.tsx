import news from "@/data/news.json";
import type { NewsData } from "@/lib/types";
import { formatUpdatedAt } from "@/lib/format";
import { WeatherStrip } from "@/components/WeatherStrip";
import { MarketsSection } from "@/components/MarketsSection";
import { NewsGrid } from "@/components/NewsGrid";
import { NewsTabs } from "@/components/NewsTabs";

const data = news as NewsData;

export default function Home() {
  const tabs = data.categories.map((c) => ({ id: c.id, label: c.label }));
  const panels = Object.fromEntries(
    data.categories.map((c) => [
      c.id,
      <>
        {c.id === "economia" ? <MarketsSection markets={data.markets} /> : null}
        <NewsGrid category={c} />
      </>,
    ]),
  );

  return (
    <>
      <header className="masthead">
        <div className="wrap">
          <h1 className="logo">
            nico<span>.</span>notícias
          </h1>
          <div className="updated">{formatUpdatedAt(data.updatedAt)}</div>
        </div>
      </header>

      <WeatherStrip weather={data.weather} />

      <NewsTabs tabs={tabs} panels={panels} />

      <footer>
        <div className="wrap">
          Atualizado automaticamente todos os dias às 8h e às 14h (horário de Brasília). Os textos são resumos; a
          matéria completa está no link de cada notícia.
        </div>
      </footer>
    </>
  );
}
