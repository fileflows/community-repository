import { Radarr } from 'Shared/Radarr';

/**
 * @name Radarr - Trigger Manual Import
 * @uid 0e522a46-ed76-4b40-bd1f-b3baac64264c
 * @description Trigger Radarr to manually import the media.
 * @help Imports the processed file into Radarr. Run last, after the file is moved to its output path.
 * - Uses Radarr.movieId from "Radarr - Movie Lookup", or Radarr's parse of the file/folder name.
 * - Links the import to the matching download in Radarr's queue, so the queue item is cleared and history keeps the download id.
 * - Picks the right file from Radarr's Manual Import list (skips samples) and logs any reasons Radarr flags it.
 * - After the import, checks that the movie really got the new file.
 * - Falls back to a downloadedMoviesScan when no movie is known or the Manual Import can't be started.
 * @author iBuSH
 * @revision 9
 * @version 2.0.0
 * @param {string} URL Radarr root URL and port (e.g. http://radarr:7878).
 * @param {string} ApiKey Radarr API Key.
 * @param {string} ImportPath The output path for import triggering (default Working File).
 * @param {bool} UseUnmappedPath Whether to Unmap the path to the original FileFlows Server path when using nodes in different platforms (e.g. Docker and Windows).
 * @param {bool} MoveMode Import mode 'copy' or 'move' (default copy).
 * @param {int} TimeOut Set in seconds the timeout for waiting completion (default 60 seconds, max 3600 seconds).
 * @output Command sent
 */
function Script(URL, ApiKey, ImportPath, UseUnmappedPath, MoveMode, TimeOut) {
    URL = (URL || Variables['Radarr.Url'] || Variables['Radarr.URI']).replace(/\/+$/g, '');
    ApiKey = ApiKey || Variables['Radarr.ApiKey'];
    ImportPath = ImportPath || Variables.file.FullName;
    ImportPath = UseUnmappedPath ? Flow.UnMapPath(ImportPath) : ImportPath;
    TimeOut = TimeOut > 0 ? Math.min(TimeOut, 3600) * 1000 : 60000;  // ms
    const importMode = MoveMode ? 'move' : 'copy';

    const radarr = new Radarr(URL, ApiKey);

    Logger.ILog(`Radarr URL: ${URL}`);
    Logger.ILog(`Triggering Path: ${ImportPath}`);
    Logger.ILog(`Import Mode: ${importMode}`);

    /*── movieId detection ──────────────────────────────────*/
    let movieId = toId(Variables['Radarr.movieId']) || toId(Variables.MovieInfo?.id);
    if (!movieId) {
        Logger.ILog('No movieId from the lookup step, trying to parse the file/folder name');
        movieId = parseMovie(Variables.file.Orig.FileNameNoExtension, radarr) ||
                  parseMovie(Variables.folder?.Orig?.Name, radarr);
    }

    /*─ Find the download in Radarr's queue, so the import is tied to it ─*/
    const downloadId = Variables['Radarr.downloadId'] || (movieId ? findDownloadId(radarr, movieId) : null);

    /*─ Execute first workflow, then fail-over if needed ─*/
    if (movieId) {
        Logger.ILog(`movieId: ${movieId} → ManualImport`);
        const result = manualImportWorkflow(radarr, ImportPath, importMode, movieId, downloadId, TimeOut);
        if (result !== null) return result;
        Logger.WLog('ManualImport could not be started, falling back to downloadedMoviesScan.');
    } else {
        Logger.ILog('No movieId → downloadedMoviesScan');
    }

    return scanWorkflow(radarr, ImportPath, importMode, downloadId, TimeOut);
}

/**
 * @description Turns a movie id from Variables into a positive number
 * @param {*} value - Id value
 * @returns {number|null} The id, or null
 */
function toId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

/*───────────────────────────── ManualImport ─────────────────────────────*/

/**
 * @description Perform ManualImport flow and wait until it finishes (or times out).
 * @param {Radarr} radarr - Radarr API instance
 * @param {string} path - Folder/File path given to movie import
 * @param {string} mode - 'move' or 'copy'
 * @param {number} movieId - Radarr movieId to attach to the import
 * @param {string} downloadId - Download client id of the grab, or null
 * @param {number} timeout - Timeout in milliseconds
 * @returns {number|null} 1 on success, −1 on failure, null if the import could not be started
 */
