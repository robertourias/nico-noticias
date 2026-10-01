# nico.notícias

Portal de notícias pessoal em Next.js. Mostra a previsão do tempo de São Paulo e notícias por editoria:
Notícias, Economia (com os indicadores financeiros), Programação, IA, Taboão da Serra, Tênis e Saúde.

O site é **100% estático**: todo o conteúdo vem de um único arquivo, [`data/news.json`](data/news.json).
Uma tarefa agendada do Claude atualiza esse arquivo às 8h e às 14h (horário de Brasília) e faz o commit.
Cada commit em `main` dispara um novo deploy na Vercel, em **https://news.nico.dev.br**.

```
tarefa agendada ──► data/news.json ──► commit em main ──► Vercel ──► news.nico.dev.br
```

## Rodando localmente

```bash
npm install
npm run dev            # http://localhost:3000
npm run validate:data  # confere o formato de data/news.json
npm run check          # validação + lint + build (gera a pasta out/)
```

## Estrutura

| Caminho | O que é |
|---|---|
| `data/news.json` | Os dados do site. É o único arquivo que a automação altera. |
| `app/page.tsx` | Página principal (Server Component, renderizada no build). |
| `components/` | Previsão do tempo, abas, indicadores e grade de notícias. |
| `lib/` | Tipos e funções de formatação (datas e números no padrão brasileiro). |
| `scripts/validate-news.mjs` | Valida o JSON antes do commit e do deploy. |
| `scripts/publish-news.sh` | Faz o commit e o push de `data/news.json` usando `GITHUB_TOKEN`. |
| `app/fonts/` | Fontes Archivo e Public Sans (licença SIL OFL), hospedadas no projeto. |

## Formato de `data/news.json`

```jsonc
{
  "updatedAt": "2026-10-01T18:00:00-03:00",
  "markets": {
    "asOf": "Fechamento de 01/10 · cripto às 17:55",
    "items": [ { "id": "ibov", "label": "IBOV", "value": "187.197 pts", "change": 0.46 } /* ... */ ]
  },
  "weather": { "date": "2026-10-01", "condition": "...", "min": 18, "max": 24,
               "rainChance": 95, "rainMm": 25.1, "uv": null, "source": "Climatempo", "url": "https://..." },
  "categories": [
    { "id": "noticias", "label": "Notícias", "items": [
      { "title": "...", "summary": "...", "source": "CNN Brasil", "url": "https://...", "time": "hoje, 14:20" }
    ] }
    /* economia, programacao, ia, taboao, tenis, saude — nesta ordem */
  ]
}
```

Indicadores, na ordem: `ibov`, `ifix`, `cdi-selic`, `sp500`, `nasdaq100`, `dow`, `usd`, `eur`, `btc`, `eth`, `sol`.
`change` e os números do clima são números JSON ou `null`. O script de validação recusa qualquer coisa fora disso.

## Publicação

- A **Vercel** está ligada ao repositório e publica `main` em https://news.nico.dev.br. Nenhuma variável de ambiente é necessária para o site.
- O workflow [`ci.yml`](.github/workflows/ci.yml) roda `npm run check` (validação do JSON + lint + build) em cada push e pull request.

## Segredos

- O site **não usa nenhum segredo**.
- Só a automação precisa de um token do GitHub para fazer o commit. Ele é lido da variável de ambiente
  `GITHUB_TOKEN` e **nunca** é gravado no código, no JSON ou no histórico do git.
- Arquivos `.env*` estão no `.gitignore`; use [`.env.example`](.env.example) como modelo.
- Use um token *fine-grained* restrito a este repositório, com apenas **Contents: Read and write**, e com data de expiração.
