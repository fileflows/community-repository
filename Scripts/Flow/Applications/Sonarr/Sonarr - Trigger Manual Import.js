import { Sonarr } from 'Shared/Sonarr';

/**
 * @name Sonarr - Trigger Manual Import
 * @uid 8fe63a47-4a97-4b08-99f4-368d29279ad2
 * @description Trigger Sonarr to manually import the media.
 * @help Imports the processed file into Sonarr. Run last, after the file is moved to its output path.
 * - Uses Sonarr.seriesId / Sonarr.episodeIds from "Sonarr - TV Show Lookup", or Sonarr's parse of the file/folder name.
 * - Links the import to the matching download in Sonarr's queue, so the queue item is cleared and history keeps the download id.
 * - Picks the right file from Sonarr's Manual Import list (skips samples) and logs any reasons Sonarr flags it.
 * - After the import, checks that the episodes really got the new file.
 * - Falls back to a downloadedEpisodesScan when no series/episodes are known or the Manual Import can't be started.
 * @author iBuSH
 * @revision 8
 * @version 2.0.0
 * @param {string} URL Sonarr root URL and port (e.g. http://sonarr:8989).
 * @param {string} ApiKey Sonarr API Key.
 * @param {string} ImportPath The output path for import triggering (default Working File).
 * @param {bool} UseUnmappedPath Whether to Unmap the path to the original FileFlows Server path when using nodes in different platforms (e.g. Docker and Windows).
 * @param {bool} MoveMode Import mode 'copy' or 'move' (default copy).
 * @param {int} TimeOut Set in seconds the timeout for waiting completion (default 60 seconds, max 3600 seconds).
 * @output Command sent
 */
function Script(URL, ApiKey, ImportPath, UseUnmappedPath, MoveMode, TimeOut) {
    URL = (URL || Variables['Sonarr.Url'] || Variables['Sonarr.URI']).replace(/\/+$/g, '');
    ApiKey = ApiKey || Variables['Sonarr.ApiKey'];
    ImportPath = ImportPath || Variables.file.FullName;
    ImportPath = UseUnmappedPath ? Flow.UnMapPath(ImportPath) : ImportPath;
    TimeOut = TimeOut > 0 ? Math.min(TimeOut, 3600) * 1000 : 60000;  // ms
    const importMode = MoveMode ? 'move' : 'copy';

    const sonarr = new Sonarr(URL, ApiKey);

    Logger.ILog(`Sonarr URL: ${URL}`);
    Logger.ILog(`Triggering Path: ${ImportPath}`);
    Logger.ILog(`Import Mode: ${importMode}`);

    /*── seriesId / episodeId detection ──────────────────────────────────*/
    let seriesId = Variables['Sonarr.seriesId'] ?? Variables.TVShowInfo?.id ?? null;
    let episodeIds = toIdList(Variables['Sonarr.episodeIds']);
    if (!episodeIds.length) episodeIds = toIdList(Variables.TVShowInfo?.EpisodesInfo);

    if (!seriesId || !episodeIds.length) {
        Logger.ILog('No seriesId/episodeIds from the lookup step, trying to parse the file/folder name');
        const parsed = parseSeries(Variables.file.Orig.FileNameNoExtension, sonarr) ||
                       parseSeries(Variables.folder?.Orig?.Name, sonarr);
        seriesId = parsed?.series?.id ?? null;
        episodeIds = toIdList(parsed?.episodes);
    }

    /*─ Find the download in Sonarr's queue, so the import is tied to it ─*/
    const downloadId = Variables['Sonarr.downloadId'] ||
                       (seriesId && episodeIds.length ? findDownloadId(sonarr, seriesId, episodeIds) : null);

    /*─ Execute first workflow, then fail-over if needed ─*/
    if (seriesId && episodeIds.length) {
        Logger.ILog(`seriesId=${seriesId}, episodeIds=[${episodeIds.join(', ')}] → ManualImport`);
        const result = manualImportWorkflow(sonarr, ImportPath, importMode, seriesId, episodeIds, downloadId, TimeOut);
        if (result !== null) return result;
        Logger.WLog('ManualImport could not be started, falling back to downloadedEpisodesScan.');
    } else {
        Logger.ILog('No seriesId/episodeIds → downloadedEpisodesScan');
    }

    return scanWorkflow(sonarr, ImportPath, importMode, downloadId, TimeOut);
}

