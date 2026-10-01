import type { Weather } from "@/lib/types";
import { br, formatWeatherDate, safeUrl, uvLevel } from "@/lib/format";

export function WeatherStrip({ weather }: { weather: Weather | null }) {
  const ready = weather && weather.min != null && weather.max != null;
  const parts: string[] = [];
  if (ready) {
    const day = weather.date ? formatWeatherDate(weather.date) : null;
    if (day) parts.push(day);
    if (weather.condition) parts.push(weather.condition);
  }

  return (
    <section className="weather" aria-labelledby="wx-title">
      <div className="wrap wx-inner">
        <div className="wx-place">
          <h2 id="wx-title">Tempo em São Paulo</h2>
          <p>
            {ready ? parts.join(", ") : "A previsão do dia aparece na próxima atualização."}
            {ready && weather.source ? (
              <>
                . Fonte:{" "}
                <a href={safeUrl(weather.url)} target="_blank" rel="noopener noreferrer">
                  {weather.source}
                </a>
              </>
            ) : null}
          </p>
        </div>
        {ready ? (
          <dl className="wx-stats">
            <div className="wx-stat">
              <dt>Mínima</dt>
              <dd className="wx-min">{br(weather.min!)}°C</dd>
            </div>
            <div className="wx-stat">
              <dt>Máxima</dt>
              <dd className="wx-max">{br(weather.max!)}°C</dd>
            </div>
            <div className="wx-stat">
              <dt>Chuva</dt>
              <dd>
                {weather.rainChance != null ? `${weather.rainChance}%` : "–"}
                {weather.rainMm != null ? <small> {br(weather.rainMm)} mm</small> : null}
              </dd>
            </div>
            <div className="wx-stat">
              <dt>Índice UV</dt>
              <dd>
                {weather.uv != null ? (
                  <>
                    {br(weather.uv)}
                    <span className="uv-chip" style={{ background: uvLevel(weather.uv).color }}>
                      {uvLevel(weather.uv).label}
                    </span>
                  </>
                ) : (
                  "–"
                )}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
    </section>
  );
}