function manualImportWorkflow(radarr, path, mode, movieId, downloadId, timeout) {
    const candidates = getManualImportCandidates(radarr, path, movieId, downloadId);
    const cand = pickCandidate(candidates, path, c => c.movie?.id === movieId);
    if (!cand) return null;

    const rejections = (cand.rejections || []).map(r => r.reason || r).filter(r => r);
    if (rejections.length) {
        Logger.WLog(`Radarr flagged this file: ${rejections.join('; ')} (importing anyway, as in the Manual Import screen)`);
    }

    const before = getMovieFileId(radarr, movieId);
    const fileObj = buildManualImportFile(cand, movieId, path, downloadId);
    const cmdId = sendCommand(radarr, 'ManualImport', { files: [fileObj], importMode: mode });
    if (cmdId === null) return null;

    const status = waitForCommand(radarr, cmdId, timeout);
    if (status !== 1) return status;

    // A completed command doesn't mean the file was imported: check the movie got a new file
    const after = getMovieFileId(radarr, movieId);
    if (after === null || before === null) return 1; // could not verify
    if (!after || after === before) {
        Logger.WLog(`ManualImport finished but movie ${movieId} did not get a new file. Check Radarr's logs.`);
        return -1;
    }
    Logger.ILog('Import verified: the movie has the new file');
    return 1;
}

/**
 * @description Retrieve candidate files from Radarr's Manual Import analyser.
 * @param {Radarr} radarr - Radarr API instance
 * @param {string} importPath - Folder/File path to inspect
 * @param {number} movieId - Movie the file belongs to
 * @param {string} downloadId - Download client id of the grab, or null
 * @returns {Array<object>} Array of candidate objects (empty array on error)
 */
