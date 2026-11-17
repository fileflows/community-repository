import { Sonarr } from 'Shared/Sonarr';

/**
 * @name Sonarr - TV Show Lookup
 * @uid 9f25c573-1c3c-4a1e-8429-5f1fc69fc6d8
 * @description This script looks up a TV Show from Sonarr and retrieves its metadata
 * @help Looks up the TV Show and episodes of the working file in Sonarr and stores the metadata in the variable 'TVShowInfo'.
 * Lookup order, first with the file name and then with the folder name (a "Season xx", "Staffel", "Saison" or "Specials" folder uses its parent folder):
 * 1. Series name parsed by Sonarr, matched against your library titles and alternate titles.
 * 2. Series path (folder name only).
 * 3. Sonarr queue, by release name.
 * 4. Grab history, by release name (dots and spaces are treated the same).
 * 5. Import history, by file name. Imports without a download id must also match the parsed title, so a wrong earlier import can't repeat itself.
 * The episodes are taken from Sonarr's parse of the file name, which also handles scene numbering and multi-episode files.
 * Sets: tvshow.Title, tvshow.Year, Sonarr.seriesId, Sonarr.episodeIds, Sonarr.seasonNumber, Sonarr.episodeNumber, TVShowInfo, OriginalLanguage, VideoMetadata, tvshow.PosterUrl.
 * @author iBuSH
 * @revision 11
 * @param {string} URL Sonarr root URL and port (e.g., http://sonarr:8989)
 * @param {string} ApiKey API Key for Sonarr
 * @output TV Show found
 * @output TV Show NOT found
 */
function Script(URL, ApiKey) {
    URL = (URL || Variables['Sonarr.Url'] || Variables['Sonarr.URI']).replace(/\/+$/g, '');
    ApiKey = ApiKey || Variables['Sonarr.ApiKey'];
    const sonarr = new Sonarr(URL, ApiKey);
    const folderName = getSeriesFolderName(Variables.folder.Orig.FullName);
    const fileNameNoExt = Variables.file.Orig.FileNameNoExtension;

    Logger.ILog(`Sonarr URL: ${URL}`);

    // Try the file name first, then fall back to the folder name (e.g. a season pack folder)
    let series = lookupSeries(fileNameNoExt, sonarr, false);
    if (!series && folderName && folderName.toLowerCase() !== (fileNameNoExt || '').toLowerCase()) {
        Logger.ILog('No match using the file name, trying the folder name');
        series = lookupSeries(folderName, sonarr, true);
    }

    if (!series) {
        Logger.ILog(`No result found for file "${fileNameNoExt}" or folder "${folderName}"`);
        return 2; // TV Show not found
    }

    refineEpisodes(series, fileNameNoExt, sonarr);
    updateSeriesMetadata(series);
    return 1; // TV Show found
}

/**
 * @description Looks a name up in Sonarr: parsed series name, path, queue, grab history, download history
 * @param {string} searchPattern - File or folder name to look up
 * @param {Object} sonarr - Sonarr API instance
 * @param {bool} isFolder - Whether searchPattern is a folder name (enables the path lookup)
 * @returns {Object|null} Series object (with EpisodesInfo when known), or null if not found
 */
function lookupSeries(searchPattern, sonarr, isFolder) {
    Logger.ILog(`Lookup TV Show: ${searchPattern}`);

    try {
        // Parse the name once with Sonarr's own parser. The parsed title/year is used to
        // verify candidates found in the queue or history. Records Sonarr created for its own
        // grabs are trusted (year check only), because release names are often transliterated
        // or translated and won't match the library title. Imports without a downloadId
        // (e.g. done by FileFlows itself) can be wrong, so those also need a title match.
        const parsed = parseSeries(searchPattern, sonarr, true);
        const expected = getExpectedInfo(parsed);
        if (expected) {
            Logger.ILog(`Parsed title: ${expected.titles.join(' | ')}, year: ${expected.year || 'unknown'}`);
        } else {
            Logger.WLog('Sonarr could not parse a title from the name, candidates will not be verified');
        }
        const isValid = (series, trusted) => validateSeries(series, expected, trusted);

        return searchSeriesByName(parsed, expected, sonarr) ||
               (isFolder && searchSeriesByPath(searchPattern, sonarr, isValid)) ||
               searchInQueue(searchPattern, sonarr, isValid) ||
               searchInGrabHistory(searchPattern, sonarr, isValid) ||
               searchInDownloadHistory(searchPattern, sonarr, isValid, isFolder);
    } catch (e) {
        Logger.ELog(`Error looking up "${searchPattern}": ${e.message}`);
        return null;
    }
}

