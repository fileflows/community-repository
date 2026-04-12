# ----------------------------------------------------------------------------------------------------
# Name: FileFlows Battlemage Support
# Description: FileFlows DockerMod for Intel Arc / Battlemage support.
#              Installs Jellyfin FFmpeg plus Intel media/runtime libraries required for VAAPI/QSV.
#              Configures ffmpeg/ffprobe symlinks and Intel environment variables.
# Revision: 1.0
# Icon: data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAADwCAMAAAAJixmgAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAtZQTFRFAAAAM5kzN4w6N448N407OI07N407OI48OI08OI47OI48OI47OY88M5kzKn8qNo46OI47N447N448SJFIOI48OI08OI48OI07Oo86N408N447OI04No07N448No06OI47N407OZA5OI48N447QIs8N448OYw5N407QYdAySZ5pEBoOI07P38/0iB9/wCQ4BaDoD5oN4w8N408RIVBuTFzLotF2huA8gmLmURrOI07sTdvOI48SoFEzCR74BaD5BOFOI47OI08UH1G9wWNOI48OI485xGG/QGPN4488gmKVnhJ4BaDN408OI477Q2IxCp3N406rDtsOI47VapVXXNM6BCGqlRzOI078gmKsjdvOI04OI08OI48AP8AZG5P1R5+gH9IN5A8OI47PJE89geM5xGGokVoOI47OI07N48/6RCGokNqOI09bmhTP5Q/N447N408NI48+gSO6g+HoUJpOI49N408OI07N407OI48O5A7d2FX/AKPgVpb/gGQjFJgmUllm0dmnkVnqzxstjRxO4w9wC11PYo+ySZ5OI08OY89N408oERquTFz0x996w6H+wOO7wuJ2Bx/vy51pUBrN448yyR61R5+pj9rsThu9gaMuzBzgD9IySZ5vC90wyp3rjlu7A6ItzRxoUNmrjlutjRxuzBzvC90N448P38/OY87o0NoAH8AN447OYs5N448OYs5N4w8PIc8N448N448uzBzOI48N407NpE/tDVwOI0+N448N448OI48No47OI04nkNp2RqA7A2InUVltDZw0x99oEJm/QKP7Q2I3heCxyh4rTltm0tipUJp9AiLqTxrOI04OI47n0Rm5RKF9QeMo0BpN408pUdsuDNy8AqKNo49rDtuxSl3+gOON448+AWN3hiCOI46tzNxuDJy8wiLpT9qujFzpEBo3xeCmkxi7gyJyCd5oUFprjpuxih4zyJ8tTRxokFnaoC2jgAAAPJ0Uk5TAApOnM3m/P/+69CaUAUGRpbJ5Qdx6G1sJ9jOJDjbQfDvNXb7N+4ogP/6StEI///3EHJ3/7YL//4WWpSo/+H/+ef1///5/f//7f7/9p2V/9NKf94D//sGXv+ZCd26Af/sAi70Ff/6KE3fIPs8Nv8M9+Ei//s/ZLLW838e///////////////////6R5c1tOr8//3wxVLk4O1alf67BNzA0Iz8qzOIqr2/mARiOALAFuAfexGl8rxEwRyiLYbptXQbMPH8Ep7rKv/99dmEFEj+cRLZI/n+T7sOsP1LgNT/9v/1W6/s/l25QfYK/ds+h9blqTrJxCzcAAALSUlEQVR4nO3de4xcVR0H8HPotpZGW0o1UsClC8ajthqLXUpoQQgFq7XY8LDyqG7RlDY2oohIEYj/GKI0SGKxlIo2MSDt8qhVqUWN8YkPQuozsRI5iFjrK1XE1aU67t3Zx8z5nfn9fud1753L/f7RbO/5zTn30zOdmb37m1kpXmCRRZ9A3qnBVU8NrnpqcNVTg6ueGlz11OCqpwZXPTW46qnBVU8NrnpqcNVTg6ueGlz11OCqhweWzbjMO5pnHW4xM7vBP/02wGE1zgJz5HP/8zqPmXKIS5559PPPea3huhoDfJz8m/dJzJHPsOpOlH/yXsNtNRrcK/8YcA5z5ZOMqpPl7wPWaFmt5wmqhAQfN/1g0Dn0ygNkjdJBS0ymT8pfESUUeM40//tzM6+UvyAqlA5cYjx9U0ceuvbjNRR4IfUvRmf+4/i40sFLNLNgeEQz7TG8iADL6X6Pz63pPeYn2LDSwSs0s2DKv0f+PFr+EK0iwC9+PsKZnPooMqh0hBWyNL0jp/wDtIwAT+mJcCqLvt95TOkIC2TpH256xazvonUE+Pi/RjiXYzs/zisdYf4s/UcdHvtq9rfRQgJ8NnZv5OaMb3UaUTrC9FmWHBn3ipd9E60kwMvw+wcvZ329w4DSEWbPsqRn8sXR3H1oaR47fM7X7MeVjjB5llavOGEvWpvH/+Ep/7IeVjrC3FnOPdL64vcVX0WLCfDbOt0bXXL+l21HlY4wdZZze9pm6vsSWp3H8/BbdlsOKh1h5iyGV5zyEFpOgPvndHyEZWeFfAAeVDp43mZWDrfPpOQutJ56LX0y7/tZLKt2wmNKB0/bzMoe48X+/C/iN6DAl8n7g05IiEvkF8AxpQMnHc/qYcO7UO7Ab0F+P7xW3hNwQkJcPP1ucEzpoCkns3raj9sPLJZ3ETehr3hcdQB/NY5nrdwKjikdMGFrgHepvIO6DeOa1sZtR/meUVrvuiF3L+uq5fv3Lb/T75Q2yE+BY0r7zQWybuo32g+cJzfTt+JdB37PsVJazp1K2v01vZz9DfjJg9Jkie/+XnMLOHTDU+aTxbVDPvvrD1aaLEnrlXvaDzC9vmClyZKk3usanl5PsNJkSVqvNF6es71+YKXJkrJ6vcBKkyVJvdc3/L0+YKXJkrRe8/s/F68HWGmypMRed7DSZElS76YHjQNuXmew0mRJUu8N5sUER68rWGmypNxeR7DSZElS70fNA85eN7DSZElS842DxgF3rxNYabKk9F4XsNJkSVLv/wE8PpWQ2z1R4QAAAABJRU5ErkJggg==
# ----------------------------------------------------------------------------------------------------

