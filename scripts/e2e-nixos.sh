#!/usr/bin/env bash
# Run Playwright e2e on NixOS inside a buildFHSEnv carrying the glibc-era libs
# Playwright's bundled chromium needs. NixOS's stub loader rejects those
# generic-linux binaries out of the box (nix.dev/permalink/stub-ld).
# Self-contained: builds the FHS env via nix-build on first run, caches it after.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_DIR="${PLAYWRIGHT_FHS_ENV:-$HOME/.cache/frontend-prototype/pw-fhs}"
if [[ ! -x "$ENV_DIR/bin/pw-fhs" ]]; then
  mkdir -p "$(dirname "$ENV_DIR")"
  nix-build --no-link --out-link "$ENV_DIR" - <<'NIX'
{ pkgs ? import <nixpkgs> {} }:
pkgs.buildFHSEnv {
  name = "pw-fhs";
  targetPkgs = p: with p; [
    alsa-lib atk at-spi2-atk at-spi2-core dbus expat glib libdrm libgbm libnotify mesa nss nspr systemd
    xorg.libX11 xorg.libxcb xorg.libXcomposite xorg.libXdamage xorg.libXext xorg.libXfixes xorg.libXrandr libxkbcommon
  ];
  runScript = "bash";
}
NIX
fi

# Match playwright.config.ts CI workers: default to 2 to avoid parallelism flakes.
# $* expands to the script's args; -c receives the expanded command string.
exec "$ENV_DIR/bin/pw-fhs" -c "cd \"$PWD\" && npx playwright test --workers=2 $*"