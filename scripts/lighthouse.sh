#!/usr/bin/env bash
# Runs Lighthouse on the plugin's main routes (desktop + mobile) against a running preview server.
# Usage: scripts/lighthouse.sh <out-dir> [base-url]
set -euo pipefail

OUT="${1:?usage: scripts/lighthouse.sh <out-dir> [base-url]}"
BASE="${2:-http://localhost:4173}"
mkdir -p "$OUT"

ROUTES=(
  "inicio:/org/componentes-agueda/inicio?as=rui"
  "ativos:/org/componentes-agueda/ativos?as=rui"
  "avaliacao:/org/componentes-agueda/avaliacao?as=rui"
  "riscos:/clientes/componentes-agueda/riscos?as=marta"
)

for entry in "${ROUTES[@]}"; do
  name="${entry%%:*}"
  path="${entry#*:}"
  for factor in desktop mobile; do
    preset=()
    [ "$factor" = desktop ] && preset=(--preset=desktop)
    lighthouse "$BASE$path&tour=0" ${preset[@]+"${preset[@]}"} \
      --chrome-flags="--headless=new" --quiet \
      --output=json --output=html --output-path="$OUT/$name-$factor" >/dev/null
    node -e '
      const r = require(process.argv[1]); const c = r.categories, a = r.audits;
      const s = (k) => Math.round(c[k].score * 100);
      console.log([process.argv[2], s("performance"), s("accessibility"), s("best-practices"), s("seo"),
        a["largest-contentful-paint"].displayValue, a["cumulative-layout-shift"].displayValue, a["total-blocking-time"].displayValue].join("\t"))
    ' "$PWD/$OUT/$name-$factor.report.json" "$name-$factor" | tee -a "$OUT/summary.tsv"
  done
done