#!/bin/bash
set -e

JELLYFIN_ROOT="${common}/jellyfin-ffmpeg-battlemage"
JELLYFIN_DIR="${JELLYFIN_ROOT}/usr/lib/jellyfin-ffmpeg"
TEMP_DIR="/tmp/jellyfin-ffmpeg-battlemage"

JELLYFIN_URL="https://github.com/jellyfin/jellyfin-ffmpeg/releases/download/v7.1.3-5/jellyfin-ffmpeg7_7.1.3-5-noble_amd64.deb"

FFMPEG_LINK="/usr/local/bin/ffmpeg"
FFPROBE_LINK="/usr/local/bin/ffprobe"
PROFILE_FILE="/etc/profile.d/fileflows-battlemage.sh"

require_common() {
    if [ -z "${common}" ]; then
        echo "ERROR: \$common is not set."
        exit 1
    fi
}

is_installed() {
    [ -x "${FFMPEG_LINK}" ] && "${FFMPEG_LINK}" -version 2>/dev/null | grep -qi jellyfin
}

install_runtime_packages() {
    echo "Installing Intel/media runtime packages..."
    apt-get -qq update
    apt-get install --no-install-recommends --no-install-suggests -yqq \
        ca-certificates \
        wget \
        curl \
        xz-utils \
        dpkg \
        findutils \
        file \
        vainfo \
        intel-media-va-driver-non-free \
        ocl-icd-libopencl1 \
        libvpl2 \
        libdrm2 \
        libpciaccess0 \
        libopenmpt0 \
        libbluray2 \
        libvpx9 \
        libwebpmux3 \
        libwebp7 \
        libzvbi0 \
        libmp3lame0 \
        libopus0 \
        libtheora0 \
        libvorbis0a \
        libvorbisenc2 \
        libx264-164 \
        libx265-199
}

install_jellyfin_ffmpeg() {
    require_common

    if is_installed; then
        echo "Jellyfin FFmpeg is already installed."
        return
    fi

    echo "Installing Jellyfin FFmpeg Battlemage stack..."
    mkdir -p "${JELLYFIN_ROOT}" "${TEMP_DIR}"
    cd "${TEMP_DIR}"

    wget --no-verbose -O jellyfin-ffmpeg7.deb "${JELLYFIN_URL}"
    dpkg-deb -x jellyfin-ffmpeg7.deb "${JELLYFIN_ROOT}"
    rm -f jellyfin-ffmpeg7.deb

    ln -sf "${JELLYFIN_DIR}/ffmpeg" "${FFMPEG_LINK}"
    ln -sf "${JELLYFIN_DIR}/ffprobe" "${FFPROBE_LINK}"

    cat > "${PROFILE_FILE}" <<EOF
export LIBVA_DRIVER_NAME=iHD
export LD_LIBRARY_PATH=${JELLYFIN_DIR}/lib
export LIBVA_DRIVERS_PATH=${JELLYFIN_DIR}/lib/dri
EOF
    chmod +x "${PROFILE_FILE}"

    export LIBVA_DRIVER_NAME=iHD
    export LD_LIBRARY_PATH="${JELLYFIN_DIR}/lib"
    export LIBVA_DRIVERS_PATH="${JELLYFIN_DIR}/lib/dri"

    "${FFMPEG_LINK}" -version | head -5
    "${FFPROBE_LINK}" -version | head -5

    rm -rf "${TEMP_DIR}"
    echo "Jellyfin FFmpeg Battlemage stack installed."
}

uninstall_jellyfin_ffmpeg() {
    echo "Uninstalling Jellyfin FFmpeg Battlemage stack..."
    rm -f "${FFMPEG_LINK}" "${FFPROBE_LINK}"
    rm -f "${PROFILE_FILE}"
    rm -rf "${JELLYFIN_ROOT}" "${TEMP_DIR}"
    echo "Jellyfin FFmpeg Battlemage stack removed."
}

install_all() {
    require_common
    echo "Installing to persistent path: ${common}"
    install_runtime_packages
    install_jellyfin_ffmpeg
    echo "All components installed."
}

uninstall_all() {
    uninstall_jellyfin_ffmpeg
    echo "All components uninstalled."
}

if [ "$1" == "--uninstall" ]; then
    uninstall_all
else
    install_all
fi

exit 0
