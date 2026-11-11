#!/usr/bin/env bash
# Instala a CLI korin (Linux e macOS):  curl -fsSL __KORIN_URL__/install.sh | bash
# Um arquivo Node, sem dependências. Precisa do Node 22.7 ou mais novo.
set -euo pipefail

URL="${KORIN_URL:-__KORIN_URL__}"
BIN_DIR="${KORIN_BIN:-$HOME/.local/bin}"
MIN_MAJOR=22
MIN_MINOR=7

say() { printf '%s\n' "$*"; }
die() { printf 'korin: %s\n' "$*" >&2; exit 1; }

# ---- node ---------------------------------------------------------------------
NODE="$(command -v node || true)"
if [ -z "$NODE" ]; then
  say "Node.js não encontrado. A CLI precisa do Node $MIN_MAJOR.$MIN_MINOR ou mais novo."
  say "  - https://nodejs.org (LTS)"
  say "  - ou com um gerenciador: fnm install --lts / nvm install --lts"
  die "instale o Node e rode o instalador de novo."
fi
VER="$("$NODE" -v | sed 's/^v//')"
MAJOR="${VER%%.*}"; REST="${VER#*.}"; MINOR="${REST%%.*}"
if [ "$MAJOR" -lt "$MIN_MAJOR" ] || { [ "$MAJOR" -eq "$MIN_MAJOR" ] && [ "$MINOR" -lt "$MIN_MINOR" ]; }; then
  die "Node $VER é antigo demais; precisa de $MIN_MAJOR.$MIN_MINOR+ (https://nodejs.org)."
fi

# ---- download -----------------------------------------------------------------
mkdir -p "$BIN_DIR"
TMP="$(mktemp)"
if command -v curl >/dev/null 2>&1; then
  curl -fsSL "$URL/cli/korin.mjs" -o "$TMP" || die "download falhou: $URL/cli/korin.mjs"
elif command -v wget >/dev/null 2>&1; then
  wget -qO "$TMP" "$URL/cli/korin.mjs" || die "download falhou: $URL/cli/korin.mjs"
else
  die "preciso de curl ou wget."
fi
head -c 20 "$TMP" | grep -q '^#!/usr/bin/env node' || die "o arquivo baixado não parece a CLI."
mv "$TMP" "$BIN_DIR/korin"
chmod +x "$BIN_DIR/korin"
VERSION="$(grep -o -m1 'const VERSION = "[^"]*"' "$BIN_DIR/korin" | head -n1 | cut -d'"' -f2)"
say "✔ korin $VERSION instalada em $BIN_DIR/korin"

# ---- PATH ---------------------------------------------------------------------
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    say ""
    say "$BIN_DIR não está no seu PATH. Adicione ao seu shell:"
    case "${SHELL:-}" in
      */zsh)  say "  echo 'export PATH=\"$BIN_DIR:\$PATH\"' >> ~/.zshrc && source ~/.zshrc" ;;
      */fish) say "  fish_add_path $BIN_DIR" ;;
      *)      say "  echo 'export PATH=\"$BIN_DIR:\$PATH\"' >> ~/.bashrc && source ~/.bashrc" ;;
    esac
    ;;
esac

# ---- próximos passos -----------------------------------------------------------
if [ "$URL" != "https://the-korin-tower.vercel.app" ]; then "$BIN_DIR/korin" config "url=$URL" >/dev/null 2>&1 || true; fi
say ""
say "Agora:"
say "  korin login          # token gerado em $URL/conta"
say "  korin next --pick    # baixa o próximo desafio da torre"
