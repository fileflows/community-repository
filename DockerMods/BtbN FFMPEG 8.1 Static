#!/bin/bash
# FileFlows DockerMod: Static FFmpeg 8.1 (BtbN build) to /opt/ffmpeg8
#
# Mirrors the user's host-side install pattern (manual ffmpeg.org tarball
# extracted to /opt/ffmpeg8/bin etc).
#
# To use in FileFlows: Settings -> Variables -> set 'FFmpeg' to
#   /opt/ffmpeg8/bin/ffmpeg
# (or override per-flow). The FileFlows-bundled jellyfin-ffmpeg at
# /app/common/ffmpeg/bin/ffmpeg remains untouched so you can A/B test
# or fall back for QSV flows where the BtbN bundled libvpl misbehaves.
#
# Note on QSV: BtbN builds are statically linked against libvpl/libmfx-gen,
# so QSV uses BtbN's compile-time libs, NOT the kobuk-team system libs.
# VAAPI is unaffected (libva loads iHD at runtime). If QSV fails with the
# B50 on this build, use the bundled FileFlows ffmpeg instead.

set -e

PREFIX="/opt/ffmpeg8"
MARKER_FILE="${PREFIX}/.fileflows-installed"
TARBALL_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n8.1-latest-linux64-gpl-8.1.tar.xz"
TMPDIR_BASE="/tmp/fileflows-ffmpeg8"

# Normalize FileFlows' --install / --uninstall flags
ACTION="${1:-install}"
case "$ACTION" in
  --install)   ACTION="install" ;;
  --uninstall) ACTION="uninstall" ;;
  --remove)    ACTION="uninstall" ;;
esac

case "$ACTION" in
  install|"")
    if [ -f "$MARKER_FILE" ] && [ -x "${PREFIX}/bin/ffmpeg" ]; then
      INSTALLED_VER=$("${PREFIX}/bin/ffmpeg" -version 2>&1 | head -1 || echo "unknown")
      echo "FFmpeg 8 already installed at ${PREFIX}"
      echo "  ${INSTALLED_VER}"
      echo "Skipping. Remove ${MARKER_FILE} to force reinstall."
      exit 0
    fi

    echo "Installing static FFmpeg 8.1 (BtbN GPL build) to ${PREFIX}..."

    # xz + tar are tiny; install only if missing so we don't bloat the
    # container on rerun.
    if ! command -v xz >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
      apt-get update -qq
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        curl ca-certificates xz-utils tar
    fi

    rm -rf "$TMPDIR_BASE"
    mkdir -p "$TMPDIR_BASE"
    cd "$TMPDIR_BASE"

    echo "Downloading: ${TARBALL_URL}"
    # -L follow redirects (GitHub releases redirect to S3), --fail bails on
    # HTTP errors instead of writing an HTML error page to the tarball,
    # --retry handles transient GitHub flakiness.
    curl -fSL --retry 3 --retry-delay 5 -o ffmpeg8.tar.xz "$TARBALL_URL"

    # Sanity-check before we extract a 100MB blob over our filesystem
    if [ ! -s ffmpeg8.tar.xz ]; then
      echo "ERROR: downloaded tarball is empty"
      exit 1
    fi
    if ! file ffmpeg8.tar.xz 2>/dev/null | grep -q 'XZ compressed'; then
      # Fallback: check magic bytes directly if 'file' isn't installed
      MAGIC=$(head -c 6 ffmpeg8.tar.xz | xxd -p 2>/dev/null || od -An -tx1 -N6 ffmpeg8.tar.xz | tr -d ' \n')
      if [ "$MAGIC" != "fd377a585a00" ]; then
        echo "ERROR: downloaded file is not an XZ archive (magic: $MAGIC)"
        echo "First 200 bytes:"
        head -c 200 ffmpeg8.tar.xz
        exit 1
      fi
    fi

    echo "Extracting..."
    tar -xf ffmpeg8.tar.xz
    rm -f ffmpeg8.tar.xz

    # BtbN tarballs extract to a single versioned dir like:
    #   ffmpeg-n8.1-12-gabcd1234ef-linux64-gpl-8.1/
    EXTRACT_DIR=$(find "$TMPDIR_BASE" -mindepth 1 -maxdepth 1 -type d | head -1)
    if [ -z "$EXTRACT_DIR" ] || [ ! -d "$EXTRACT_DIR/bin" ]; then
      echo "ERROR: extracted layout unexpected. Got: $EXTRACT_DIR"
      ls -la "$TMPDIR_BASE"
      exit 1
    fi

    # Wipe any prior install (handles "force reinstall" path), then move
    # the new tree into place.
    rm -rf "$PREFIX"
    mkdir -p "$(dirname "$PREFIX")"
    mv "$EXTRACT_DIR" "$PREFIX"

    # Confirm the binaries are present
    for bin in ffmpeg ffprobe; do
      if [ ! -x "${PREFIX}/bin/${bin}" ]; then
        echo "ERROR: ${PREFIX}/bin/${bin} missing or not executable"
        exit 1
      fi
    done

    # Record install metadata
    cat > "$MARKER_FILE" <<EOF
# FileFlows DockerMod: BtbN FFmpeg 8 install marker
INSTALL_DATE=$(date -Iseconds)
SOURCE_URL=${TARBALL_URL}
PREFIX=${PREFIX}
EOF

    rm -rf "$TMPDIR_BASE"

    echo
    echo "=== Install complete ==="
    "${PREFIX}/bin/ffmpeg" -version 2>&1 | head -2
    echo
    echo "Configured with:"
    "${PREFIX}/bin/ffmpeg" -hide_banner -version 2>&1 | grep configuration | tr ' ' '\n' | grep -E '^--enable-(libvpl|libmfx|vaapi|opencl|libsvtav1|libdav1d|libx26[45])' | sort
    echo
    echo "NEXT STEP: in FileFlows, set the 'FFmpeg' variable to:"
    echo "  ${PREFIX}/bin/ffmpeg"
    ;;

  uninstall|remove)
    echo "Removing FFmpeg 8 from ${PREFIX}..."
    if [ -d "$PREFIX" ]; then
      rm -rf "$PREFIX"
      echo "Removed ${PREFIX}"
    else
      echo "Nothing to remove at ${PREFIX}"
    fi
    rm -rf "$TMPDIR_BASE"
    echo "Uninstall complete."
    echo
    echo "REMINDER: if you set the 'FFmpeg' variable in FileFlows to"
    echo "${PREFIX}/bin/ffmpeg, clear it now or your flows will fail."
    ;;

  *)
    echo "Usage: $0 [install|uninstall|--install|--uninstall]"
    exit 1
    ;;
esac
