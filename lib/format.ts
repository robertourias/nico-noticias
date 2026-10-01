const TZ = "America/Sao_Paulo";

/** Aceita apenas links http(s); qualquer outra coisa vira "#". */
export function safeUrl(url: string | null | undefined): string {
  return url && /^https?:\/\//i.test(url) ? url : "#";
}

/** Número no padrão brasileiro (vírgula decimal). */
export function br(n: number): string {
  return String(n).replace(".", ",");
}

export function formatUpdatedAt(iso: string | null): string {
  if (!iso) return "Aguardando a primeira atualização";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Aguardando a primeira atualização";
  return (
    "Atualizado em " +
    d.toLocaleString("pt-BR", {
      timeZone: TZ,
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

export function formatWeatherDate(date: string): string | null {
  const d = new Date(`${date}T12:00:00-03:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export type Trend = "up" | "down" | "flat";

export function trend(change: number): Trend {
  return change > 0 ? "up" : change < 0 ? "down" : "flat";
}

export function formatChange(change: number): { text: string; label: string } {
  const dir = trend(change);
  const abs = Math.abs(change).toFixed(2).replace(".", ",");
  const signed = change.toFixed(2).replace(".", ",");
  return {
    text: (dir === "up" ? "▲ +" : dir === "down" ? "▼ " : "") + signed + "%",
    label: (dir === "up" ? "alta de " : dir === "down" ? "queda de " : "variação de ") + abs + "%",
  };
}

export function uvLevel(uv: number): { label: string; color: string } {
  if (uv < 3) return { label: "baixo", color: "#3a8a2e" };
  if (uv < 6) return { label: "moderado", color: "#a07a00" };
  if (uv < 8) return { label: "alto", color: "#d0600a" };
  if (uv < 11) return { label: "muito alto", color: "#c4170c" };
  return { label: "extremo", color: "#7a2fa0" };
}
