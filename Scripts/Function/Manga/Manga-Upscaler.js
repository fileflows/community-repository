/**
 * @name Manga-Upscaler
 * @revision 1
 * @uid e73709cb-c550-40a1-b644-beb2d8ac8300
 * @description Manga-Upscale
Purely: upscale + recompress. No extracting, no repackaging, no delete/replace.

Reads Variables from Manga-Extract:
- manga.extractDir, manga.workDir, manga.pageList

FIXES:
(4) Zombie hangs: uses timeout for each upscaler call (if `timeout` exists).
(5) 5KB/broken pages: validates outputs; if convert blocked, tries ffmpeg/cwebp; if still blocked, keeps PNG; if output tiny/invalid, fallback to original.

 * @param {('waifu2x'|'realesrgan')} Tool Which upscaler to use
 * @param {('models-cunet'|'models-upconv_7_anime_style_art_rgb'|'models-upconv_7_photo')} WaifuModel Waifu2x model folder
 * @param {('-1'|'0'|'1'|'2'|'3')} WaifuNoise Waifu2x noise level
 * @param {('1'|'2'|'4'|'8')} WaifuScale Waifu2x scale
 * @param {('realesr-animevideov3'|'realesrgan-x4plus'|'realesrgan-x4plus-anime'|'realesrnet-x4plus')} RealModel Real-ESRGAN model name
 * @param {('2'|'3'|'4')} RealScale Real-ESRGAN scale
 * @param {int} Tile Tile size (0 => 256)
 * @param {('auto'|'0'|'1'|'2'|'-1')} GpuId GPU id. For Arc use 0. (auto treated as 0)
 * @param {bool} RealTTA Enable Real-ESRGAN TTA mode (-x) (slower)
 * @param {bool} LockThreads Lock threads to -j 1:1:1 for max stability (default true)
 * @param {('none'|'jpeg'|'webp')} CompressMode Recompress output images to reduce size
 * @param {int} JpegQuality JPEG quality (60-95). Suggest 85.
 * @param {int} WebpQuality WebP quality (50-95). Suggest 80.
 * @param {bool} StripMeta Remove metadata (default true)
 * @param {int} PerPageTimeoutSec timeout per page upscale (seconds). Default 240.
 * @param {int} MinBytesReject If output file smaller than this, treat as broken & fallback. Default 20000 (20KB).
 * @outputs 2
 * @output Success
 * @output Failure
 */
