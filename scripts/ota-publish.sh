#!/usr/bin/env bash
# Pubblica un OTA su branch production SOLO se il token backend è presente.
# Motivo: EXPO_PUBLIC_* è incorporato nel bundle al momento dell'export; senza
# token il backend risponde 401 e l'app ripiega su 1-2 provider (incidenti
# 2026-06-27/30 e 2026-10-06/09). Uso: scripts/ota-publish.sh "messaggio"
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; [ -f .env.local ] && source .env.local; set +a
if [ -z "${EXPO_PUBLIC_APP_SECRET_TOKEN:-}" ]; then
  echo "ERRORE: EXPO_PUBLIC_APP_SECRET_TOKEN vuoto/assente in .env.local — OTA annullato." >&2
  exit 1
fi
npx eas-cli@latest update --branch production --message "${1:?messaggio richiesto}" --non-interactive
# Verifica: il token deve essere nei bundle esportati (dist/)
for f in dist/_expo/static/js/*/*.hbc; do
  grep -q -a -F "$EXPO_PUBLIC_APP_SECRET_TOKEN" "$f" || { echo "ERRORE: token ASSENTE in $f — ripubblicare!" >&2; exit 1; }
done
echo "OK: token presente in tutti i bundle pubblicati."
