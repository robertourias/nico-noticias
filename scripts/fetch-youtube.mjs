#!/usr/bin/env node
// Coleta os vídeos mais recentes dos canais do Missão/MBL pelo feed RSS público
// do YouTube e grava em data/youtube.json. Roda na GitHub Action "youtube-feed"
// (o ambiente da tarefa agendada não consegue abrir o RSS). Sem dependências.
//
// Uso: node scripts/fetch-youtube.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const OUT = new URL("../data/youtube.json", import.meta.url);
const PER_CHANNEL = 10;
const DESC_MAX = 600;
const UA = "Mozilla/5.0 (compatible; nico-noticias-bot; +https://news.nico.dev.br)";

// O channelId é resolvido a partir do @handle a cada execução; o id abaixo é só reserva.
export const CHANNELS = [
  { handle: "renansantosmbl", name: "Renan Santos", fallbackId: "UCMLluq-qSne85Un73ToYI2w" },
  { handle: "MissaoAvanca", name: "Missão Avança", fallbackId: "UCZgq9x4I2USHERyambVh_lQ" },
  { handle: "kimkataguiri", name: "Kim Kataguiri", fallbackId: "UCpHQyEuBXwYBvXC1_NResCg" },
  { handle: "Mamaefalei", name: "Arthur do Val - MamãeFalei", fallbackId: "UCkSjy-IOEq-eMtarZl2uH1Q" },
  { handle: "brazilmissao", name: "Missão Brasil", fallbackId: "UCfEJAoOc9CtMjfPuoo6s9sw" },
  { handle: "TVdoMBL", name: "MBL TV", fallbackId: "UCZYyHef3eBoBEztAOY_Fe_g" },
  { handle: "mblivre", name: "MBL - Movimento Brasil Livre", fallbackId: "UC8QAdpiEWAOg3AOCCFDCOYw" },
];

const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1].trim()) : "";
};

/** Converte o XML do feed em lista de vídeos (mais recentes primeiro). */
export function parseFeed(xml) {
  const author = tag(xml.replace(/<entry>[\s\S]*$/, ""), "name");
  const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
    const id = tag(e, "yt:videoId");
    return {
      id,
      title: tag(e, "title"),
      url: `https://www.youtube.com/watch?v=${id}`,
      published: tag(e, "published"),
      description: tag(e, "media:description").replace(/\s+/g, " ").slice(0, DESC_MAX),
    };
  });
  videos.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  return { author, videos: videos.filter((v) => v.id && v.title && !Number.isNaN(Date.parse(v.published))) };
}

async function get(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, "accept-language": "pt-BR,pt;q=0.9" }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
  return res.text();
}

async function resolveChannelId(ch) {
  try {
    const html = await get(`https://www.youtube.com/@${ch.handle}`);
    const m =
      html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) ||
      html.match(/"externalId":"(UC[\w-]{22})"/) ||
      html.match(/"channelId":"(UC[\w-]{22})"/);
    if (m) return m[1];
  } catch (e) {
    console.warn(`[${ch.handle}] não resolveu o channelId (${e.message}); usando o id reserva`);
  }
  return ch.fallbackId;
}

async function main() {
  let previous = {};
  if (existsSync(OUT)) {
    try {
      for (const c of JSON.parse(readFileSync(OUT, "utf8")).channels ?? []) previous[c.handle] = c;
    } catch {}
  }

  const channels = [];
  for (const ch of CHANNELS) {
    const channelId = await resolveChannelId(ch);
    try {
      const { author, videos } = parseFeed(await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`));
      if (!videos.length) throw new Error("feed sem vídeos");
      console.log(`[${ch.handle}] ${channelId} "${author}": ${videos.length} vídeos, mais recente ${videos[0].published}`);
      channels.push({ handle: `@${ch.handle}`, name: ch.name, channelName: author, channelId, ok: true, videos: videos.slice(0, PER_CHANNEL) });
    } catch (e) {
      console.error(`[${ch.handle}] falhou: ${e.message}`);
      const old = previous[`@${ch.handle}`];
      channels.push({ handle: `@${ch.handle}`, name: ch.name, channelId, ok: false, error: e.message, videos: old?.videos ?? [] });
    }
  }

  if (!channels.some((c) => c.ok)) {
    console.error("Nenhum canal respondeu; data/youtube.json não foi alterado.");
    process.exit(1);
  }
  const out = { updatedAt: new Date().toISOString(), channels };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`data/youtube.json gravado: ${channels.filter((c) => c.ok).length}/${channels.length} canais ok.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
