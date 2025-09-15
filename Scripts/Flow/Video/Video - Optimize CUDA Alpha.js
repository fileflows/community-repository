/**
 * @name Video - Optimize CUDA Alpha
 * @description Very experimental script to use CUDA cores for Optimize scoring
 * @help Docker only, put this element before Optimize,
Find me in the discord for more help
 * @output Shim installed
 * @author lawrence
 * @uid 06590025-5496-4db8-987b-b52c6a8959c2
 */
function Script() {
    // Full path to the new script file.
    const scriptFile = System.IO.Path.Combine(Flow.TempPath, "vmaf_cuda_converter.sh")

    const bashScript = `#!/usr/bin/env bash
set -euo pipefail

# ---------- 1. Grab the raw argument list ----------
ARGS=("\$@")   # everything passed to the script
FFMPEG_LOCATION="/app/common/ffmpeg-fileflows-edition-cuda/ffmpeg"

# ---------- 2. Helper: find the N‑th occurrence of a flag ----------
get_flag_value() {
    local flag=\$1          # e.g., "-i" or "-r"
    local n=\$2             # which occurrence (1 = first, 2 = second)
    local count=0
    for ((i=0; i<\${#ARGS[@]}; i++)); do
        if [[ \${ARGS[i]} == "\$flag" ]]; then
            ((count++))
            if [[ \$count -eq \$n ]]; then
                echo "\${ARGS[\$((i+1))]}"
                return 0
            fi
        fi
    done
    echo ""   # not found
}

# ---------- 3. Extract file paths ----------
FILE_0=\$(get_flag_value "-i" 1)
FILE_1=\$(get_flag_value "-i" 2)

if [[ -z \$FILE_0 || -z \$FILE_1 ]]; then
    echo "ERROR: Could not find two '-i' arguments." >&2
    exit 1
fi

# ---------- 4. Extract FPS ----------
FPS_0=\$(get_flag_value "-r" 1)
FPS_1=\$(get_flag_value "-r" 2)

if [[ -z \$FPS_0 || -z \$FPS_1 ]]; then
    echo "ERROR: Could not find two '-r' arguments." >&2
    exit 1
fi

# ---------- 5. Extract scale width & height ----------
# look for a token that starts with 'scale=' and contains ':'
SCALE_TOKEN=""
for arg in "\${ARGS[@]}"; do
    if [[ \$arg == scale=* ]]; then
        SCALE_TOKEN=\$arg
        break
    fi
done

W_0="" H_0=""   # defaults are empty → no scaling part will be added
W_1="" H_1=""

if [[ -n \$SCALE_TOKEN ]]; then
    # e.g. scale=1920:1080:flags=bicubic  -> we only need the first two numbers
    # Remove everything after the second colon (or end of string)
    SCALE_PART=\${SCALE_TOKEN#scale=}          # drop 'scale='
    SCALE_PART=\${SCALE_PART%%:*:*}            # keep up to second ':'
    IFS=: read -r W_0 H_0 <<< "$SCALE_PART"

    # For the second input we assume the same width/height (typical use‑case)
    W_1=\$W_0
    H_1=\$H_0
fi

# ---------- 6. Decide VMAF model ----------
MODEL="vmaf_v0.6.1"
for arg in "\${ARGS[@]}"; do
    # case‑insensitive search for 'vmaf_4k'
    if [[ \${arg,,} == *vmaf_4k* ]]; then
        MODEL="vmaf_4k_v0.6.1"
        break
    fi
done

# ---------- 7. Build the filter chain ----------
FILTERS="[0:v]scale_cuda="
FILTERS+="format=yuv420p"

if [[ -n \$W_0 && -n \$H_0 ]]; then
    FILTERS+=":w=\${W_0}:h=\${H_0}"
fi

FILTERS+=",setpts=PTS-STARTPTS,settb=AVTB[dis];"

# Second stream
FILTERS+="[1:v]scale_cuda="
FILTERS+="format=yuv420p"

if [[ -n \$W_1 && -n \$H_1 ]]; then
    FILTERS+=":w=\${W_1}:h=\${H_1}"
fi
FILTERS+=",setpts=PTS-STARTPTS,settb=AVTB[ref];"

# VMAF part
FILTERS+="[dis][ref]libvmaf_cuda=shortest=true:ts_sync_mode=nearest:model=version=\${MODEL}"

# ---------- 8. Print the final command ----------
echo \$FILTERS

\$FFMPEG_LOCATION \
-hwaccel cuda -hwaccel_output_format cuda -r \${FPS_0} -i \${FILE_0} \
-hwaccel cuda -hwaccel_output_format cuda -r \${FPS_1} -i \${FILE_1} \
-filter_complex "\${FILTERS}" -an -sn -dn -f null -
`

    // Write the script contents.
    System.IO.File.WriteAllText(scriptFile, bashScript);
    Logger.ILog(`Script written to ${scriptFile}`);

    if (!Flow.IsWindows) {
        Logger.ILog("Execute permission set (0755).");
        System.IO.File.SetUnixFileMode(scriptFile, 0o777);
    }

    Variables['FFmpegVMAF'] = scriptFile;

    if (Flow.IsWindows) {
        const batScript = `@echo off
setlocal enabledelayedexpansion

REM Initialize an empty variable for the converted arguments
set "args="

REM Loop through all the arguments
for %%A in (%*) do (
    REM Try to convert each argument to a WSL path
    for /f "delims=" %%B in ('wsl wslpath "%%~A" 2^>nul') do (
        set "converted=%%B"
    )

    REM If conversion worked, use it; otherwise use original argument
    if defined converted (
        set "args=!args! "!converted!""
        set "converted="
    ) else (
        set "args=!args! "%%~A""
    )
)

REM Get the current script's directory in Windows format.
SET "windows_path=%~dp0"

REM Use a FOR loop to capture the output of wsl.exe wslpath.
for /f "delims=" %%p in ('wsl.exe wslpath -u "%windows_path%/vmaf_cuda_converter.sh"') do (
    SET "wsl_path=%%p"
)

REM Assign %~dp0 to a new variable
SET "batch_dir=%~dp0"

REM Remove the last character (the trailing backslash)
SET "batch_dir_no_slash=!batch_dir:~0,-1!"


REM Run converter.sh via WSL in the current directory

wsl --distribution Ubuntu -e bash !wsl_path!!args!
`
        const batFile = System.IO.Path.Combine(Flow.TempPath, "vmaf_cuda_converter.bat")

        // Write the script contents.
        System.IO.File.WriteAllText(batFile, batScript);
        Logger.ILog(`Script written to ${batFile}`);
        Variables['FFmpegVMAF'] = batFile;
    }

    return 1;
}