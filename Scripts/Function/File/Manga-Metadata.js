/**
 * @name Manga-Metadata
 * @description Manga-Metadata-Initial (FIXED)
Prefers ComicInfo.xml <Series> for series_title; falls back to parent folder.
Extracts XML via stdout to avoid disk writes.
 * @output 1 Success
 * @output 2 Failure
 */
function Script() {
    var input = Flow.WorkingFile;
    if (!input) return 2;

    try {
        // 1) Parent Folder fallback (Series Identity)
        var parts = input.split("/").filter(function(x) { return x.length > 0; });
        var parentFolder = (parts.length >= 2) ? parts[parts.length - 2] : "Unknown Series";

        // 2) Stream ComicInfo.xml
        var process = Flow.Execute({
            command: "7z",
            argumentList: ["e", input, "ComicInfo.xml", "-so"]
        });

        // Defaults
        Variables["manga.num"] = "";
        Variables["manga.vol"] = "0";
        Variables["manga.title"] = "";
        Variables["series_title"] = parentFolder; // fallback unless XML overrides

        if (process.exitCode !== 0 || !process.standardOutput) {
            Logger.WLog("ComicInfo.xml not found or 7z failed. Using folder defaults.");
            Logger.ILog("Metadata Identified: " + parentFolder + " [NO XML]");
            return 1;
        }

        var xml = process.standardOutput.toString();

        // 3) Regex Parsing Helper (allows whitespace/newlines)
        function getTag(tag, src) {
            var re = new RegExp("<" + tag + "\\b[^>]*>([\\s\\S]*?)<\\/" + tag + ">", "i");
            var m = (src || "").match(re);
            return m ? (m[1] || "").toString().trim() : "";
        }

        var xmlSeries = getTag("Series", xml);
        var chNum = getTag("Number", xml);
        var xmlTitle = getTag("Title", xml);

        // 4) Assign variables
        Variables["manga.num"] = chNum || "";
        Variables["manga.vol"] = getTag("Volume", xml) || "0";

        // Title: drop "Chapter 107" generic titles
        var isGeneric = false;
        if (chNum) {
            isGeneric = new RegExp("^chapter\\s+" + chNum.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i").test(xmlTitle);
        }
        Variables["manga.title"] = (xmlTitle && !isGeneric) ? xmlTitle : "";

        // ✅ Key fix: series_title should come from XML if present
        if (xmlSeries) {
            Variables["series_title"] = xmlSeries;
        } else {
            Variables["series_title"] = parentFolder;
        }

        Logger.ILog("Metadata Identified: " + Variables["series_title"] + " - c" + (Variables["manga.num"] || "?") + " [" + (Variables["manga.title"] || "") + "]");
        return 1;

    } catch (err) {
        var msg = (err && err.message) ? err.message : ("" + err);
        Logger.ELog("Critical Script Error: " + msg);
        return 2;
    }
}