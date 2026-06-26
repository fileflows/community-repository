/**
 * @name Manga-Extract
 * @revision 1
 * @uid e1f57e27-83b6-4b4f-8f9b-cfad22750cca
 * @description Manga-Extract
- Extracts CBZ into /tmp/...
- Creates work dir
- Sets Variables:
- series.title
- manga.baseTemp, manga.extractDir, manga.workDir, manga.inputCbz, manga.pageList, manga.pagesTotal
- Adds unzip timeout to prevent zombie hangs
 * @param {int} UnzipTimeoutSec Timeout for unzip (seconds). Default 1800 (30 min).
 * @param {bool} FailIfNoImages If true, fail when no images found. Default true.
 * @outputs 2
 * @output Success
 * @output Failure
 */
function Script(UnzipTimeoutSec, FailIfNoImages) {

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

  var input = Flow.WorkingFile;
  if(isEmpty(input)){ err("No working file set."); return 2; }
  if(!input.toLowerCase().endsWith(".cbz")){ err("Working file is not a CBZ: " + input); return 2; }

  // series.title = parent folder name
  var parts = input.split("/").filter(function(x){ return x.length > 0; });
  var parent = (parts.length >= 2) ? parts[parts.length - 2] : "";
  setVar("series.title", parent);
  setVar("series_title", parent); // backup alias
  log("series.title = " + parent);

  if(!checkCmd("unzip")) { err("Missing dependency: unzip"); return 2; }
  var haveTimeout = checkCmd("timeout");

  var tsec = parseInt(UnzipTimeoutSec, 10);
  if(!tsec || tsec < 60) tsec = 1800;

  var baseTemp = "/tmp/fileflows_manga_" + Date.now();
  var extractDir = baseTemp + "/extract";
  var workDir = baseTemp + "/work";
  var pageList = baseTemp + "/pages.txt";

  setVar("manga.baseTemp", baseTemp);
  setVar("manga.extractDir", extractDir);
  setVar("manga.workDir", workDir);
  setVar("manga.inputCbz", input);
  setVar("manga.pageList", pageList);

  log("=== Manga-Extract Start ===");
  log("Input: " + input);
  log("Temp: " + baseTemp);

  if(!runBash("prepare dirs",
    "set -euo pipefail; rm -rf " + shq(baseTemp) + " && mkdir -p " + shq(extractDir) + " " + shq(workDir)
  )) return 2;

  var unzipCmd = haveTimeout
    ? ("timeout --preserve-status " + tsec + " unzip -q " + shq(input) + " -d " + shq(extractDir))
    : ("unzip -q " + shq(input) + " -d " + shq(extractDir));

  var ex = runBash("unzip", "set -euo pipefail; " + unzipCmd);
  if(!ex) return 2;

  // Enumerate images into pageList (relative paths)
  var list = runBash("list pages",
    "set -euo pipefail; cd " + shq(extractDir) + " ; " +
    "find . -type f \\( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' \\) " +
    "| sed 's#^\\./##' | LC_ALL=C sort | tee " + shq(pageList) + " | wc -l"
  );
  if(!list) return 2;

  var total = parseInt((list.output || "").trim(), 10) || 0;
  setVar("manga.pagesTotal", "" + total);
  log("Pages found: " + total);

  var failNoImgs = (FailIfNoImages !== false);
  if(failNoImgs && total <= 0){
    err("No images found after extraction. Failing.");
    return 2;
  }

  log("=== Manga-Extract Done ===");
  return 1;
}
