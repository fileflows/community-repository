/**
 * @name Manga-Repack
 * @description Manga-Repack (FIXED WRAPPING)
 * @outputs 2
 * @output Success
 * @output Failure
 */
function Script() {
    const log = (s) => Logger.ILog(s);
    const err = (s) => Logger.ELog(s);
    const shq = (s) => "'" + (s || "").replace(/'/g, "'\"'\"'") + "'";

    // 1. Identify Paths
    let originalFile = Flow.WorkingFile; 
    let workDir = Variables["manga.workDir"];

    if (!workDir) {
        err("Missing manga.workDir variable.");
        return 2;
    }

    // CREATE NEW FILENAME to avoid overwriting/deleting original
    let targetCbz = originalFile.replace(/\.cbz$/i, " (Upscaled).cbz");
    let tempCbz = originalFile + ".repacking.tmp";

    log(`Source: ${originalFile}`);
    log(`Output: ${targetCbz}`);

    // 2. Dependency Check
    let zipCheck = Flow.Execute({ command: "bash", argumentList: ["-c", "command -v zip"] });
    if (zipCheck.exitCode !== 0) { 
        err("Missing 'zip' binary in the environment."); 
        return 2; 
    }

    // 3. Create NEW Zip
    log("Creating repacked CBZ...");
    let zipCmd = `cd ${shq(workDir)} && zip -r -9 -X ${shq(tempCbz)} .`;
    let result = Flow.Execute({ command: "bash", argumentList: ["-c", zipCmd] });

    if (result.exitCode !== 0) {
        err(`Zip failed: ${result.output}`);
        return 2;
    }

    // 4. Move to Final Destination
    let mvResult = Flow.Execute({ 
        command: "bash", 
        argumentList: ["-c", `mv -f ${shq(tempCbz)} ${shq(targetCbz)}`] 
    });

    if (mvResult.exitCode === 0) {
        // TELL FILEFLOWS ABOUT THE NEW FILE
        Flow.SetWorkingFile(targetCbz); 
        
        // Refresh metadata/size without triggering .NET errors
        try {
            if (typeof Flow.UpdateSize === 'function') Flow.UpdateSize();
        } catch(e) { 
            log("Size update handled by engine."); 
        }

        // Set variable for downstream nodes
        Variables["manga.repackedCbz"] = targetCbz;

        log("Manga repacked successfully as NEW file.");
        return 1;
    } else {
        err("Failed to move to final destination.");
        return 2;
    }
}