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
    const scriptFile = System.IO.Path.Combine(Flow.TempPath, "vuda_cuda_converter.sh")

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

echo \$FILTERS

# ---------- 8. Print the final command ----------
\$FFMPEG_LOCATION \
-hwaccel cuda -hwaccel_output_format cuda -r \${FPS_0} -i \${FILE_0} \
-hwaccel cuda -hwaccel_output_format cuda -r \${FPS_1} -i \${FILE_1} \
-filter_complex "\${FILTERS}" -an -sn -dn -f null -
`

    // Write the script contents.
    System.IO.File.WriteAllText(scriptFile, bashScript);
    Logger.ILog(`Script written to ${scriptFile}`);

    System.IO.File.SetUnixFileMode(scriptFile, 0o777);

    Logger.ILog("Execute permission set (0755).");
    Variables['FFmpegVMAF'] = scriptFile;

    if (Flow.IsWindows) {
        const batScript = `@echo off
rem -------------------------------------------------------------
rem  run_in_wsl.bat
rem  -------------------------------
rem  Call a Bash script from Windows, passing all parameters.
rem  Usage:
rem      run_in_wsl.bat <args>
rem  Example:
rem      run_in_wsl.bat -f myfile.txt --verbose
rem -------------------------------------------------------------

:: 1. Find the absolute path of this .bat file (so we can locate the script)
set "BAT_DIR=%~dp0"
rem Remove trailing backslash if present
if "%BAT_DIR:~-1%"=="\" set "BAT_DIR=%BAT_DIR:~0,-1%"

:: 2. Build the full path to the Bash script you want to run.
::    Adjust SCRIPT_NAME if your file is called something else,
::    or replace this line with an absolute Windows path if needed.
set "SCRIPT_NAME=vmaf_cuda_converter.sh"
set "WSL_SCRIPT_PATH=%BAT_DIR%\%SCRIPT_NAME%"

rem Convert that Windows path to the WSL/UNIX style path
rem (e.g. C:\folder\file.sh  -> /mnt/c/folder/file.sh)
for %%I in ("%WSL_SCRIPT_PATH:~0,1%") do set "DRIVE=%%~I"
set "WIN_DRIVE=%DRIVE:"=%"          :: remove quotes if any
set "UNIX_DRIVE=/mnt/%WIN_DRIVE:/= /"

rem Replace the drive letter with /mnt/<drive>
set "WSL_SCRIPT_PATH=%WSL_SCRIPT_PATH:*\=%
set "WSL_SCRIPT_PATH=%WSL_SCRIPT_PATH:\=/%"
set "WSL_SCRIPT_PATH=%WSL_SCRIPT_PATH:,=%"   :: no commas
set "WSL_SCRIPT_PATH=%UNIX_DRIVE%%WSL_SCRIPT_PATH:~3%"

:: 3. Forward all parameters to the script
rem Join all %* into a single string that preserves quoted arguments.
setlocal EnableDelayedExpansion
set "ARGS="
for %%A in (%*) do (
    set "ARG=%%A"
    rem If the argument contains spaces, wrap it in quotes.
    if "!ARG: =!" neq "!ARG!" set "ARG=\"!ARG:\"=\"\"!"
    set "ARGS=!ARGS!!ARG! "
)
endlocal & set "ARGS=%ARGS%"

:: 4. Execute the script inside WSL
rem Use wsl.exe -e to run it with the same shebang as in Linux.
wsl.exe -e bash "%WSL_SCRIPT_PATH%" %ARGS%

rem Optionally, capture and show the exit code from the Bash script:
set "EXIT_CODE=%ERRORLEVEL%"
echo Script exited with code !EXIT_CODE!
exit /b !EXIT_CODE!
`
        const batFile = System.IO.Path.Combine(Flow.TempPath, "vuda_cuda_converter.bat")

        // Write the script contents.
        System.IO.File.WriteAllText(batFile, batScript);
        Logger.ILog(`Script written to ${batFile}`);
        Variables['FFmpegVMAF'] = batScript;
    }

    return 1;
}