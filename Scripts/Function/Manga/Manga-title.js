/**
 * @name Manga-title
 * @description Manga Chapter Renamer Helper V2.1 (MINIMAL PATCH) -> sets clean_ch_name
Fix: handles titles like "Vol.11 Ch.56.5 - Extra" by stripping vol/ch wrappers to get "Extra"

Outputs:
1 = Success
2 = Failure
 * @outputs 2
 * @output 1 (Success)
 * @output 2 (Failure)
 */
function Script() {

    // -------------------------------
    // 0) Helpers (NO toStr)
    // -------------------------------
    function s(x) {
        if (x === null || x === undefined) return "";
        try { return "" + x; } catch (_) { return ""; }
    }
    function trim(x) { return s(x).trim(); }

    function escapeRegExp(str) {
        return s(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function sanitizeFileName(name) {
        var t = trim(name);
        if (!t) return "";
        // normalize unicode dashes
        t = t.replace(/[–—]/g, "-");
        // remove invalid filename chars: \ / : * ? " < > |
        t = t.replace(/[\\\/:\*\?"<>\|]/g, "");
        // collapse whitespace
        t = t.replace(/\s+/g, " ").trim();
        // trim trailing dots/spaces (windows)
        t = t.replace(/[\. ]+$/g, "");
        return t;
    }

    // Detect if a "title" is actually just the chapter number / label (not real)
    function isNonTitle(t, ch) {
        var x = trim(t);
        if (!x) return true;

        // If title is only digits (e.g. "110")
        if (/^\d+(\.\d+)?$/.test(x)) return true;

        // If title equals "Chapter 110" / "Ch 110" / "c110" / "#110"
        if (ch) {
            var n = escapeRegExp(ch);
            var re = new RegExp(
                "^\\s*(?:chapter|chap|ch|c)\\.?\\s*#?\\s*" + n + "\\s*$|^\\s*#\\s*" + n + "\\s*$|^\\s*" + n + "\\s*$",
                "i"
            );
            if (re.test(x)) return true;
        }

        // If title is something like "Chapter" only
        if (/^\s*(chapter|chap|ch|c)\.?\s*$/i.test(x)) return true;

        return false;
    }

    // Extract a chapter number from either Variables["manga.num"] or filename text
    // Accepts: 110, 110.5, etc.
    function extractChapterNumber(mangaNum, fileNameNoExt) {
        var ch = trim(mangaNum);
        if (ch) return ch;

        var f = trim(fileNameNoExt);
        if (!f) return "";

        // normalize
        var x = f.replace(/[–—_]/g, "-");

        // Match patterns in filename:
        // "Chapter 110", "Ch 110", "Ch.110", "c110", "#110", "110 -", "110:"
        var m =
            x.match(/(?:\bchapter\b|\bchap\b|\bch\b|^c)\.?\s*#?\s*(\d+(?:\.\d+)?)/i) ||
            x.match(/(?:^|\s|[-:])#\s*(\d+(?:\.\d+)?)(?:$|\s|[-:])/i) ||
            x.match(/(?:^|\s)(\d+(?:\.\d+)?)(?:\s*[-:]\s*|$)/i);

        if (m && m[1]) return trim(m[1]);

        return "";
    }

    // Strip any leading chapter label from a title:
    // "Chapter 110: X" -> "X"
    // "Ch 110 - X" -> "X"
    // "#110: X" -> "X"
    // "110 - X" -> "X"
    function stripChapterPrefix(title, chapterNum) {
        var t = trim(title);
        if (!t) return "";

        // normalize dashes
        t = t.replace(/[–—]/g, "-").trim();

        // If we know the chapter number, strip variants that include it
        var ch = trim(chapterNum);
        if (ch) {
            var n = escapeRegExp(ch);

            // "Chapter 110: " / "Ch. 110 - " / "c110: " / "#110 - " / "110: "
            var re1 = new RegExp(
                "^\\s*(?:(?:chapter|chap|ch|c)\\.?\\s*)?#?\\s*" + n + "\\s*(?:[:\\-])\\s*",
                "i"
            );
            t = t.replace(re1, "").trim();

            // "Chapter 110 " / "Ch 110 " / "110 "
            var re2 = new RegExp(
                "^\\s*(?:(?:chapter|chap|ch|c)\\.?\\s*)?#?\\s*" + n + "\\s+",
                "i"
            );
            t = t.replace(re2, "").trim();
        }

        // If still starts with a generic chapter label and punctuation, remove it
        t = t.replace(/^\s*(?:chapter|chap|ch|c)\.?\s*[:\-]\s*/i, "").trim();

        return t;
    }

    // ✅ MINIMAL ADD: strip leading "Vol.xx Ch.yy - " wrappers (your new problem case)
    function stripVolumeChapterPrefix(title, chapterNum) {
        var t = trim(title);
        if (!t) return "";

        t = t.replace(/[–—]/g, "-").trim();

        // Remove one or more leading Volume blocks: "Vol.11" / "Volume 11"
        t = t.replace(/^\s*(?:vol(?:ume)?\.?\s*\d+(?:\.\d+)?\s*)+/i, "");

        // Remove a leading Chapter block after volume: "Ch.56.5" / "Chapter 56.5"
        t = t.replace(/^\s*(?:ch(?:apter)?\.?\s*\d+(?:\.\d+)?\s*)+/i, "");

        // If chapterNum known, remove it if it still appears at the start like "Ch 56.5 - "
        var ch = trim(chapterNum);
        if (ch) {
            var n = escapeRegExp(ch);
            t = t.replace(new RegExp("^\\s*(?:ch(?:apter)?\\.?\\s*)?#?\\s*" + n + "\\s*(?:[:\\-])\\s*", "i"), "");
        }

        // Clean leftover separators
        t = t.replace(/^[\s._-]+/, "");
        t = t.replace(/^\s*[:\-]\s*/, "");
        return t.trim();
    }

    // -------------------------------
    // 1) Read inputs
    // -------------------------------
    var series = Variables["series_title"];
    var mangaNum = Variables["manga.num"];
    var rawTitle = Variables["manga.title"];
    var fileNoExt = Variables["file.NameNoExtension"];
    var ext = Variables["file.Extension"];

    Logger.ILog("RenamerHelperV2.1 --- START ---");
    Logger.ILog("RenamerHelperV2.1 DIAG series_title=[" + s(series) + "] manga.num=[" + s(mangaNum) + "] manga.title=[" + s(rawTitle) + "]");
    Logger.ILog("RenamerHelperV2.1 DIAG file.NameNoExtension=[" + s(fileNoExt) + "] file.Extension=[" + s(ext) + "]");

    // -------------------------------
    // 2) Decide chapter number (strong fallback)
    // -------------------------------
    var ch = extractChapterNumber(mangaNum, fileNoExt);
    Logger.ILog("RenamerHelperV2.1 DIAG extractedChapter=[" + s(ch) + "]");

    // -------------------------------
    // 3) Clean title
    // -------------------------------
    var title = trim(rawTitle);

    // ✅ MINIMAL ADD: remove "Vol.xx Ch.yy - " before normal chapter-prefix stripping
    title = stripVolumeChapterPrefix(title, ch);

    // existing behavior
    var cleanedTitle = stripChapterPrefix(title, ch);
    cleanedTitle = sanitizeFileName(cleanedTitle);

    // If the cleaned title is not a real title, treat as empty
    if (isNonTitle(cleanedTitle, ch)) cleanedTitle = "";

    Logger.ILog("RenamerHelperV2.1 DIAG cleanedTitle=[" + s(cleanedTitle) + "]");

    // -------------------------------
    // 4) Build clean_ch_name
    // -------------------------------
    var result = "";

    if (ch && cleanedTitle) {
        result = "Chapter " + ch + " - " + cleanedTitle;
    } else if (ch && !cleanedTitle) {
        result = "Chapter " + ch;
    } else if (!ch && cleanedTitle) {
        result = cleanedTitle;
    } else {
        // ultimate fallback: filename
        result = sanitizeFileName(fileNoExt);
    }

    result = sanitizeFileName(result);

    if (!result) {
        Logger.ELog("RenamerHelperV2.1 FAIL: Could not build a valid clean_ch_name.");
        Variables["clean_ch_name"] = "";
        return 2;
    }

    Variables["clean_ch_name"] = result;

    // Full test logs
    var finalName = result + s(ext);
    Logger.ILog("RenamerHelperV2.1 SET clean_ch_name=[" + result + "]");
    Logger.ILog("RenamerHelperV2.1 TEST final_filename=[" + finalName + "]");
    Logger.ILog("RenamerHelperV2.1 --- END (SUCCESS) ---");

    return 1;
}