// All library series, fetched once per run
let seriesCache = null;

/**
 * @description Looks up the parsed series name in the Sonarr library. Uses the series Sonarr's
 *              parser already mapped the name to; otherwise compares the parsed title with every
 *              library series' title and alternate titles (and the year, if the name has one).
 * @param {Object} parsed - Full output of the Sonarr parse endpoint
 * @param {Object|null} expected - Result of getExpectedInfo
 * @param {Object} sonarr - Sonarr API instance
 * @returns {Object|null} Series object (with EpisodesInfo when known), or null if not found or ambiguous
 */
function searchSeriesByName(parsed, expected, sonarr) {
    if (!expected) return null;
    Logger.ILog(`Searching by Series name: ${expected.titles[0]}`);

    if (parsed?.series?.title) {
        const series = parsed.series;
        if (parsed.episodes?.length) series.EpisodesInfo = parsed.episodes;
        Logger.ILog(`Found TV Show by name: ${series.title} (${series.year})`);
        return series;
    }

    try {
        seriesCache = seriesCache || sonarr.fetchJson('series', '') || [];
        const matches = seriesCache.filter(s => titleMatches(s, expected));
        const byYear = expected.year ? matches.filter(s => s.year === expected.year) : [];
        const candidates = byYear.length ? byYear : matches;

        if (candidates.length === 1) {
            Logger.ILog(`Found TV Show by name: ${candidates[0].title} (${candidates[0].year})`);
            return candidates[0];
        }
        if (candidates.length > 1) {
            Logger.WLog(`Series name is ambiguous: ${candidates.map(s => `${s.title} (${s.year})`).join(', ')}`);
        } else {
            Logger.WLog('No library series has this name');
        }
    } catch (e) {
        Logger.ELog(`Error fetching Sonarr series list: ${e.message}`);
    }
    return null;
}

/**
 * @description Builds the title/year we expect from Sonarr's parse result
 * @param {Object} parsed - Full output of the Sonarr parse endpoint
 * @returns {Object|null} { titles: string[], year: number|null, seriesId: number|null } or null
 */
function getExpectedInfo(parsed) {
    const info = parsed?.parsedEpisodeInfo;
    const title = info?.seriesTitle || info?.seriesTitleInfo?.title;
    if (!title) return null;

    return {
        titles: [title],
        year: info.seriesTitleInfo?.year || null,
        seriesId: parsed.series?.id ?? null
    };
}

/**
 * @description Normalises a title for comparison (case, punctuation, "&", leading "the", "(US)"/"(2005)")
 * @param {string} title - Title to normalise
 * @param {bool} stripParens - Also drop parenthesised parts and a trailing year
 * @returns {string} Normalised title
 */
function normalizeTitle(title, stripParens = false) {
    let t = (title || '').toLowerCase();
    if (stripParens) t = t.replace(/\([^)]*\)/g, ' ').replace(/\b(19|20)\d{2}\s*$/, ' ');
    return t
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9֐-׿]+/g, ' ')
        .trim()
        .replace(/^the /, '')
        .replace(/ /g, '');
}

/**
 * @description Checks that a candidate series really matches the parsed file/folder name
 * @param {Object} series - Series object from Sonarr
 * @param {Object|null} expected - Result of getExpectedInfo
 * @param {bool} trusted - The record comes from Sonarr's own grab, so only the year is checked
 * @returns {bool} true if the series can be trusted
 */
