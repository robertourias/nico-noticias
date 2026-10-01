#!/usr/bin/env bash
# Publica um novo data/news.json no GitHub (usado pela tarefa agendada).
#
# Uso:   GITHUB_TOKEN=... scripts/publish-news.sh "mensagem do commit"
#
# O token NUNCA fica no código nem no histórico do git: ele é lido da variável
# de ambiente GITHUB_TOKEN e enviado só no cabeçalho HTTP do push.
set -euo pipefail

: "${GITHUB_TOKEN:?Defina a variável de ambiente GITHUB_TOKEN}"
REPO="${GITHUB_REPOSITORY:-robertourias/nico-noticias}"
BRANCH="${GITHUB_BRANCH:-main}"
MSG="${1:-Atualiza notícias}"

cd "$(dirname "$0")/.."

node scripts/validate-news.mjs

if git diff --quiet -- data/news.json; then
  echo "news.json sem mudanças; nada a publicar."
  exit 0
fi

git add data/news.json
git -c user.name="nico-noticias-bot" -c user.email="nico-noticias-bot@users.noreply.github.com" \
  commit -m "$MSG" --quiet

AUTH="$(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 | tr -d '\n')"
git -c http.extraHeader="Authorization: Basic ${AUTH}" \
  push --quiet "https://github.com/${REPO}.git" "HEAD:${BRANCH}"

echo "Publicado em ${REPO}@${BRANCH}."