function getManualImportCandidates(radarr, importPath, movieId, downloadId) {
    try {
        const params = { folder: importPath, movieId: movieId, filterExistingFiles: 'false' };
        if (downloadId) params.downloadId = downloadId;
        const resp = radarr.fetchJson('manualimport', buildQueryParams(params)) || [];
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
 * @param {Function} belongs - Whether a candidate was matched to our movie
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

    // Prefer the file by name, then the only non-sample file Radarr matched to our item,
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
 * @description Build the file-object required by Radarr's ManualImport POST body.
 * @param {object} src - Single candidate object returned by ManualImport
 * @param {number} movieId - Radarr movieId to which the file is linked
 * @param {string} importPath - Path used when the candidate has none
 * @param {string} downloadId - Download client id of the grab, or null
 * @returns {object} File descriptor for ManualImport
 */
function buildManualImportFile(src, movieId, importPath, downloadId) {
    const path = src.path || importPath;

    const file = {
        path: path,
        folderName: src.folderName || System.IO.Path.GetFileName(System.IO.Path.GetDirectoryName(path)),
        movieId: movieId,
        releaseGroup: src.releaseGroup || '',
        quality: src.quality,
        languages: src.languages?.length ? src.languages : [ { id: 0, name: 'Unknown' } ],
        indexerFlags: src.indexerFlags ?? 0
    };
    const dlId = src.downloadId || downloadId;
    if (dlId) file.downloadId = dlId;
    return file;
}

/**
 * @description Finds the download client id of the queue item holding this movie
 * @param {Radarr} radarr - Radarr API instance
 * @param {number} movieId - Movie id
 * @returns {string|null} downloadId, or null if the download is not in the queue
 */
function findDownloadId(radarr, movieId) {
    try {
        const json = radarr.fetchJson('queue', buildQueryParams({ page: 1, pageSize: 1000, includeUnknownMovieItems: 'false' }));
        const items = (json?.records || []).filter(r => r.movieId === movieId && r.downloadId);
        if (items.length === 1) {
            Logger.ILog(`Found the download in Radarr's queue: ${items[0].title} (downloadId ${items[0].downloadId})`);
            return items[0].downloadId;
        }
        if (items.length > 1) {
            Logger.WLog(`${items.length} downloads for movie ${movieId} are in the queue, not linking the import to one`);
        }
    } catch (e) {
        Logger.WLog(`Could not read Radarr's queue: ${e.message}`);
    }
    return null;
}

/**
 * @description Reads the id of the movie's current file
 * @param {Radarr} radarr - Radarr API instance
 * @param {number} movieId - Movie id
 * @returns {number|null} movieFile id (0 if no file), or null on error
 */
function getMovieFileId(radarr, movieId) {
    try {
        const movie = radarr.fetchJson(`movie/${movieId}`, '');
        return movie?.hasFile ? (movie.movieFile?.id ?? movie.movieFileId ?? 0) : 0;
    } catch (e) {
        Logger.WLog(`Could not read the movie file: ${e.message}`);
        return null;
    }
}

/*──────────────────────────── downloadedMoviesScan ────────────────────────────*/

/**
 * @description Perform the downloadedMoviesScan flow (when movieId is absent).
 * @param {Radarr} radarr – Radarr API instance
 * @param {string} importPath – Folder/File path for downloadedMoviesScan
 * @param {string} mode – 'move' or 'copy'
 * @param {string} downloadId - Download client id of the grab, or null
 * @param {number} timeout – Timeout in milliseconds
 * @returns {number} 1 on success, −1 on failure
 */
function scanWorkflow(radarr, importPath, mode, downloadId, timeout) {
    const body = { path: importPath, importMode: mode };
    if (downloadId) body.downloadClientId = downloadId;

    const cmdId = sendCommand(radarr, 'downloadedMoviesScan', body);
    if (cmdId === null) return -1;

    return waitForCommand(radarr, cmdId, timeout);
}

/*────────────────────────────── helpers ──────────────────────────────────*/

/**
 * @description Send a command to Radarr and return its id
 * @param {Radarr} radarr – Radarr API instance
 * @param {string} name – Command name
 * @param {object} body – Command payload
 * @returns {number|null} Command id on success, null on failure
 */
function sendCommand(radarr, name, body) {
    try {
        const resp = radarr.sendCommand(name, { name: name, ...body });
        const cmdId = resp?.id;
        Logger.ILog(cmdId ? `${name} queued (cmdId=${cmdId}).` : `${name} was not accepted by Radarr.`);
        return cmdId ?? null;
    } catch (e) {
        Logger.ELog(`Send command ${name} failed: ${e.message}`);
        return null;
    }
}

/**
 * @description Wait until the command completes or the timeout is reached, then read its final status.
 * @param {Radarr} radarr - Radarr API instance
 * @param {number} cmdId - Command id returned by sendCommand
 * @param {number} timeoutMs - Maximum time to wait in milliseconds
 * @returns {number} 1 on success, −1 on failure or timeout
 */
function waitForCommand(radarr, cmdId, timeoutMs) {
    const ok = radarr.waitForCompletion(cmdId, timeoutMs);

    let cmd = null;
    try {
        cmd = radarr.fetchJson(`command/${cmdId}`, '');
    } catch (e) { /* status is only used for logging */ }
    const status = cmd?.status || (ok ? 'completed' : 'unknown');
    const message = cmd?.message ? ` - ${cmd.message}` : '';

    if (ok && status === 'completed') {
        Logger.ILog(`Command ${cmdId} completed${message}`);
        return 1;
    }
    if (status === 'queued' || status === 'started') {
        Logger.WLog(`Command ${cmdId} is still ${status} after ${timeoutMs / 1000}s. Radarr will finish it in the background; raise TimeOut if this happens often.`);
    } else {
        Logger.WLog(`Command ${cmdId} ended with status "${status}"${message}`);
    }
    return -1;
}

/**
 * @description Parse the movie name using Radarr parsing based on the search pattern.
 * @param {string} searchPattern - The search string (file or folder name)
 * @param {Object} radarr - Radarr API instance
 * @returns {number|null} movieId, or null if none.
 */
function parseMovie(searchPattern, radarr) {
    if (!searchPattern) return null;
    Logger.ILog(`Trying to Parse Movie name using Radarr Parsing: ${searchPattern}`);

    try {
        const item = radarr.fetchJson('parse', buildQueryParams({ title: searchPattern }));
        if (item?.movie?.id) {
            Logger.ILog(`Parsed: ${item.movie.title} (${item.movie.year})`);
            return item.movie.id;
        }
        Logger.WLog('The parse endpoint did not recognise this title.');
        return null;
    } catch (e) {
        Logger.ELog(`Error fetching Radarr parse endpoint: ${e.message}`);
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