function validateSeries(series, expected, trusted = false) {
    if (!series) return false;
    if (!expected) return true; // nothing to compare against, keep old behaviour

    // Sonarr's parser mapped the name to this exact library series
    if (expected.seriesId && expected.seriesId === series.id) return true;

    if (expected.year && series.year && Math.abs(expected.year - series.year) > 1) {
        Logger.WLog(`Rejecting "${series.title}" (${series.year}): year does not match parsed year ${expected.year}`);
        return false;
    }

    if (trusted) return true;

    if (!titleMatches(series, expected)) {
        Logger.WLog(`Rejecting "${series.title}" (${series.year}): title does not match parsed title "${expected.titles[0]}"`);
        return false;
    }
    return true;
}

/**
 * @description Compares a series' titles (title, slug, alternate titles) with the parsed title
 * @param {Object} series - Series object from Sonarr
 * @param {Object} expected - Result of getExpectedInfo
 * @returns {bool} true if one of the titles matches
 */
function titleMatches(series, expected) {
    const names = [
        series.title,
        series.sortTitle,
        series.titleSlug,
        series.cleanTitle,
        ...(series.alternateTitles || []).map(a => a.title)
    ].filter(t => t);
    const candidateTitles = [
        ...names.map(t => normalizeTitle(t)),
        ...names.map(t => normalizeTitle(t, true))
    ].filter(t => t);

    const wanted = expected.titles
        .flatMap(t => [normalizeTitle(t), normalizeTitle(t, true)])
        .filter(t => t);
    return wanted.some(w => candidateTitles.includes(w));
}

/**
 * @description Narrows series.EpisodesInfo down to the episodes in the file name. Uses Sonarr's
 *              parse of the file name; if the episodes found so far don't cover it (e.g. the
 *              match came from a season pack), the series' episode list is fetched instead.
 * @param {Object} series - Series object, EpisodesInfo is updated in place
 * @param {string} fileNameNoExt - File name without extension
 * @param {Object} sonarr - Sonarr API instance
 */
function refineEpisodes(series, fileNameNoExt, sonarr) {
    const parsed = parseSeries(fileNameNoExt, sonarr, true);
    const info = parsed?.parsedEpisodeInfo;

    // Sonarr mapped the file to this series and knows the episodes: use them as-is
    if (parsed?.series?.id === series.id && parsed.episodes?.length) {
        series.EpisodesInfo = parsed.episodes;
        Logger.ILog(`Episodes from Sonarr parse: [ ${formatEpisodes(series.EpisodesInfo)} ]`);
        return;
    }

    const filter = getEpisodeFilter(info);
    if (!filter) {
        if ((series.EpisodesInfo?.length || 0) > 1) {
            Logger.WLog(`Could not parse episode numbers from the file name, keeping ${series.EpisodesInfo.length} episodes`);
        }
        return;
    }

    let matched = (series.EpisodesInfo || []).filter(filter.test);
    if (matched.length < filter.count) {
        try {
            const all = sonarr.fetchJson('episode', buildQueryParams({ seriesId: series.id })) || [];
            matched = all.filter(filter.test);
        } catch (e) {
            Logger.ELog(`Error fetching episodes for series ${series.id}: ${e.message}`);
        }
    }

    if (matched.length) {
        series.EpisodesInfo = matched;
        Logger.ILog(`Episodes matched to file name: [ ${formatEpisodes(matched)} ]`);
    } else {
        Logger.WLog(`No episodes of "${series.title}" match ${filter.label}, keeping ${series.EpisodesInfo?.length || 0} episodes`);
    }
}

/**
 * @description Builds an episode filter from Sonarr's parsed episode info
 * @param {Object} info - parsedEpisodeInfo from the parse endpoint
 * @returns {Object|null} { test: Function, count: number, label: string } or null
 */
