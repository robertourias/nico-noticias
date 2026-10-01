#!/usr/bin/env node
// Valida data/news.json antes de cada commit/deploy.
// Uso: npm run validate:data  (sai com código 1 se houver erro)
import { readFileSync } from "node:fs";

const FILE = new URL("../data/news.json", import.meta.url);
const CATEGORIES = ["noticias", "economia", "programacao", "ia", "taboao", "tenis", "saude"];
const MARKETS = ["ibov", "ifix", "cdi-selic", "sp500", "nasdaq100", "dow", "usd", "eur", "btc", "eth", "sol"];

const errors = [];
const err = (msg) => errors.push(msg);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const numOrNull = (v) => v === null || isNum(v);
const https = (v) => typeof v === "string" && /^https:\/\//.test(v);

let data;
try {
  data = JSON.parse(readFileSync(FILE, "utf8"));
} catch (e) {
  console.error(`news.json inválido: ${e.message}`);
  process.exit(1);
}

if (data.updatedAt !== null && Number.isNaN(Date.parse(data.updatedAt))) err("updatedAt não é uma data ISO válida");

if (data.markets !== null) {
  const ids = (data.markets?.items ?? []).map((i) => i.id);
  if (ids.join() !== MARKETS.join()) err(`markets.items deve ter, nesta ordem: ${MARKETS.join(", ")}`);
  for (const it of data.markets?.items ?? []) {
    if (typeof it.label !== "string") err(`markets.${it.id}: label ausente`);
    if (it.value !== null && typeof it.value !== "string") err(`markets.${it.id}: value deve ser texto ou null`);
    if (!numOrNull(it.change)) err(`markets.${it.id}: change deve ser número ou null`);
  }
}

if (data.weather !== null) {
  const w = data.weather ?? {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(w.date ?? "")) err("weather.date deve ser AAAA-MM-DD");
  for (const k of ["min", "max", "rainChance", "rainMm", "uv"]) if (!numOrNull(w[k])) err(`weather.${k} deve ser número ou null`);
  if (w.url != null && !https(w.url)) err("weather.url deve começar com https://");
}

const catIds = (data.categories ?? []).map((c) => c.id);
if (catIds.join() !== CATEGORIES.join()) err(`categories deve ter, nesta ordem: ${CATEGORIES.join(", ")}`);
for (const c of data.categories ?? []) {
  if (!Array.isArray(c.items)) { err(`${c.id}: items deve ser lista`); continue; }
  c.items.forEach((n, i) => {
    for (const k of ["title", "summary", "source"]) if (typeof n[k] !== "string" || !n[k].trim()) err(`${c.id}[${i}].${k} vazio`);
    if (!https(n.url)) err(`${c.id}[${i}].url deve começar com https://`);
    if ("image" in n) err(`${c.id}[${i}]: não use o campo image`);
  });
}

if (errors.length) {
  console.error(`news.json com ${errors.length} problema(s):\n- ` + errors.join("\n- "));
  process.exit(1);
}
console.log("news.json ok — " + data.categories.map((c) => `${c.id}: ${c.items.length}`).join(", "));
