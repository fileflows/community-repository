/**
 * @name Video - Optimize CUDA Alpha
 * @description Very experimental script to use CUDA cores for Optimize scoring
 * @help Docker only, put this element before Optimize,
Find me in the discord for more help
 * @output Shim installed
 * @author lawrence
 * @revision 3
 * @uid 06590025-5496-4db8-987b-b52c6a8959c2
 */
function Script() {
    let ffmpegLocation = Flow.GetToolPath('ffmpeg');

    // Full path to the new script file.
    const scriptFile = System.IO.Path.Combine(Flow.TempPath, "vmaf_cuda_converter.sh")

    const bashScript = `#!/usr/bin/env bash
set -e

# All input arguments
ARGS="$@"

# Extract FPS (optional)
FPS=$(echo "$ARGS" | grep -oP "(?<=-r )\\d+" | head -1)

# Extract input file paths (first two after -i)
readarray -t FILES < <(echo "$ARGS" | grep -oP "(?<=-i )[^ ]+")

# Extract scale (first one found)
SCALE=$(echo "$ARGS" | grep -oP "scale=\\K\\d+:\\d+" | head -1)
if [ -n "$SCALE" ]; then
    IFS=: read W H <<< "$SCALE"
else
    W=""; H=""
fi

# Check all arguments for the word "4k" (case-insensitive)
if echo "$ARGS" | grep -iq "\\b4k\\b"; then
    MODEL="vmaf_4k_v0.6.1"
else
    MODEL="vmaf_v0.6.1"
fi

# Always include format
SCALE_FILTER="scale_cuda=format=yuv420p"
[ -n "$W" ] && SCALE_FILTER="\${SCALE_FILTER}:w=\${W}:h=\${H}"
SCALE_FILTER="\${SCALE_FILTER},"

# Build ffmpeg command with optional FPS
CMD="${ffmpegLocation} -hide_banner -hwaccel cuda -hwaccel_output_format cuda"
[ -n "$FPS" ] && CMD="\${CMD} -r \${FPS}"
CMD="\${CMD} -i \\"\${FILES[0]}\\" -hwaccel cuda -hwaccel_output_format cuda"
[ -n "$FPS" ] && CMD="\${CMD} -r \${FPS}"
CMD="\${CMD} -i \\"\${FILES[1]}\\" -filter_complex \\"[0:v]\${SCALE_FILTER}setpts=PTS-STARTPTS,settb=AVTB[dist];[1:v]\${SCALE_FILTER}setpts=PTS-STARTPTS,settb=AVTB[ref];[dist][ref]libvmaf_cuda=shortest=true:ts_sync_mode=nearest:model=version=\${MODEL}\\" -an -sn -dn -f null -"

# Run command
echo "$CMD"
eval "$CMD"
EXIT_CODE=$?

# Retry with original if failed
if [ $EXIT_CODE -ne 0 ]; then
    echo "CUDA command failed, retrying with original..."
    ${ffmpegLocation} "$@"
fi
`

    // Write the script contents.
    System.IO.File.WriteAllText(scriptFile, bashScript);
    Logger.ILog(`Script written to ${scriptFile}`);

    
    if (!Flow.IsWindows) {
        System.IO.File.SetUnixFileMode(scriptFile, 0o777);
    
        Logger.ILog("Execute permission set (0755).");
        Variables['FFmpegVMAF'] = scriptFile;
        return 1;
    }

    const batScript = `@echo off
setlocal enabledelayedexpansion

:: Collect all arguments
set "ARGS=%*"

:: Extract optional FPS
set "FPS="
set "found_r=0"
for %%A in (%ARGS%) do (
    if "!found_r!"=="1" (
        set "FPS=%%A"
        set "found_r=0"
    ) else if "%%A"=="-r" (
        set "found_r=1"
    )
)

:: Extract first two input files
set i=0
set "found_i=0"
for %%A in (%ARGS%) do (
    if "!found_i!"=="1" (
        if "!i!"=="0" (
            set "FILE0=%%A"
        ) else if "!i!"=="1" (
            set "FILE1=%%A"
        )
        set /a i+=1
        set "found_i=0"
    ) else if "%%A"=="-i" (
        set "found_i=1"
    )
)

:: Extract scale (first one only)
set "W="
set "H="
for %%A in (%ARGS%) do (
    echo %%A | findstr /i "scale=" >nul
    if !errorlevel! == 0 (
        for /f "tokens=2 delims==" %%S in ("%%A") do (
            for /f "tokens=1,2 delims=:" %%W in ("%%S") do (
                set "W=%%W"
                set "H=%%X"
                goto :found_scale
            )
        )
    )
)
:found_scale

:: Detect model by scanning all arguments for "4k"
echo %ARGS% | findstr /i "4k" >nul
if %errorlevel%==0 (
    set "MODEL=vmaf_4k_v0.6.1"
) else (
    set "MODEL=vmaf_v0.6.1"
)

:: Build scale filter
set "SCALE_FILTER=scale_cuda=format=yuv420p"
if defined W (
    set "SCALE_FILTER=!SCALE_FILTER!:w=!W!:h=!H!"
)
set "SCALE_FILTER=!SCALE_FILTER!,"

:: Build ffmpeg command
set "CMD=${ffmpegLocation} -hide_banner -hwaccel cuda -hwaccel_output_format cuda"
if defined FPS (
    set "CMD=!CMD! -r !FPS!"
)
set "CMD=!CMD! -i "!FILE0!" -hwaccel cuda -hwaccel_output_format cuda"
if defined FPS (
    set "CMD=!CMD! -r !FPS!"
)
set "CMD=!CMD! -i "!FILE1!" -filter_complex "[0:v]!SCALE_FILTER!setpts=PTS-STARTPTS,settb=AVTB[dist];[1:v]!SCALE_FILTER!setpts=PTS-STARTPTS,settb=AVTB[ref];[dist][ref]libvmaf_cuda=shortest=true:ts_sync_mode=nearest:model=version=!MODEL!" -an -sn -dn -f null -"

:: Run command
echo "!CMD!"
cmd /c "!CMD!"
if errorlevel 1 (
    echo CUDA command failed, retrying with original...
    ${ffmpegLocation} %*
)
`
    const batFile = System.IO.Path.Combine(Flow.TempPath, "vmaf_cuda_converter.bat")

    // Write the script contents.
    System.IO.File.WriteAllText(batFile, batScript);
    Logger.ILog(`Script written to ${batFile}`);
    Variables['FFmpegVMAF'] = batFile;


    return 1;
}