function Script(
  Tool,
  WaifuModel, WaifuNoise, WaifuScale,
  RealModel, RealScale,
  Tile, GpuId,
  RealTTA,
  LockThreads,
  CompressMode, JpegQuality, WebpQuality, StripMeta,
  PerPageTimeoutSec,
  MinBytesReject
) {
  function toStr(v){ return (v === null || v === undefined) ? "" : ("" + v); }
  function isEmpty(s){ return !s || !s.trim || s.trim().length === 0; }
  function now(){ return new Date().toISOString(); }
  function log(s){ Logger.ILog("[" + now() + "] " + s); }
  function warn(s){ Logger.WLog("[" + now() + "] " + s); }
  function err(s){ Logger.ELog("[" + now() + "] " + s); }

  function shq(s){
    s = toStr(s);
    return "'" + s.replace(/'/g, "'\"'\"'") + "'";
  }

  function setVar(key, val){
    try{
      if(typeof Variables !== "undefined"){
        if(typeof Variables.Set === "function") Variables.Set(key, val);
        else Variables[key] = val;
      }
    }catch(e){}
  }
  function getVar(key, def){
    try{
      if(typeof Variables !== "undefined"){
        if(typeof Variables.Get === "function"){
          var v = Variables.Get(key);
          return (v === null || v === undefined || v === "") ? def : v;
        }
        var v2 = Variables[key];
        return (v2 === null || v2 === undefined || v2 === "") ? def : v2;
      }
    }catch(e){}
    return def;
  }

  function checkCmd(name){
    var r = Flow.Execute({ command: "bash", argumentList: ["-lc", "command -v " + name + " >/dev/null 2>&1"] });
    return r && r.exitCode === 0;
  }

  function runBash(label, script){
    log("RUN: " + label);
    var r = Flow.Execute({ command: "bash", argumentList: ["-lc", script] });
    if(!r || r.exitCode !== 0){
      err(label + " failed (exitCode=" + (r ? r.exitCode : "null") + ")");
      if(r && r.output) err("Output: " + r.output.substring(0, 4000));
      return null;
    }
    if(r.output && r.output.trim().length) log("OUTPUT (" + label + "): " + r.output.trim().substring(0, 2000));
    return r;
  }

  function pickIM(){
    // "magick" can read/write by: magick input -quality X output
    if(checkCmd("magick")) return "magick";
    if(checkCmd("convert")) return "convert";
    return null;
  }

  function toPngName(pathLike){
    return toStr(pathLike).replace(/\.(png|webp|jpe?g)$/i, ".png");
  }

  var extractDir = getVar("manga.extractDir", "");
  var workDir    = getVar("manga.workDir", "");
  var pageList   = getVar("manga.pageList", "");
  var totalStr   = getVar("manga.pagesTotal", "0");

  if(isEmpty(extractDir) || isEmpty(workDir) || isEmpty(pageList)){
    err("Missing Variables from Manga-Extract. Need manga.extractDir, manga.workDir, manga.pageList.");
    return 2;
  }

  var total = parseInt(totalStr, 10) || 0;

  if(!checkCmd("bash")) { err("Missing dependency: bash"); return 2; }
  if(!checkCmd("cp")) { err("Missing dependency: coreutils (cp)"); return 2; }

  var haveTimeout = checkCmd("timeout");

  var tpage = parseInt(PerPageTimeoutSec, 10);
  if(!tpage || tpage < 30) tpage = 240;

  var minBytes = parseInt(MinBytesReject, 10);
  if(!minBytes || minBytes < 4096) minBytes = 20000;

  var tile = parseInt(Tile, 10); if(!tile || tile <= 0) tile = 256;

  var gpu = isEmpty(GpuId) ? "0" : ("" + GpuId);
  if(gpu === "auto") gpu = "0";

  var lock = (LockThreads !== false);
  var jArg = lock ? "1:1:1" : "1:2:2";

  var cMode = (isEmpty(CompressMode) ? "none" : CompressMode).toLowerCase();

  var jq = parseInt(JpegQuality, 10); if(!jq) jq = 80;
  if(jq < 60) jq = 60; if(jq > 95) jq = 95;

  var wq = parseInt(WebpQuality, 10); if(!wq) wq = 80;
  if(wq < 50) wq = 50; if(wq > 95) wq = 95;

  var strip = (StripMeta !== false);

  // Compression tools
  var haveFfmpeg = checkCmd("ffmpeg");
  var haveCwebp  = checkCmd("cwebp");

  // ImageMagick preferred, but not strictly required if ffmpeg/cwebp can compress.
  var im = pickIM();

  if(cMode !== "none" && !im && !(haveFfmpeg || haveCwebp)){
    err("Compression requested but no compressor found.");
    err("Need ImageMagick ('magick' or 'convert') OR ffmpeg (jpeg/webp) OR cwebp (webp).");
    err("Install ImageMagick dockermod OR install ffmpeg/cwebp OR set CompressMode=none.");
    return 2;
  }

  log("=== Manga-Upscale Start ===");
  log("Dirs: extract=" + extractDir + " work=" + workDir);
  log("Tool=" + Tool + " gpu=" + gpu + " tile=" + tile + " lock=" + lock + " (-j " + jArg + ")");
  log("CompressMode=" + cMode + " minBytesReject=" + minBytes + " perPageTimeoutSec=" + tpage);
  log("Compressors: ImageMagick=" + (im ? im : "none") + " ffmpeg=" + haveFfmpeg + " cwebp=" + haveCwebp);

  // 1) Preserve ALL non-image files from extractDir -> workDir
  runBash("copy non-image files",
    "set -euo pipefail; cd " + shq(extractDir) + " ; " +
    "find . -type f ! \\( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \\) -print0 " +
    "| while IFS= read -r -d '' f; do " +
    "  rel=${f#./}; " +
    "  mkdir -p " + shq(workDir) + "/\"$(dirname \"$rel\")\"; " +
    "  cp -a -- \"$rel\" " + shq(workDir) + "/\"$rel\"; " +
    "done"
  );

  var pagesRes = Flow.Execute({ command: "bash", argumentList: ["-lc", "set -euo pipefail; cat " + shq(pageList)] });
  if(!pagesRes || pagesRes.exitCode !== 0){
    err("Unable to read page list: " + pageList);
    if(pagesRes && pagesRes.output) err("Output: " + pagesRes.output.substring(0, 2000));
    return 2;
  }

  var pages = (pagesRes.output || "")
    .split("\n")
    .map(function(x){ return x.trim(); })
    .filter(function(x){ return x.length > 0; });

  if(!pages.length){
    err("No pages in page list (pages.txt).");
    return 2;
  }

  var realBin = "/usr/local/bin/realesrgan-ncnn-vulkan";
  var waifuBin = "/usr/local/bin/waifu2x-ncnn-vulkan";

  function fallbackCopyOriginal(rel){
    var src = extractDir + "/" + rel;
    var dst = workDir + "/" + rel;
    var dstDir = dst.substring(0, dst.lastIndexOf("/"));
    var ok = runBash("fallback copy original",
      "set -euo pipefail; mkdir -p " + shq(dstDir) + " ; cp -f " + shq(src) + " " + shq(dst) + " ; " +
      "test -s " + shq(dst)
    );
    return !!ok;
  }

  function statBytes(path){
    var r = Flow.Execute({ command: "bash", argumentList: ["-lc", "stat -c %s " + shq(path) + " 2>/dev/null || echo 0"]});
    if(!r || r.exitCode !== 0) return 0;
    return parseInt((r.output || "0").trim(), 10) || 0;
  }

  function ensureNotTinyOrFallback(outPath, rel){
    var b = statBytes(outPath);
    if(b >= minBytes) return true;
    warn("Output too small (" + b + " bytes) => fallback to original for: " + rel);
    runBash("remove tiny output", "rm -f " + shq(outPath) + " >/dev/null 2>&1 || true");
    return fallbackCopyOriginal(rel);
  }

  // --- Fallback encoders (fixes the huge-PNG problem when ImageMagick is blocked) ---

  // Map JPEG quality (60-95) to ffmpeg q:v (2-31). Lower is better.
  function ffmpegJpegQ(jq){
    var q = Math.round((100 - jq) / 3) + 2;
    if(q < 2) q = 2;
    if(q > 31) q = 31;
    return q;
  }

  // Map WEBP quality (50-95) to ffmpeg q:v (2-31) roughly.
  function ffmpegWebpQ(wq){
    var q = Math.round((100 - wq) / 3) + 2;
    if(q < 2) q = 2;
    if(q > 31) q = 31;
    return q;
  }

  function tryFallbackEncode(tmpPngPath, outPath, mode){
    // mode: "jpeg" or "webp"
    var outDir = outPath.substring(0, outPath.lastIndexOf("/"));
    runBash("mkdir out dir (fallback enc)", "mkdir -p " + shq(outDir));

    if(mode === "jpeg"){
      if(haveFfmpeg){
        var q = ffmpegJpegQ(jq);
        var r = Flow.Execute({ command: "bash", argumentList: ["-lc",
          "set -euo pipefail; " +
          "ffmpeg -hide_banner -loglevel error -y -i " + shq(tmpPngPath) +
          " -q:v " + shq(q) +
          " -vf format=yuvj420p " +
          (strip ? "" : " ") +
          " " + shq(outPath) + " ; test -s " + shq(outPath)
        ]});
        return r && r.exitCode === 0;
      }
      return false;
    }

    if(mode === "webp"){
      // Prefer cwebp if present
      if(haveCwebp){
        var r2 = Flow.Execute({ command: "bash", argumentList: ["-lc",
          "set -euo pipefail; " +
          "cwebp -quiet -q " + shq(wq) + " " + (strip ? "-metadata none " : "") +
          shq(tmpPngPath) + " -o " + shq(outPath) + " ; test -s " + shq(outPath)
        ]});
        if(r2 && r2.exitCode === 0) return true;
      }
      // fallback to ffmpeg webp
      if(haveFfmpeg){
        var q2 = ffmpegWebpQ(wq);
        var r3 = Flow.Execute({ command: "bash", argumentList: ["-lc",
          "set -euo pipefail; " +
          "ffmpeg -hide_banner -loglevel error -y -i " + shq(tmpPngPath) +
          " -q:v " + shq(q2) +
          " " + shq(outPath) + " ; test -s " + shq(outPath)
        ]});
        return r3 && r3.exitCode === 0;
      }
      return false;
    }

    return false;
  }

  var ok = 0, fail = 0, fallbackOriginal = 0, fallbackPng = 0, timedOut = 0;

  runBash("mkdir tmp", "mkdir -p " + shq(workDir + "/.__tmp_upscale__"));

  for(var i=0; i<pages.length; i++){
    var rel = pages[i];
    var inPath = extractDir + "/" + rel;

    var outRel = rel;
    if(cMode === "jpeg") outRel = rel.replace(/\.(png|webp|jpe?g)$/i, ".jpg");
    else if(cMode === "webp") outRel = rel.replace(/\.(png|webp|jpe?g)$/i, ".webp");
    else outRel = rel.replace(/\.(png|webp|jpe?g)$/i, ".png");

    var outPath = workDir + "/" + outRel;
    var outDir = outPath.substring(0, outPath.lastIndexOf("/"));

    runBash("mkdir out dir", "mkdir -p " + shq(outDir));

    log("[" + (i+1) + "/" + pages.length + "] " + rel + " -> " + outRel);

    // Upscale into PNG tmp
    var tmpRel = toPngName(rel);
    var tmpUp = workDir + "/.__tmp_upscale__/" + tmpRel;
    var tmpDir = tmpUp.substring(0, tmpUp.lastIndexOf("/"));
    runBash("mkdir tmp dir", "mkdir -p " + shq(tmpDir) + " && rm -f " + shq(tmpUp) + " >/dev/null 2>&1 || true");

    var cmdLine = "";
    if(Tool === "realesrgan"){
      var rs = isEmpty(RealScale) ? "4" : ("" + RealScale);
      cmdLine =
        (haveTimeout ? ("timeout --preserve-status " + tpage + " ") : "") +
        shq(realBin) +
        " -i " + shq(inPath) +
        " -o " + shq(tmpUp) +
        " -n " + shq(RealModel) +
        " -s " + shq(rs) +
        " -t " + shq(tile) +
        " -g " + shq(gpu) +
        " -j " + shq(jArg) +
        (RealTTA === true ? " -x" : "");
    } else {
      var waifuModelPath = "/app/common/manga-upscalers/waifu2x/models/" + WaifuModel;
      cmdLine =
        (haveTimeout ? ("timeout --preserve-status " + tpage + " ") : "") +
        shq(waifuBin) +
        " -i " + shq(inPath) +
        " -o " + shq(tmpUp) +
        " -n " + shq(WaifuNoise) +
        " -s " + shq(WaifuScale) +
        " -t " + shq(tile) +
        " -m " + shq(waifuModelPath) +
        " -g " + shq(gpu) +
        " -j " + shq(jArg);
    }

    var up = Flow.Execute({ command: "bash", argumentList: ["-lc", "set -euo pipefail; " + cmdLine] });

    if(!up || up.exitCode !== 0){
      fail++;
      if(up && up.exitCode === 124){
        timedOut++;
        warn("Upscale TIMEOUT => fallback original: " + rel);
      } else {
        err("Upscale failed => fallback original: " + rel + " (exitCode=" + (up ? up.exitCode : "null") + ")");
      }
      if(fallbackCopyOriginal(rel)) fallbackOriginal++;
      continue;
    }

    var tmpBytes = statBytes(tmpUp);
    if(tmpBytes <= 0){
      fail++;
      err("Upscale produced empty tmp => fallback original: " + rel);
      if(fallbackCopyOriginal(rel)) fallbackOriginal++;
      continue;
    }

    if(cMode === "none"){
      var mv = runBash("move png",
        "set -euo pipefail; mkdir -p " + shq(outDir) + " ; mv -f " + shq(tmpUp) + " " + shq(outPath) + " ; test -s " + shq(outPath)
      );
      if(!mv){
        fail++;
        if(fallbackCopyOriginal(rel)) fallbackOriginal++;
        continue;
      }
      if(!ensureNotTinyOrFallback(outPath, rel)){ fail++; continue; }
      ok++;
      continue;
    }

    // --- Recompress ---
    // Prefer ImageMagick when available, but if it fails (policy limit), fallback to ffmpeg/cwebp.

    var recompressed = false;

    if(im){
      var stripArg = strip ? "-strip" : "";
      var convCmd = "";
      if(cMode === "jpeg"){
        convCmd =
          "set -euo pipefail; " +
          im + " " + shq(tmpUp) + " " + stripArg + " -sampling-factor 4:4:4 -quality " + jq + " " + shq(outPath) + " ; " +
          "test -s " + shq(outPath);
      } else { // webp
        convCmd =
          "set -euo pipefail; " +
          im + " " + shq(tmpUp) + " " + stripArg + " -quality " + wq + " " + shq(outPath) + " ; " +
          "test -s " + shq(outPath);
      }

      var conv = Flow.Execute({ command: "bash", argumentList: ["-lc", convCmd] });
      if(conv && conv.exitCode === 0){
        recompressed = true;
      } else {
        // This is your ImageMagick policy limit case (IHDR / height exceeds user limit)
        warn("Recompress blocked/failed by ImageMagick => trying fallback encoder: " + rel);
      }
    } else {
      warn("ImageMagick not available => using fallback encoder: " + rel);
    }

    if(!recompressed){
      // Try fallback encoders to still produce .jpg/.webp (fixes huge PNG issue)
      var fbOk = false;
      if(cMode === "jpeg"){
        fbOk = tryFallbackEncode(tmpUp, outPath, "jpeg");
      } else if(cMode === "webp"){
        fbOk = tryFallbackEncode(tmpUp, outPath, "webp");
      }

      if(fbOk){
        runBash("cleanup tmp (after fallback enc)", "rm -f " + shq(tmpUp) + " >/dev/null 2>&1 || true");
        if(!ensureNotTinyOrFallback(outPath, rel)){ fail++; continue; }
        ok++;
        continue;
      }

      // Still blocked => keep PNG (last resort)
      warn("Fallback encoder failed/unavailable => keeping upscaled PNG for: " + rel);

      var keepPngRel = rel.replace(/\.(png|webp|jpe?g)$/i, ".png");
      var keepPngPath = workDir + "/" + keepPngRel;
      var keepPngDir = keepPngPath.substring(0, keepPngPath.lastIndexOf("/"));

      var keep = runBash("keep png fallback",
        "set -euo pipefail; mkdir -p " + shq(keepPngDir) + " ; mv -f " + shq(tmpUp) + " " + shq(keepPngPath) + " ; test -s " + shq(keepPngPath)
      );
      if(!keep){
        fail++;
        if(fallbackCopyOriginal(rel)) fallbackOriginal++;
        continue;
      }
      if(!ensureNotTinyOrFallback(keepPngPath, rel)){ fail++; continue; }

      fallbackPng++;
      ok++;
      continue;
    }

    // recompress succeeded
    runBash("cleanup tmp", "rm -f " + shq(tmpUp) + " >/dev/null 2>&1 || true");
    if(!ensureNotTinyOrFallback(outPath, rel)){ fail++; continue; }
    ok++;
  }

  setVar("manga.pagesOk", "" + ok);
  setVar("manga.pagesFail", "" + fail);

  log("=== Manga-Upscale Summary ===");
  log("ok=" + ok + " fail=" + fail + " total=" + pages.length +
      " fallbackOriginal=" + fallbackOriginal + " keptPng=" + fallbackPng + " timeouts=" + timedOut);

  if(ok <= 0){
    err("All pages failed. Aborting.");
    return 2;
  }

  log("=== Manga-Upscale Done ===");
  return 1;
}