import { Sonarr } from 'Shared/Sonarr';

/**
 * @name Sonarr - Rename
 * @uid 23221948-1b70-4748-a895-dfc93325c970
 * @description This script will send a rename command to Sonarr
 * @author rexis-veritas
 * @revision 4
 * @param {string} URI Sonarr root URI and port (e.g. http://sonarr:8989)
 * @param {string} ApiKey API Key
 * @output Item renamed successfully
 * @output Rename not required for item
 * @output Item not found
 */
function Script(URI, ApiKey) {
    URI = URI.replace(/\/$/, '');
    let sonarr = new Sonarr(URI, ApiKey);
    let folderPath = Variables.folder.FullName;
    let currentFileName = Variables.file.Name;
    let newFilePath = null;

    let [series, basePath] = findSeries(folderPath, sonarr);

    if (!series) {
        Logger.WLog('Series not found for path: ' + folderPath);
        return 3;
    }

    try {
        // Fetch current files for this series
        let seriesFiles = sonarr.fetchJson('episodefile', `seriesId=${series.id}`);

        if (!seriesFiles || seriesFiles.length === 0) {
            Logger.ILog(`No files found for series ${series.id}`);
            return -1;
        }

        let currentFileId = null;
        seriesFiles.forEach(file => {
            if (file.path.endsWith(currentFileName)) {
                currentFileId = file.id;
            }
        });

        if (!currentFileId) {
            Logger.WLog('Could not match current file to a Sonarr EpisodeFile ID.');
            return 3;
        }

        // 1. Trigger the Rescan
        let refreshBody = { name: 'RescanSeries', seriesId: series.id };
        sonarr.sendCommand('RescanSeries', refreshBody);
        Logger.ILog('Series rescan triggered. Waiting 20 seconds for Sonarr to update...');

        // 2. WAIT 20 SECONDS
        System.Threading.Thread.Sleep(20000); 

        // 3. Get rename preview
        let renamedEpisodes = sonarr.fetchJson('rename', `seriesId=${series.id}`);
        let targetRename = null;

        if (!renamedEpisodes || renamedEpisodes.length === 0) {
            Logger.ILog('No episodes need to be renamed according to Sonarr after rescan.');
            return 2;
        }

        renamedEpisodes.every(element => {
            if (element.episodeFileId === currentFileId) {
                targetRename = element;
                return false;
            }
            return true;
        });

        if (!targetRename) {
            Logger.ILog(`Current file ID ${currentFileId} does not need renaming.`);
            return 2;
        }
        
        let newFileName = targetRename.newPath;
        newFilePath = System.IO.Path.Combine(System.IO.Path.GetDirectoryName(basePath), newFileName);
        Logger.ILog(`Found rename: ${currentFileName} -> ${newFileName}`);

        // 4. Execute Rename
        let renameBody = {
            name: 'RenameFiles',
            seriesId: series.id,
            files: [currentFileId]
        };
        
        sonarr.sendCommand('RenameFiles', renameBody);
        Logger.ILog(`Rename command sent to Sonarr. Setting working file to: ${newFilePath}`);

        Flow.SetWorkingFile(newFilePath);
        return 1;

    } catch (error) {
        Logger.WLog('Error: ' + error.message);
        return -1;
    }
}

function findSeries(filePath, sonarr) {
    let currentPath = filePath;
    let allSeries = sonarr.fetchJson('series');
    let seriesFolders = {};

    for (let s of allSeries) {
        let folderName = System.IO.Path.GetFileName(s.path.replace(/[\\/]$/, ''));
        seriesFolders[folderName] = s;
    }

    while (currentPath) {
        let currentFolder = System.IO.Path.GetFileName(currentPath);

        if (seriesFolders[currentFolder]) {
            let series = seriesFolders[currentFolder];
            Logger.ILog('Series found: ' + series.title);
            return [series, currentPath];
        }

        let parent = System.IO.Path.GetDirectoryName(currentPath);
        if (!parent || parent === currentPath) break;
        currentPath = parent;
    }
    return [null, null];
}
