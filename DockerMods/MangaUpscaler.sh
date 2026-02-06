# ----------------------------------------------------------------------------------------------------
# Name: MangaUpscaler
# Description: This DockerMod installs and configures two of the most powerful NCNN Vulkan-based upscaling engines—Real-ESRGAN and Waifu2x—specifically optimized for manga, anime, and illustration processing.
# Revision: 2
# Icon: data:image/webp;base64,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
# ----------------------------------------------------------------------------------------------------

#!/bin/bash
set -euo pipefail

# ---------------- logging (stderr) ----------------
ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(ts)] [dockermod:manga-upscalers] $*" >&2; }
warn() { echo "[$(ts)] [dockermod:manga-upscalers] ⚠️  $*" >&2; }
die() { echo "[$(ts)] [dockermod:manga-upscalers] ❌ $*" >&2; exit 1; }

# ---------------- guard ----------------
[[ -n "${common:-}" ]] || die "\$common not set (FileFlows should set this)."

# ---------------- paths ----------------
BASE="$common/manga-upscalers"
TMP="/tmp/manga-upscalers"
mkdir -p "$BASE" "$TMP"

RES_BASE="$BASE/realesrgan"
RES_BIN="$RES_BASE/realesrgan-ncnn-vulkan.bin"
RES_MODELS="$RES_BASE/models"
RES_WRAP="/usr/local/bin/realesrgan-ncnn-vulkan"
RES_INFO="$RES_BASE/INSTALL_INFO.txt"

W2X_BASE="$BASE/waifu2x"
W2X_BIN="$W2X_BASE/waifu2x-ncnn-vulkan.bin"
W2X_MODELS="$W2X_BASE/models"
W2X_WRAP="/usr/local/bin/waifu2x-ncnn-vulkan"
W2X_INFO="$W2X_BASE/INSTALL_INFO.txt"

mkdir -p "$RES_BASE" "$W2X_BASE"

# ---------------- uninstall ----------------
if [[ "${1:-}" == "--uninstall" ]]; then
  log "Uninstall requested..."
  rm -f "$RES_WRAP" "$W2X_WRAP" || true
  # keep $common payload by default (recommended)
  log "✅ Uninstall complete."
  exit 0
fi