function getEpisodeFilter(info) {
    if (!info) return null;

    if (info.seasonNumber != null && info.episodeNumbers?.length) {
        const season = info.seasonNumber;
        const eps = info.episodeNumbers;
        return {
            test: ep => ep.seasonNumber === season && eps.includes(ep.episodeNumber),
            count: eps.length,
            label: `S${season}E${eps.join('E')}`
        };
    }
    if (info.absoluteEpisodeNumbers?.length) {
        const abs = info.absoluteEpisodeNumbers;
        return {
            test: ep => abs.includes(ep.absoluteEpisodeNumber),
            count: abs.length,
            label: `absolute ${abs.join(', ')}`
        };
    }
    if (info.airDate) {
        const date = info.airDate.substring(0, 10);
        return {
            test: ep => (ep.airDate || '').substring(0, 10) === date,
            count: 1,
            label: `air date ${date}`
        };
    }
    return null;
}

/**
 * @description Formats episodes as S1E2 for logging
 * @param {Object[]} episodes - Episode objects
 * @returns {string} Comma separated list
 */
function formatEpisodes(episodes) {
    return episodes.map(e => `S${e.seasonNumber}E${e.episodeNumber}`).join(', ');
}

/**
 * @description Updates the series metadata in the global variables based on the Sonarr series data
 * @param {Object} series - Series object returned from Sonarr API
 */
function updateSeriesMetadata(series) {
    const isoLang = series.originalLanguage?.name
        ? LanguageHelper.GetIso2Code(series.originalLanguage.name)
        : null;
    const episodes = series.EpisodesInfo || [];
    const seasonNumber = episodes.length ? episodes[0].seasonNumber : null;

    Object.assign(Variables, {
        'tvshow.Title': series.title,
        'tvshow.Year': series.year,
        'Sonarr.seriesId': series.id ?? null,
        'Sonarr.episodeIds': episodes.map(ep => ep.id),
        'Sonarr.seasonNumber': seasonNumber,
        'Sonarr.episodeNumber': episodes.map(ep => ep.episodeNumber),
        TVShowInfo: series,
        OriginalLanguage: isoLang,
        VideoMetadata: {
            Title: series.title,
            Description: series.overview,
            Year: series.year,
            ReleaseDate: series.firstAired,
            OriginalLanguage: isoLang,
            Genres: series.genres
        }
    });

    Logger.ILog(`Detected Title: ${series.title}`);
    Logger.ILog(`Detected Year: ${series.year}`);
    Logger.ILog(`Detected Original Language: ${isoLang}`);
    Logger.ILog(
        episodes.length
            ? `Detected Sonarr seriesId: ${series.id} - episodeIds gathered (${episodes.length}): [ ${episodes.map(e => e.id).join(', ')} ]`
            : `Detected Sonarr seriesId: ${series.id} (no episodeIds)`
    );

    // Extract the url of the poster image
    const poster = series.images?.find(image => image.coverType === 'poster');
    if (poster && poster.remoteUrl) {
        Variables["tvshow.PosterUrl"] = poster.remoteUrl;
        Flow.SetThumbnail(poster.remoteUrl); // Set the FileFlows Thumbnail
    } else {
        Logger.WLog("No poster image found.");
    }
}

/**
 * @description Extracts the folder name from the provided folder path.
 * * If the folder itself is a Season, Staffel, Saison or Specials folder, it uses the parent folder.
 * @param {string} folderPath - The full path of the folder
 * @returns {string} The folder name
 */
function getSeriesFolderName(folderPath) {
    const regex = /^((Season|Staffel|Saison)[\s._-]*\d+|Specials)$/i;

    if (regex.test(System.IO.Path.GetFileName(folderPath))) {
        folderPath = System.IO.Path.GetDirectoryName(folderPath);
    }

    return System.IO.Path.GetFileName(folderPath);
}

/**
 * @description Returns a path's last segment without extension, lowercased
 * @param {string} path - A file or folder path
 * @returns {string} The base name
 */
function baseName(path) {
    const name = (path || '').replace(/[\\/]+$/, '').split(/[\\/]/).pop();
    return name.replace(/\.(mkv|mp4|m4v|avi|ts|m2ts|mov|wmv)$/i, '').toLowerCase();
}

/**
 * @description Returns the name of a path's parent folder, lowercased
 * @param {string} path - A file path
 * @returns {string} The parent folder name
 */
