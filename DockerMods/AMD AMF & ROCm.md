# AMD AMF & ROCm (Encode + Compute)

Full AMD GPU enablement for FileFlows: hardware video **encoding** and optional
GPU **compute**, set up the way AMD intends.

It makes the AMD encode paths and compute stack **available** in the container.
Choosing/configuring the encoder is done in FileFlows (see the FileFlows docs) —
a DockerMod only installs the capability. It is container-safe (never touches
the kernel module — `--no-dkms`), idempotent, self-updating, and cleans up after
itself.

---

## What it installs

| Component | What / why |
| --- | --- |
| **VA-API** (always) | Mesa `radeonsi` VA driver — the recommended, open, **universal** Linux encode path. Works on **every** AMD GPU, including desktop iGPUs. |
| **AMF runtime** (always) | `amf-amdgpu-pro` + `libamdenc-amdgpu-pro` (runtime, not the SDK) — AMD's native encoder for the **discrete** GPUs / APUs AMF supports. |
| **ROCm / OpenCL** (optional) | Full ROCm or ROCr OpenCL compute via `amdgpu-install --no-dkms`, per profile. |

The mod installs **both** encode paths so the right one is present on any AMD
GPU; the table below shows which path each GPU supports.

> **AMF on Linux, briefly:** AMF is built on AMD's closed "Pro Vulkan" stack and
> only enumerates the discrete GPUs / mobile APUs it supports. Desktop Ryzen
> iGPUs (Raphael / Granite Ridge, `gfx1036`) are **not** AMF-capable on Linux —
> they encode via VA-API. This mod installs both so the right one is always
> there; AMF is preferred where it works (it's the native path).

---

## Requirements

- An Ubuntu-based FileFlows image (current images are Ubuntu 26.04).
- The AMD GPU passed into the container:

  ```yaml
  services:
    fileflows:
      image: revenz/fileflows:latest
      devices:
        - /dev/dri:/dev/dri
        - /dev/kfd:/dev/kfd        # only needed for ROCm/OpenCL compute
      group_add:
        - video
        - render
  ```

`/dev/kfd` is only needed for ROCm/OpenCL **compute**; **encode** needs only
`/dev/dri`.

---

## Profiles

Set **`AMD_AMF_PROFILE`** on the container (default `auto`). Every profile
provisions encode (VA-API + AMF runtime). **ROCm/OpenCL compute is OFF by
default** — most FileFlows users only encode — and is opt-in:

| Profile | Encode | Compute |
| --- | --- | --- |
| `auto` *(default)* | VA-API + AMF | **None** (encode only) |
| `legacy` | VA-API + AMF | None (same as auto, explicit) |
| `standard` | VA-API + AMF | Full ROCm (ROCm runtime + ROCr OpenCL) |
| `opencl` | VA-API + AMF | ROCr OpenCL only (smaller) |

## Which encode path your GPU supports

The mod installs both; this is which one works on which hardware (it also logs
this during install). Configure the encoder itself in FileFlows.

| Your AMD GPU | Encode path |
| --- | --- |
| Discrete RX / W (RDNA+) | AMF — `hevc_amf` / `h264_amf` (native). `av1_amf` needs RDNA3+ (RX 7000/9000). |
| Desktop Ryzen iGPU (Raphael/Granite Ridge) | VA-API — `hevc_vaapi` / `h264_vaapi`. AMF doesn't support desktop iGPUs on Linux. |
| Mobile APU / older cards | AMF if supported (`*_amf`); otherwise VA-API (`*_vaapi`). |

---

## Configuration (environment variables)

| Variable | Default | Purpose |
| --- | --- | --- |
| `AMD_AMF_PROFILE` | `auto` | `auto` / `standard` / `opencl` / `legacy` |
| `AMD_GFX_VERSION` | `auto` | (compute) GPU gfx group for full ROCm; set for headless image builds |
| `AMD_HSA_OVERRIDE` | `auto` | `HSA_OVERRIDE_GFX_VERSION` for iGPUs without native ROCm (see below) |
| `AMD_AMF_VERSION` | newest | Pin the AMF repo version (e.g. `26.10`) |
| `AMD_DRIVER_VERSION` | newest | Pin the `amdgpu-install` version (e.g. `31.30`) |

### gfx groups (for `AMD_GFX_VERSION`)

| GPU family | gfx group |
| --- | --- |
| RX 9000 / W9000 (RDNA4) | `gfx120x` |
| RX 7000 / W7000 (RDNA3) | `gfx110x` |
| RX 6000 (RDNA2) | `gfx103x` |
| RX 5000 (RDNA1) | `gfx101x` |

Normally unneeded — `amdgpu-install` auto-detects a discrete GPU via `lspci`.
Set it only when building an image with no GPU visible.

---

## AMD APUs / iGPUs

- **Encode:** works via **VA-API** (`*_vaapi`) — AMF does not support desktop
  iGPUs on Linux.
- **ROCm compute** on an iGPU is community-territory: desktop Ryzen iGPUs
  (gfx1036) have no native ROCm packages, so the mod installs the closest group
  (`gfx103x`) and the override must also be set **as a container env var**:

  ```yaml
      environment:
        - AMD_AMF_PROFILE=standard
        - HSA_OVERRIDE_GFX_VERSION=10.3.0   # RDNA2 iGPU (gfx1036/1035/1037)
        # - HSA_OVERRIDE_GFX_VERSION=11.0.0 # RDNA3 iGPU (Phoenix, gfx1103)
  ```

  The mod prints the exact value during install. This is unofficial and not
  guaranteed; encode is unaffected (it uses VA-API regardless).

---

## Updating & cleanup

- **Self-updating:** each run checks for newer AMF / driver builds; it exits
  instantly when current and upgrades + runs `apt autoremove` / `clean` /
  clears apt lists when AMD ships newer. Best-effort — never blocks startup.
- **Pinning:** set `AMD_AMF_VERSION` / `AMD_DRIVER_VERSION` to freeze versions.

## Uninstalling

FileFlows re-runs the mod with `--uninstall`. It purges the AMF packages and
repo/key, runs `amdgpu-uninstall`, purges `amdgpu-install`, removes the OpenCL
workaround files and the state marker, and garbage-collects. (The Mesa VA-API
driver is left in place — it's a base media library, not AMD-proprietary.)

---

## Verifying it works

Inside the container:

```bash
# VA-API encoders (the universal AMD path):
vainfo --display drm --device /dev/dri/renderD128 | grep -i enc

# AMF runtime present (used by hevc_amf on supported GPUs):
ldconfig -p | grep libamfrt64

# ROCm/OpenCL compute (standard/opencl profiles):
clinfo -l ; rocminfo | grep -E 'Name:|Device Type'
```

The mod ensures both encode paths are installed; the encoder itself is
configured in FileFlows. (`renderD128` may differ on multi-GPU hosts; pick the
AMD node.)

---

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `hevc_amf` errors / `EnumerateDevices() returned 0 devices` | The GPU isn't AMF-capable on Linux (e.g. a desktop iGPU). Expected — use a VA-API encoder (`hevc_vaapi`) for this GPU. |
| `clinfo`/`rocminfo` show no device on an iGPU | Set `HSA_OVERRIDE_GFX_VERSION` as a **container** env var (see APU section). |
| Full ROCm "did not resolve", fell back to OpenCL | No ROCm-supported GPU visible at install time. Set `AMD_GFX_VERSION` to your GPU's gfx group and reinstall. |
| No GPU in container | Pass `--device /dev/dri` (and `/dev/kfd` for compute) and the `video`/`render` groups. |
| `ID='debian'` / unsupported distro | This mod targets the Ubuntu-based FileFlows image. |

---

## References

- [Jellyfin — AMD hardware acceleration](https://jellyfin.org/docs/general/post-install/transcoding/hardware-acceleration/amd/) (Linux AMD encode = VA-API; AMF is closed-stack, limited)
- [AMF driver install (Linux)](https://github.com/GPUOpen-LibrariesAndSDKs/AMF/wiki/Driver-Linux)
- [`amdgpu-install` docs](https://amdgpu-install.readthedocs.io/en/latest/)
- [AMD Radeon Software for Linux 26.12 release notes](https://www.amd.com/en/resources/support-articles/release-notes/RN-AMDGPU-UNIFIED-LINUX-26-12.html)