/**
 * @description Turns a list of episode ids or episode objects into a list of numeric ids
 * @param {Array|*} list - Episode ids, episode objects, or anything else
 * @returns {number[]} Episode ids (empty if none)
 */
function toIdList(list) {
    if (!list) return [];
    const arr = Array.isArray(list) ? list : Array.from(list); // .NET lists from Variables
    return arr
        .map(e => (e && typeof e === 'object') ? e.id : e)
        .map(Number)
        .filter(id => Number.isInteger(id) && id > 0);
}

/*───────────────────────────── ManualImport ─────────────────────────────*/

/**
 * @description Perform ManualImport flow and wait until it finishes (or times out).
 * @param {Sonarr}   sonarr - Sonarr API instance
 * @param {string}   path - Folder/File path given to series import
 * @param {string}   mode - 'move' or 'copy'
 * @param {number}   seriesId - Sonarr seriesId to attach to the import
 * @param {number[]} episodeIds - Sonarr episodeIds to attach to the import
 * @param {string}   downloadId - Download client id of the grab, or null
 * @param {number}   timeout - Timeout in milliseconds
 * @returns {number|null} 1 on success, −1 on failure, null if the import could not be started
 */
function manualImportWorkflow(sonarr, path, mode, seriesId, episodeIds, downloadId, timeout) {
    const candidates = getManualImportCandidates(sonarr, path, seriesId, downloadId);
    const cand = pickCandidate(candidates, path, c => (c.episodes || []).some(e => episodeIds.includes(e.id)));
    if (!cand) return null;

    const rejections = (cand.rejections || []).map(r => r.reason || r).filter(r => r);
    if (rejections.length) {
        Logger.WLog(`Sonarr flagged this file: ${rejections.join('; ')} (importing anyway, as in the Manual Import screen)`);
    }

    const before = getEpisodeFileIds(sonarr, episodeIds);
    const fileObj = buildManualImportFile(cand, seriesId, episodeIds, path, downloadId);
    const cmdId = sendCommand(sonarr, 'ManualImport', { files: [fileObj], importMode: mode });
    if (cmdId === null) return null;

    const status = waitForCommand(sonarr, cmdId, timeout);
    if (status !== 1) return status;

    // A completed command doesn't mean the file was imported: check the episodes got a new file
    const after = getEpisodeFileIds(sonarr, episodeIds);
    if (after === null || before === null) return 1; // could not verify
    const missing = episodeIds.filter(id => !after[id] || after[id] === before[id]);
    if (missing.length) {
        Logger.WLog(`ManualImport finished but episodes [${missing.join(', ')}] did not get a new file. Check Sonarr's logs.`);
        return -1;
    }
    Logger.ILog('Import verified: every episode has the new file');
    return 1;
}

/**
 * @description Retrieve candidate files from Sonarr's Manual Import analyser.
 * @param {Sonarr} sonarr - Sonarr API instance
 * @param {string} importPath - Folder/File path to inspect
 * @param {number} seriesId - Series the file belongs to
 * @param {string} downloadId - Download client id of the grab, or null
 * @returns {Array<object>} Array of candidate objects (empty array on error)
 */
function getManualImportCandidates(sonarr, importPath, seriesId, downloadId) {
    try {
        const params = { folder: importPath, seriesId: seriesId, filterExistingFiles: 'false' };
        if (downloadId) params.downloadId = downloadId;
        const resp = sonarr.fetchJson('manualimport', buildQueryParams(params)) || [];
        Logger.ILog(`ManualImport returned ${resp.length} candidate(s).`);
        return resp;
    } catch (e) {
        Logger.ELog(`Fetch candidates from ManualImport failed: ${e.message}`);
        return [];
    }
}

/**
 * @description Picks the candidate for the file being imported (not a sample or another file in the folder)
 * @param {Array<object>} candidates - Candidates from ManualImport
 * @param {string} path - Import path (file or folder)
 * @param {Function} belongs - Whether a candidate was matched to our episodes
 * @returns {object|null} The candidate, or null
 */