function parentName(path) {
    const parts = (path || '').replace(/[\\/]+$/, '').split(/[\\/]/);
    return parts.length > 1 ? parts[parts.length - 2].toLowerCase() : '';
}

/**
 * @description Compares release names ignoring case and punctuation (dots vs spaces)
 * @param {string} s - Release name
 * @returns {string} Collapsed name
 */
function loose(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * @description Searches for a series by file or folder path in Sonarr
 * @param {string} searchPattern - The search string to use (from the folder or file name)
 * @param {Object} sonarr - Sonarr API instance
 * @param {Function} isValid - Validates the found series
 * @returns {Object|null} Series object if found, or null if not found
 */
function searchSeriesByPath(searchPattern, sonarr, isValid) {
    Logger.ILog(`Searching by Series path`);

    try {
        const series = sonarr.getShowByPath(searchPattern);
        return series && isValid(series, true) ? series : null;
    } catch (e) {
        Logger.ELog(`Error searching series by path: ${e.message}`);
        return null;
    }
}

// Parse results by name, so the file name is only parsed once per run
const parseCache = {};

/**
 * @description Parse the series name using Sonarr parsing based on the search pattern.
 * @param {string} searchPattern - The search string (file or folder name)
 * @param {Object} sonarr - Sonarr API instance
 * @param {bool} fullOutput - Get full output or only the series data
 * @returns {Object|null} Parsed Series object, or null if none.
 */
function parseSeries(searchPattern, sonarr, fullOutput=false) {
    let endpoint = 'parse'

    if (!searchPattern) {
        Logger.WLog('No pattern passed in to find series');
        return null;
    }

    try {
        if (!(searchPattern in parseCache)) {
            Logger.ILog(`Trying to Parse Series name using Sonarr Parsing`);
            parseCache[searchPattern] = sonarr.fetchJson(endpoint, buildQueryParams({ title: searchPattern }));
        }
        const item = parseCache[searchPattern];

        if (fullOutput) return item || null;

        if (item?.series?.title) {
            if (item.episodes) {
                item.series.EpisodesInfo = item.episodes;
            }
            return item.series;
        }
        Logger.WLog(`The ${endpoint} endpoint did not recognise this title.`);
        return null;
    } catch (e) {
        Logger.ELog(`Error fetching Sonarr ${endpoint} endpoint: ${e.message}`);
        return null;
    }
}

/**
 * @description Searches the Sonarr queue for a series based on the search pattern
 * @param {string} searchPattern - The search string (file or folder name)
 * @param {Object} sonarr - Sonarr API instance
 * @param {Function} isValid - Validates the found series
 * @returns {Object|null} Series object if found, or null if not found
 */
function searchInQueue(searchPattern, sonarr, isValid) {
    Logger.ILog(`Searching in Queue`);

    return searchSonarrAPI('queue', searchPattern, sonarr, (item, sp) => {
        return loose(item.title) === loose(sp) || baseName(item.outputPath) === sp;
    }, item => isValid(item.series, true));   // queue items are Sonarr's own grabs
}

/**
 * @description Searches the Sonarr download history for a series based on the search pattern
 * @param {string} searchPattern - The search string (file or folder name)
 * @param {Object} sonarr - Sonarr API instance
 * @param {Function} isValid - Validates the found series
 * @param {bool} isFolder - Match the folder the file was dropped in instead of the file itself
 * @returns {Object|null} Series object if found, or null if not found
 */
function searchInDownloadHistory(searchPattern, sonarr, isValid, isFolder) {
    Logger.ILog(`Searching in Download History`);

    return searchSonarrAPI('history', searchPattern, sonarr, (item, sp) => {
        // guard in case the API version ignores the eventType filter
        const imported = !item.eventType || item.eventType === 'downloadFolderImported' || item.eventType === 3;
        const path = item.data?.droppedPath;
        return imported && (isFolder ? parentName(path) === sp : baseName(path) === sp);
    }, item => isValid(item.series, !!item.downloadId),   // no downloadId = imported by path, verify title
    { eventType: 3 });   // 3 == downloadFolderImported
}

/**
 * @description Searches the Sonarr grabbed history for a series based on the search pattern
 * @param {string} searchPattern - The search string (file or folder name)
 * @param {Object} sonarr - Sonarr API instance
 * @param {Function} isValid - Validates the found series
 * @returns {Object|null} Series object if found, or null if not found
 */
function searchInGrabHistory(searchPattern, sonarr, isValid) {
    Logger.ILog(`Searching in Grab History`);

    // Indexers often report release names with spaces instead of dots, so compare loosely
    return searchSonarrAPI('history', searchPattern, sonarr, (item, sp) => {
        return item.sourceTitle && loose(item.sourceTitle) === loose(sp);
    }, item => isValid(item.series, true), { eventType: 1 });   // 1 == grabbed
}

/**
 * @description Generic function to search Sonarr API (queue or history) based on a search pattern.
 *              Every matching record is checked with acceptItem, so a record that Sonarr attached
 *              to the wrong series is skipped. All episodes of the first accepted series are
 *              collected (a multi-episode file or season pack has one record per episode).
 * @param {string} endpoint - The Sonarr API endpoint to search (queue or history)
 * @param {string} searchPattern - The search string (file or folder name)
 * @param {Object} sonarr - Sonarr API instance
 * @param {Function} matchFunction - A function that determines if an item matches the search pattern
 * @param {Function} acceptItem - Validates the series attached to a matching item
 * @param {Object} [extraParams={}] - Additional query parameters for the API request
 * @returns {Object|null} Series object if found, or null if not found
 */
function searchSonarrAPI(endpoint, searchPattern, sonarr, matchFunction, acceptItem, extraParams = {}) {
    let page = 1;
    const pageSize = 1000;
    const maxPages = 10;
    const includeSeries = 'true';
    const includeEpisode = 'true';

    let seriesObj = null;           // first accepted series
    const episodes = [];            // all matching episodes of that series
    const seenIds = new Set();      // avoid duplicate episodes (re-imports)

    if (!searchPattern) {
        Logger.WLog('No pattern passed in to find TV Show');
        return null;
    }
    const sp = searchPattern.toLowerCase();

    try {
        while (page <= maxPages) {
            const queryParams = buildQueryParams({ page, pageSize, includeSeries, includeEpisode, ...extraParams });
            const json = sonarr.fetchJson(endpoint, queryParams);
            const items = json?.records || [];

            let lastMatched = false;
            items.forEach((item, idx) => {
                if (!matchFunction(item, sp)) return;
                if (seriesObj && item.series?.id !== seriesObj.id) return;
                if (!seriesObj) {
                    Logger.ILog(`Candidate in ${endpoint}: "${item.series?.title}" (${item.series?.year}), seriesId ${item.series?.id ?? item.seriesId}`);
                    if (!acceptItem(item)) return;
                    seriesObj = item.series;
                }
                if (item.episode && !seenIds.has(item.episode.id)) {
                    seenIds.add(item.episode.id);
                    episodes.push(item.episode);
                }
                lastMatched = idx === items.length - 1;
            });

            // Records of one grab/import are next to each other; only read on if they may
            // continue on the next page
            const atEnd = endpoint === 'queue' || items.length < pageSize;
            if (atEnd || (seriesObj && !lastMatched)) break;
            page++;
        }
    } catch (e) {
        Logger.ELog(`Error fetching Sonarr ${endpoint} endpoint: ${e.message}`);
    }

    if (!seriesObj) {
        Logger.WLog(`Reached the end of ${endpoint} endpoint with no match.`);
        return null;
    }

    Logger.ILog(`Found TV Show: ${seriesObj.title} (${episodes.length} episode records)`);
    if (episodes.length) seriesObj.EpisodesInfo = episodes;
    return seriesObj;
}

/**
 * @description Constructs a query string from the given parameters
 * @param {Object} params - Key-value pairs to be converted into a query string
 * @returns {string} The constructed query string
 */
function buildQueryParams(params) {
    return Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
}
