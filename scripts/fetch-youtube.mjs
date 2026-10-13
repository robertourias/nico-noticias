#!/usr/bin/env node
// Coleta os vídeos mais recentes dos canais do Missão/MBL e grava em data/youtube.json.
// Roda na GitHub Action "youtube-feed" (o ambiente da tarefa agendada não alcança o
// YouTube). Sem dependências. Para cada canal tenta, nesta ordem:
//   1. API oficial do YouTube (só se a variável YOUTUBE_API_KEY existir)
//   2. feed RSS por channel_id
//   3. feed RSS da playlist de uploads (UU...)
//   4. página pública /@canal/videos (datas aproximadas: "há 3 horas")
//
// Uso: node scripts/fetch-youtube.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const OUT = new URL("../data/youtube.json", import.meta.url);
const PER_CHANNEL = 10;
const DESC_MAX = 600;
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// O channelId é resolvido pelo @handle; o id abaixo é só reserva.
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

const oneLine = (s) => s.replace(/\s+/g, " ").trim();

/** Converte o XML do feed RSS em lista de vídeos (mais recentes primeiro). */
export function parseFeed(xml) {
  const author = tag(xml.replace(/<entry>[\s\S]*$/, ""), "name");
  const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([, e]) => {
    const id = tag(e, "yt:videoId");
    return {
      id,
      title: tag(e, "title"),
      url: `https://www.youtube.com/watch?v=${id}`,
      published: tag(e, "published"),
      description: oneLine(tag(e, "media:description")).slice(0, DESC_MAX),
    };
  });
  videos.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  return { author, videos: videos.filter((v) => v.id && v.title && !Number.isNaN(Date.parse(v.published))) };
}

const UNIT_MS = {
  segundo: 1e3, second: 1e3,
  minuto: 6e4, minute: 6e4,
  hora: 36e5, hour: 36e5,
  dia: 864e5, day: 864e5,
  semana: 6048e5, week: 6048e5,
  mes: 2592e6, meses: 2592e6, month: 2592e6,
  ano: 31536e6, year: 31536e6,
};

/** "há 3 horas" / "3 days ago" -> ISO aproximado; null se não entender. */
export function relativeToIso(text, now = new Date()) {
  const m = text
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .match(/(\d+)\s*(segundo|second|minuto|minute|hora|hour|dia|day|semana|week|meses|mes|month|ano|year)/);
  if (!m) return null;
  return new Date(now.getTime() - Number(m[1]) * UNIT_MS[m[2]]).toISOString();
}

const runsText = (o) => (o ? (o.simpleText ?? (o.runs ?? []).map((r) => r.text).join("")) : "");

function collect(node, out) {
  if (Array.isArray(node)) node.forEach((n) => collect(n, out));
  else if (node && typeof node === "object") {
    if (node.videoRenderer) out.push(node.videoRenderer);
    for (const v of Object.values(node)) collect(v, out);
  }
  return out;
}

/** Lê a página /@canal/videos (ytInitialData). Datas aproximadas. */
export function parseChannelHtml(html, now = new Date()) {
  const channelId = (html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) ||
    html.match(/"externalId":"(UC[\w-]{22})"/) ||
    html.match(/"channelId":"(UC[\w-]{22})"/) || [])[1];
  const blob = html.match(/ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  let videos = [];
  if (blob) {
    const seen = new Set();
    for (const r of collect(JSON.parse(blob[1]), [])) {
      const published = relativeToIso(runsText(r.publishedTimeText), now);
      if (!r.videoId || seen.has(r.videoId) || !published) continue;
      seen.add(r.videoId);
      videos.push({
        id: r.videoId,
        title: oneLine(runsText(r.title)),
        url: `https://www.youtube.com/watch?v=${r.videoId}`,
        published,
        publishedApprox: true,
        description: oneLine(runsText(r.descriptionSnippet)).slice(0, DESC_MAX),
      });
    }
  }
  return { channelId, videos: videos.filter((v) => v.title) };
}