function pickCandidate(candidates, path, belongs) {
    if (!candidates.length) {
        Logger.WLog('No candidates returned by fetching ManualImport');
        return null;
    }

    candidates.forEach(c => {
        const reasons = (c.rejections || []).map(r => r.reason || r).filter(r => r);
        Logger.ILog(`  candidate: ${c.path || c.relativePath || c.name}${reasons.length ? ` [${reasons.join('; ')}]` : ''}`);
    });

    const name = baseName(path);
    const withQuality = candidates.filter(c => c.quality && c.quality.quality);
    const isSample = c => /\bsample\b/i.test(c.path || c.name || '') ||
        (c.rejections || []).some(r => /sample/i.test(r.reason || r));
    const byName = withQuality.filter(c => [c.path, c.relativePath, c.name].some(n => n && baseName(n) === name));
    const ours = withQuality.filter(c => belongs(c) && !isSample(c));
    const real = withQuality.filter(c => !isSample(c));

    // Prefer the file by name, then the only non-sample file Sonarr matched to our item,
    // then the only non-sample file
    const cand = byName[0] ||
                 (ours.length === 1 ? ours[0] : null) ||
                 (real.length === 1 ? real[0] : null);

    if (!cand) {
        Logger.WLog(withQuality.length
            ? `ManualImport returned ${withQuality.length} files and none could be picked for "${name}"`
            : 'No ManualImport candidate contained quality information.');
        return null;
    }
    Logger.ILog(`Using ManualImport candidate: ${cand.path}`);
    return cand;
}

/**
 * @description Returns the last segment of a path without video extension, lowercased
 * @param {string} path - A file or folder path
 * @returns {string} The name
 */