install_deps() {
  log "Installing dependencies..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get -qq update
  apt-get -yqq install --no-install-recommends --no-install-suggests \
    curl ca-certificates zip unzip file \
    libvulkan1 mesa-vulkan-drivers vulkan-tools \
    libstdc++6 libgcc-s1 libgomp1 zlib1g
  rm -rf /var/lib/apt/lists/*
}

verify_usage() {
  # verify_usage <cmd> <expected_prefix>
  cmd="$1"
  prefix="$2"
  out="$($cmd -h 2>&1 || true)"
  echo "$out" | grep -q "^Usage: $prefix" || return 1
  return 0
}

# ---------------- Real-ESRGAN ----------------
install_realesrgan() {
  log "=== Real-ESRGAN (ncnn) install start ==="

  RES_BIN_URL="https://github.com/xinntao/Real-ESRGAN-ncnn-vulkan/releases/download/v0.2.0/realesrgan-ncnn-vulkan-v0.2.0-ubuntu.zip"
  RES_MODELS_URL="https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip"

  log "Downloading Real-ESRGAN binary zip:"
  log "  $RES_BIN_URL"
  curl -fL --retry 10 --retry-delay 2 --silent --show-error -o "$TMP/realesrgan_bin.zip" "$RES_BIN_URL"

  rm -rf "$TMP/realesrgan_bin"
  mkdir -p "$TMP/realesrgan_bin"
  unzip -q "$TMP/realesrgan_bin.zip" -d "$TMP/realesrgan_bin"

  extracted_bin="$(find "$TMP/realesrgan_bin" -type f -name 'realesrgan-ncnn-vulkan' | head -n1 || true)"
  [[ -n "${extracted_bin:-}" ]] || die "Real-ESRGAN binary not found after extracting zip"

  cp -f "$extracted_bin" "$RES_BIN"
  chmod +x "$RES_BIN"
  log "Real-ESRGAN binary installed:"
  log "  $RES_BIN"

  log "Downloading Real-ESRGAN NCNN models bundle:"
  log "  $RES_MODELS_URL"
  curl -fL --retry 10 --retry-delay 2 --silent --show-error -o "$TMP/realesrgan_models.zip" "$RES_MODELS_URL"

  rm -rf "$TMP/realesrgan_models"
  mkdir -p "$TMP/realesrgan_models"
  unzip -q "$TMP/realesrgan_models.zip" -d "$TMP/realesrgan_models"

  model_src="$(find "$TMP/realesrgan_models" -type d -name models | head -n1 || true)"
  [[ -n "${model_src:-}" ]] || die "Could not find 'models' dir inside Real-ESRGAN models bundle"

  rm -rf "$RES_MODELS"
  mkdir -p "$RES_MODELS"
  cp -a "$model_src"/. "$RES_MODELS"/

  pcount="$(find "$RES_MODELS" -type f -name '*.param' | wc -l)"
  bcount="$(find "$RES_MODELS" -type f -name '*.bin'   | wc -l)"
  [[ "$pcount" -gt 0 && "$bcount" -gt 0 ]] || die "Real-ESRGAN models copy failed (param/bin count is zero)"

  log "Real-ESRGAN models installed:"
  log "  $RES_MODELS"
  log "  param files: $pcount"
  log "  bin files:   $bcount"
  log "  model files:"
  (cd "$RES_MODELS" && ls -1 *.param *.bin 2>/dev/null | sort | sed 's/^/    - /') || true

  log "Installing Real-ESRGAN wrapper:"
  log "  $RES_WRAP"
  cat > "$RES_WRAP" <<EOF
#!/bin/bash
set -euo pipefail
REAL="$RES_BIN"
MODELS="$RES_MODELS"

if [[ ! -x "\$REAL" ]]; then
  echo "❌ Real-ESRGAN binary missing: \$REAL" >&2
  exit 127
fi
if [[ ! -d "\$MODELS" ]]; then
  echo "❌ Real-ESRGAN models missing: \$MODELS" >&2
  exit 127
fi

# Respect user-provided -m, otherwise inject stable models path
if echo " \$* " | grep -qE ' -m '; then
  exec "\$REAL" "\$@"
else
  exec "\$REAL" -m "\$MODELS" "\$@"
fi
EOF
  chmod +x "$RES_WRAP"

  if verify_usage "$RES_WRAP" "realesrgan-ncnn-vulkan"; then
    log "✅ Real-ESRGAN verify OK (help exit code ignored)"
  else
    die "Real-ESRGAN verify failed (no Usage output)"
  fi

  # Write install info (audit-friendly)
  {
    echo "Installed: $(date)"
    echo "Binary URL: $RES_BIN_URL"
    echo "Models URL: $RES_MODELS_URL"
    echo "Binary: $RES_BIN"
    echo "Models: $RES_MODELS"
    echo "Wrapper: $RES_WRAP"
    echo "param files: $pcount"
    echo "bin files:   $bcount"
    echo "Model files:"
    (cd "$RES_MODELS" && ls -1 *.param *.bin 2>/dev/null | sort) || true
  } > "$RES_INFO"

  log "Wrote install info:"
  log "  $RES_INFO"

  log "=== Real-ESRGAN install done ==="
}

# ---------------- Waifu2x ----------------
install_waifu2x() {
  log "=== Waifu2x (ncnn) install start ==="

  W2X_URL="https://github.com/nihui/waifu2x-ncnn-vulkan/releases/download/20250915/waifu2x-ncnn-vulkan-20250915-linux.zip"

  log "Downloading Waifu2x linux zip:"
  log "  $W2X_URL"
  curl -fL --retry 10 --retry-delay 2 --silent --show-error -o "$TMP/waifu2x.zip" "$W2X_URL"

  rm -rf "$TMP/waifu2x"
  mkdir -p "$TMP/waifu2x"
  unzip -q "$TMP/waifu2x.zip" -d "$TMP/waifu2x"

  extracted_bin="$(find "$TMP/waifu2x" -type f -name 'waifu2x-ncnn-vulkan' | head -n1 || true)"
  [[ -n "${extracted_bin:-}" ]] || die "Waifu2x binary not found after extracting zip"

  cp -f "$extracted_bin" "$W2X_BIN"
  chmod +x "$W2X_BIN"
  log "Waifu2x binary installed:"
  log "  $W2X_BIN"

  rm -rf "$W2X_MODELS"
  mkdir -p "$W2X_MODELS"

  rootdir="$(dirname "$extracted_bin")"
  log "Waifu2x package root:"
  log "  $rootdir"

  model_dirs="$(find "$rootdir" -maxdepth 1 -type d -iname 'models*' -print | sort || true)"
  [[ -n "${model_dirs:-}" ]] || die "No 'models*' directories found next to waifu2x binary (unexpected for this zip)"

  log "Waifu2x model dirs found:"
  echo "$model_dirs" | sed 's/^/    - /' >&2

  while IFS= read -r d; do
    bn="$(basename "$d")"
    dest="$W2X_MODELS/$bn"
    rm -rf "$dest"
    cp -a "$d" "$dest"
  done <<< "$model_dirs"

  pcount="$(find "$W2X_MODELS" -type f -name '*.param' | wc -l)"
  bcount="$(find "$W2X_MODELS" -type f -name '*.bin'   | wc -l)"
  [[ "$pcount" -gt 0 && "$bcount" -gt 0 ]] || die "Waifu2x models copy failed (param/bin count is zero)"

  log "Waifu2x models installed:"
  log "  $W2X_MODELS"
  log "  param files: $pcount"
  log "  bin files:   $bcount"
  log "  model directories (persistent):"
  find "$W2X_MODELS" -maxdepth 1 -type d -print | sort | sed 's/^/    - /' >&2 || true

  # Wrapper: inject default -m to your persistent models directory (models-cunet)
  # and respect user-provided -m if they want photo/anime-style models.
  log "Installing Waifu2x wrapper:"
  log "  $W2X_WRAP"
  cat > "$W2X_WRAP" <<EOF
#!/bin/bash
set -euo pipefail
REAL="$W2X_BIN"
MODELS_BASE="$W2X_MODELS"
DEFAULT_MODEL="\$MODELS_BASE/models-cunet"

if [[ ! -x "\$REAL" ]]; then
  echo "❌ Waifu2x binary missing: \$REAL" >&2
  exit 127
fi
if [[ ! -d "\$MODELS_BASE" ]]; then
  echo "❌ Waifu2x models missing: \$MODELS_BASE" >&2
  exit 127
fi

# Respect user-provided -m. Otherwise inject default models-cunet path.
if echo " \$* " | grep -qE ' -m '; then
  exec "\$REAL" "\$@"
else
  exec "\$REAL" -m "\$DEFAULT_MODEL" "\$@"
fi
EOF
  chmod +x "$W2X_WRAP"

  if verify_usage "$W2X_WRAP" "waifu2x-ncnn-vulkan"; then
    log "✅ Waifu2x verify OK (help exit code ignored)"
  else
    die "Waifu2x verify failed (no Usage output)"
  fi

  # Write install info (audit-friendly)
  {
    echo "Installed: $(date)"
    echo "Zip URL: $W2X_URL"
    echo "Binary: $W2X_BIN"
    echo "Models base: $W2X_MODELS"
    echo "Wrapper: $W2X_WRAP"
    echo "param files: $pcount"
    echo "bin files:   $bcount"
    echo "Model dirs:"
    find "$W2X_MODELS" -maxdepth 1 -type d -print | sort
    echo "Sample model files:"
    find "$W2X_MODELS" -maxdepth 3 -type f \( -name '*.param' -o -name '*.bin' \) | sort | head -n 60
  } > "$W2X_INFO"

  log "Wrote install info:"
  log "  $W2X_INFO"

  log "=== Waifu2x install done ==="
}

# ---------------- main ----------------
log "Persistent path (common): $common"
log "Install base: $BASE"

install_deps
install_realesrgan
install_waifu2x

log "✅ All manga upscalers installed."
log "Real-ESRGAN wrapper: $RES_WRAP"
log "Waifu2x wrapper:     $W2X_WRAP"
exit 0