async function get(url, extra = {}) {
  const res = await fetch(url, {
    headers: { "user-agent": UA, "accept-language": "pt-BR,pt;q=0.9", cookie: "CONSENT=YES+1; SOCS=CAI", ...extra },
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.text();
  if (!res.ok) {
    const safe = url.replace(/key=[^&]+/, "key=***");
    throw new Error(`HTTP ${res.status} em ${safe} :: ${oneLine(body).slice(0, 120)}`);
  }
  return body;
}

async function viaApi(ch, key) {
  const j = async (u) => JSON.parse(await get(u));
  const c = await j(
    `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${encodeURIComponent("@" + ch.handle)}&key=${key}`,
  );
  const item = c.items?.[0];
  if (!item) throw new Error("canal não encontrado na API");
  const p = await j(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=${PER_CHANNEL}&playlistId=${item.contentDetails.relatedPlaylists.uploads}&key=${key}`,
  );
  const videos = p.items
    .map((i) => ({
      id: i.contentDetails.videoId,
      title: i.snippet.title,
      url: `https://www.youtube.com/watch?v=${i.contentDetails.videoId}`,
      published: i.contentDetails.videoPublishedAt || i.snippet.publishedAt,
      description: oneLine(i.snippet.description ?? "").slice(0, DESC_MAX),
    }))
    .filter((v) => v.id && v.title && !Number.isNaN(Date.parse(v.published)));
  videos.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  return { channelId: item.id, channelName: item.snippet?.title ?? "", videos };
}

async function collectChannel(ch) {
  const errors = [];
  let result = null;
  const attempt = async (method, fn) => {
    if (result) return;
    try {
      const r = await fn();
      if (!r.videos.length) throw new Error("nenhum vídeo");
      result = { method, ...r };
      console.log(`[${ch.handle}] ${method}: ${r.videos.length} vídeos, mais recente ${r.videos[0].published}`);
    } catch (e) {
      errors.push(`${method}: ${e.message}`);
      console.warn(`[${ch.handle}] ${method} falhou: ${e.message}`);
    }
  };

  const key = process.env.YOUTUBE_API_KEY;
  if (key) await attempt("api", () => viaApi(ch, key));

  // Página pública: resolve o channelId e serve de último recurso.
  let page = { channelId: undefined, videos: [] };
  try {
    page = parseChannelHtml(await get(`https://www.youtube.com/@${ch.handle}/videos?hl=pt-BR`));
    console.log(`[${ch.handle}] página: channelId ${page.channelId ?? "não achado"}, ${page.videos.length} vídeos`);
  } catch (e) {
    errors.push(`página: ${e.message}`);
    console.warn(`[${ch.handle}] página falhou: ${e.message}`);
  }
  const channelId = page.channelId ?? ch.fallbackId;
  if (!page.channelId) console.warn(`[${ch.handle}] usando channelId reserva ${channelId}`);

  await attempt("rss", async () => {
    const { author, videos } = parseFeed(await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`));
    return { channelId, channelName: author, videos };
  });
  await attempt("rss-playlist", async () => {
    const { author, videos } = parseFeed(
      await get(`https://www.youtube.com/feeds/videos.xml?playlist_id=${channelId.replace(/^UC/, "UU")}`),
    );
    return { channelId, channelName: author, videos };
  });
  await attempt("pagina", async () => ({ channelId, videos: page.videos }));

  return { channelId, result, errors };
}

async function main() {
  const previous = {};
  if (existsSync(OUT)) {
    try {
      for (const c of JSON.parse(readFileSync(OUT, "utf8")).channels ?? []) previous[c.handle] = c;
    } catch {}
  }

  const channels = [];
  for (const ch of CHANNELS) {
    const { channelId, result, errors } = await collectChannel(ch);
    const handle = `@${ch.handle}`;
    if (result) {
      channels.push({
        handle, name: ch.name, channelName: result.channelName ?? "", channelId: result.channelId ?? channelId,
        ok: true, method: result.method, videos: result.videos.slice(0, PER_CHANNEL),
      });
    } else {
      channels.push({ handle, name: ch.name, channelId, ok: false, error: errors.join(" | "), videos: previous[handle]?.videos ?? [] });
    }
  }

  if (!channels.some((c) => c.ok)) {
    console.error("Nenhum canal respondeu; data/youtube.json não foi alterado.");
    process.exit(1);
  }
  writeFileSync(OUT, JSON.stringify({ updatedAt: new Date().toISOString(), channels }, null, 2) + "\n");
  console.log(`data/youtube.json gravado: ${channels.filter((c) => c.ok).length}/${channels.length} canais ok.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