function baseName(path) {
    const name = (path || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop();
    return name.replace(/\.(mkv|mp4|m4v|avi|ts|m2ts|mov|wmv)$/i, '').toLowerCase();
}

/**
 * @description Build the file-object required by Sonarr's ManualImport POST body.
 * @param {object}   src - Single candidate object returned by ManualImport
 * @param {number}   seriesId - Sonarr seriesId to which the file is linked
 * @param {number[]} episodeIds - Sonarr episodeIds to which the file is linked
 * @param {string}   importPath - Path used when the candidate has none
 * @param {string}   downloadId - Download client id of the grab, or null
 * @returns {object} File descriptor for ManualImport
 */
function buildManualImportFile(src, seriesId, episodeIds, importPath, downloadId) {
    const path = src.path || importPath;

    const file = {
        path: path,
        folderName: src.folderName || System.IO.Path.GetFileName(System.IO.Path.GetDirectoryName(path)),
        seriesId: seriesId,
        episodeIds: episodeIds,
        releaseGroup: src.releaseGroup || '',
        quality: src.quality,
        languages: src.languages?.length ? src.languages : [ { id: 0, name: 'Unknown' } ],
        indexerFlags: src.indexerFlags ?? 0,
        releaseType: src.releaseType ?? 'unknown'
    };
    const dlId = src.downloadId || downloadId;
    if (dlId) file.downloadId = dlId;
    return file;
}

/**
 * @description Finds the download client id of the queue item holding these episodes
 * @param {Sonarr}   sonarr - Sonarr API instance
 * @param {number}   seriesId - Series id
 * @param {number[]} episodeIds - Episode ids
 * @returns {string|null} downloadId, or null if the download is not in the queue
 */
function findDownloadId(sonarr, seriesId, episodeIds) {
    try {
        const json = sonarr.fetchJson('queue', buildQueryParams({ page: 1, pageSize: 1000, includeUnknownSeriesItems: 'false' }));
        const item = (json?.records || []).find(r =>
            r.seriesId === seriesId && episodeIds.includes(r.episodeId) && r.downloadId);
        if (item) {
            Logger.ILog(`Found the download in Sonarr's queue: ${item.title} (downloadId ${item.downloadId})`);
            return item.downloadId;
        }
    } catch (e) {
        Logger.WLog(`Could not read Sonarr's queue: ${e.message}`);
    }
    return null;
}

/**
 * @description Reads the current episodeFileId of each episode
 * @param {Sonarr}   sonarr - Sonarr API instance
 * @param {number[]} episodeIds - Episode ids
 * @returns {Object|null} { episodeId: episodeFileId } or null on error
 */
function getEpisodeFileIds(sonarr, episodeIds) {
    try {
        const result = {};
        for (const id of episodeIds) {
            const ep = sonarr.fetchJson(`episode/${id}`, '');
            result[id] = ep?.hasFile ? ep.episodeFileId : 0;
        }
        return result;
    } catch (e) {
        Logger.WLog(`Could not read episode files: ${e.message}`);
        return null;
    }
}

/*──────────────────────── downloadedEpisodesScan branch ─────────────────────*/

/**
 * @description Perform the downloadedEpisodesScan flow (when seriesId is absent).
 * @param {Sonarr} sonarr – Sonarr API instance
 * @param {string} importPath – Folder/File path for downloadedEpisodesScan
 * @param {string} mode – 'move' or 'copy'
 * @param {string} downloadId - Download client id of the grab, or null
 * @param {number} timeout – Timeout in milliseconds
 * @returns {number} 1 on success, −1 on failure
 */
function scanWorkflow(sonarr, importPath, mode, downloadId, timeout) {
    const body = { path: importPath, importMode: mode };
    if (downloadId) body.downloadClientId = downloadId;

    const cmdId = sendCommand(sonarr, 'downloadedEpisodesScan', body);
    if (cmdId === null) return -1;

    return waitForCommand(sonarr, cmdId, timeout);
}

/*────────────────────────────── helpers ──────────────────────────────────*/

/**
 * @description Send a command to Sonarr and return its id
 * @param {Sonarr} sonarr – Sonarr API instance
 * @param {string} name – Command name
 * @param {object} body – Command payload
 * @returns {number|null} Command id on success, null on failure
 */
function sendCommand(sonarr, name, body) {
    try {
        const resp = sonarr.sendCommand(name, { name: name, ...body });
        const cmdId = resp?.id;
        Logger.ILog(cmdId ? `${name} queued (cmdId=${cmdId}).` : `${name} was not accepted by Sonarr.`);
        return cmdId ?? null;
    } catch (e) {
        Logger.ELog(`Send command ${name} failed: ${e.message}`);
        return null;
    }
}

/**
 * @description Wait until the command completes or the timeout is reached, then read its final status.
 * @param {Sonarr} sonarr - Sonarr API instance
 * @param {number} cmdId - Command id returned by sendCommand
 * @param {number} timeoutMs - Maximum time to wait in milliseconds
 * @returns {number} 1 on success, −1 on failure or timeout
 */
function waitForCommand(sonarr, cmdId, timeoutMs) {
    const ok = sonarr.waitForCompletion(cmdId, timeoutMs);

    let cmd = null;
    try {
        cmd = sonarr.fetchJson(`command/${cmdId}`, '');
    } catch (e) { /* status is only used for logging */ }
    const status = cmd?.status || (ok ? 'completed' : 'unknown');
    const message = cmd?.message ? ` - ${cmd.message}` : '';

    if (ok && status === 'completed') {
        Logger.ILog(`Command ${cmdId} completed${message}`);
        return 1;
    }
    if (status === 'queued' || status === 'started') {
        Logger.WLog(`Command ${cmdId} is still ${status} after ${timeoutMs / 1000}s. Sonarr will finish it in the background; raise TimeOut if this happens often.`);
    } else {
        Logger.WLog(`Command ${cmdId} ended with status "${status}"${message}`);
    }
    return -1;
}

/**
 * @description Parse the series name using Sonarr parsing based on the search pattern.
 * @param {string} searchPattern - The search string (file or folder name)
 * @param {Object} sonarr - Sonarr API instance
 * @returns {Object|null} Parse result with series and episodes, or null if none.
 */
function parseSeries(searchPattern, sonarr) {
    if (!searchPattern) return null;
    Logger.ILog(`Trying to Parse Series name using Sonarr Parsing: ${searchPattern}`);

    try {
        const item = sonarr.fetchJson('parse', buildQueryParams({ title: searchPattern }));
        if (item?.series?.id && item.episodes?.length) {
            Logger.ILog(`Parsed: ${item.series.title}, episodes [${item.episodes.map(e => `S${e.seasonNumber}E${e.episodeNumber}`).join(', ')}]`);
            return item;
        }
        Logger.WLog('The parse endpoint did not recognise this title.');
        return null;
    } catch (e) {
        Logger.ELog(`Error fetching Sonarr parse endpoint: ${e.message}`);
        return null;
    }
}

/**
 * @description Constructs a query string from the given parameters
 * @param {Object} obj - Key-value pairs to be converted into a query string
 * @returns {string} The constructed query string
 */
function buildQueryParams(obj) {
    return Object.entries(obj)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
}
