import { Radarr } from 'Shared/Radarr';

/**
 * @name Radarr - Movie Lookup
 * @uid 1153e3fb-e7bb-4162-87ad-5c15cd9c081f
 * @description This script looks up a Movie from Radarr and retrieves its metadata
 * @help Looks up the movie of the working file in Radarr and stores the metadata in the variable 'MovieInfo'.
 * Lookup order, first with the file name and then with the folder name:
 * 1. Movie name and year parsed by Radarr, matched against your library titles, original titles and alternate titles.
 * 2. Movie path (folder name only).
 * 3. Radarr queue, by release name.
 * 4. Grab history, by release name (dots and spaces are treated the same).
 * 5. Import history, by file name. Imports without a download id must also match the parsed title, so a wrong earlier import can't repeat itself.
 * Every match is checked against the parsed year, so a release is never tagged with a different movie's metadata.
 * Sets: movie.Title, movie.Year, Radarr.movieId, MovieInfo, OriginalLanguage, VideoMetadata, movie.PosterUrl.
 * @author iBuSH
 * @revision 10
 * @param {string} URL Radarr root URL and port (e.g., http://radarr:1234)
 * @param {string} ApiKey API Key for Radarr
 * @output Movie found
 * @output Movie not found
 */
function Script(URL, ApiKey) {
    URL = (URL || Variables['Radarr.Url'] || Variables['Radarr.URI']).replace(/\/+$/g, '');
    ApiKey = ApiKey || Variables['Radarr.ApiKey'];
    const radarr = new Radarr(URL, ApiKey);
    const folderName = getMovieFolderName(Variables.folder.Orig.FullName);
    const fileNameNoExt = Variables.file.Orig.FileNameNoExtension;

    Logger.ILog(`Radarr URL: ${URL}`);

    // Try the file name first, then fall back to the folder name
    let movie = lookupMovie(fileNameNoExt, radarr, false);
    if (!movie && folderName && folderName.toLowerCase() !== (fileNameNoExt || '').toLowerCase()) {
        Logger.ILog('No match using the file name, trying the folder name');
        movie = lookupMovie(folderName, radarr, true);
    }

    if (!movie) {
        Logger.ILog(`No result found for file "${fileNameNoExt}" or folder "${folderName}"`);
        return 2; // Movie not found
    }

    updateMovieMetadata(movie);
    return 1; // Movie found
}

/**
 * @description Looks a name up in Radarr: parsed movie name, path, queue, grab history, download history
 * @param {string} searchPattern - File or folder name to look up
 * @param {Object} radarr - Radarr API instance
 * @param {bool} isFolder - Whether searchPattern is a folder name (enables the path lookup)
 * @returns {Object|null} Movie object if found, or null if not found
 */
function lookupMovie(searchPattern, radarr, isFolder) {
    Logger.ILog(`Lookup Movie name: ${searchPattern}`);

    try {
        // Parse the name once with Radarr's own parser. The parsed title/year is used to
        // verify candidates found in the queue or history. Records Radarr created for its own
        // grabs are trusted (year check only), because release names are often transliterated
        // or translated and won't match the library title. Imports without a downloadId
        // (e.g. done by FileFlows itself) can be wrong, so those also need a title match.
        const parsed = parseMovie(searchPattern, radarr, true);
        const expected = getExpectedInfo(parsed);
        if (expected) {
            Logger.ILog(`Parsed title(s): ${expected.titles.join(' | ')}, year: ${expected.year || 'unknown'}`);
        } else {
            Logger.WLog('Radarr could not parse a title from the name, candidates will not be verified');
        }
        const isValid = (movie, trusted) => validateMovie(movie, expected, trusted);

        return searchMovieByName(parsed, expected, radarr) ||
               (isFolder && searchMovieByPath(searchPattern, radarr, isValid)) ||
               searchInQueue(searchPattern, radarr, isValid) ||
               searchInGrabHistory(searchPattern, radarr, isValid) ||
               searchInDownloadHistory(searchPattern, radarr, isValid);
    } catch (e) {
        Logger.ELog(`Error looking up "${searchPattern}": ${e.message}`);
        return null;
    }
}

// All library movies, fetched once per run
let movieCache = null;

/**
 * @description Looks up the parsed movie name in the Radarr library. Uses the movie Radarr's
 *              parser already mapped the name to; otherwise compares the parsed title with every
 *              library movie's title, original title and alternate titles, and the year.
 * @param {Object} parsed - Full output of the Radarr parse endpoint
 * @param {Object|null} expected - Result of getExpectedInfo
 * @param {Object} radarr - Radarr API instance
 * @returns {Object|null} Movie object, or null if not found or ambiguous
 */
function searchMovieByName(parsed, expected, radarr) {
    if (!expected) return null;
    Logger.ILog(`Searching by Movie name: ${expected.titles[0]}${expected.year ? ` (${expected.year})` : ''}`);

    if (parsed?.movie?.title) {
        Logger.ILog(`Found Movie by name: ${parsed.movie.title} (${parsed.movie.year})`);
        return parsed.movie;
    }

    try {
        movieCache = movieCache || radarr.fetchJson('movie', '') || [];
        const matches = movieCache.filter(m => titleMatches(m, expected) &&
            (!expected.year || !m.year || Math.abs(expected.year - m.year) <= 1));
        const exactYear = expected.year ? matches.filter(m => m.year === expected.year) : [];
        const candidates = exactYear.length ? exactYear : matches;

        if (candidates.length === 1) {
            Logger.ILog(`Found Movie by name: ${candidates[0].title} (${candidates[0].year})`);
            return candidates[0];
        }
        if (candidates.length > 1) {
            Logger.WLog(`Movie name is ambiguous: ${candidates.map(m => `${m.title} (${m.year})`).join(', ')}`);
        } else {
            Logger.WLog('No library movie has this name');
        }
    } catch (e) {
        Logger.ELog(`Error fetching Radarr movie list: ${e.message}`);
    }
    return null;
}

/**
 * @description Builds the title/year we expect from Radarr's parse result
 * @param {Object} parsed - Full output of the Radarr parse endpoint
 * @returns {Object|null} { titles: string[], year: number|null } or null if nothing was parsed
 */
function getExpectedInfo(parsed) {
    const info = parsed?.parsedMovieInfo;
    if (!info) return null;

    const titles = [...new Set([
        ...(info.movieTitles || []),
        info.movieTitle,
        info.primaryMovieTitle
    ].filter(t => t))];

    if (titles.length === 0) return null;

    return {
        titles: titles,
        year: info.year || null,
        movieId: parsed.movie?.id ?? null
    };
}

/**
 * @description Normalises a title for comparison (case, punctuation, "&", leading "the")
 * @param {string} title - Title to normalise
 * @returns {string} Normalised title
 */
function normalizeTitle(title) {
    return (title || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9֐-׿]+/g, ' ')
        .trim()
        .replace(/^the /, '')
        .replace(/ /g, '');
}

/**
 * @description Checks that a candidate movie really matches the parsed file/folder name
 * @param {Object} movie - Movie object from Radarr
 * @param {Object|null} expected - Result of getExpectedInfo
 * @param {bool} trusted - The record comes from Radarr's own grab, so only the year is checked
 * @returns {bool} true if the movie can be trusted
 */
function validateMovie(movie, expected, trusted = false) {
    if (!movie) return false;
    if (!expected) return true; // nothing to compare against, keep old behaviour

    // Radarr's parser mapped the name to this exact library movie
    if (expected.movieId && expected.movieId === movie.id) return true;

    if (expected.year && movie.year && Math.abs(expected.year - movie.year) > 1) {
        Logger.WLog(`Rejecting "${movie.title}" (${movie.year}): year does not match parsed year ${expected.year}`);
        return false;
    }

    if (trusted) return true;

    if (!titleMatches(movie, expected)) {
        Logger.WLog(`Rejecting "${movie.title}" (${movie.year}): title does not match parsed title "${expected.titles[0]}"`);
        return false;
    }
    return true;
}

/**
 * @description Compares a movie's titles (title, original title, alternate titles) with the parsed title
 * @param {Object} movie - Movie object from Radarr
 * @param {Object} expected - Result of getExpectedInfo
 * @returns {bool} true if one of the titles matches
 */
function titleMatches(movie, expected) {
    const candidateTitles = [
        movie.title,
        movie.originalTitle,
        ...(movie.alternateTitles || []).map(a => a.title)
    ].map(normalizeTitle).filter(t => t);

    const wanted = expected.titles.map(normalizeTitle).filter(t => t);
    return wanted.some(w => candidateTitles.includes(w));
}

/**
 * @description Updates the movie metadata in the global variables based on the Radarr movie data
 * @param {Object} movie - Movie object returned from Radarr API
 */
function updateMovieMetadata(movie) {
    const isoLang = movie.originalLanguage?.name
        ? LanguageHelper.GetIso2Code(movie.originalLanguage.name)
        : null;

    Object.assign(Variables, {
        'movie.Title': movie.title,
        'movie.Year': movie.year,
        'Radarr.movieId': movie.id,
        MovieInfo: movie,
        OriginalLanguage: isoLang,
        VideoMetadata: {
            Title: movie.title,
            Description: movie.overview,
            Year: movie.year,
            ReleaseDate: movie.inCinemas || movie.digitalRelease || movie.physicalRelease,
            OriginalLanguage: isoLang,
            Genres: movie.genres
        }
    })

    Logger.ILog(`Detected Movie Title: ${movie.title}`);
    Logger.ILog(`Detected Movie Year: ${movie.year}`);
    Logger.ILog(`Detected Original Language: ${isoLang}`);
    Logger.ILog(`Detected Radarr movieId: ${movie.id}`);

    // Extract the url of the poster image
    const poster = movie.images?.find(image => image.coverType === 'poster');
    if (poster && poster.remoteUrl) {
        Variables["movie.PosterUrl"] = poster.remoteUrl;
        Flow.SetThumbnail(poster.remoteUrl); // Set the FileFlows Thumbnail
    } else {
        Logger.WLog("No poster image found.");
    }
}

/**
 * @description Extracts the folder name from the provided folder path
 * @param {string} folderPath - The full path of the folder
 * @returns {string} The folder name
 */
function getMovieFolderName(folderPath) {
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
 * @description Searches for a movie by file or folder path in Radarr
 * @param {string} searchPattern - The search string to use (from the folder or file name)
 * @param {Object} radarr - Radarr API instance
 * @param {Function} isValid - Validates the found movie
 * @returns {Object|null} Movie object if found, or null if not found
 */
function searchMovieByPath(searchPattern, radarr, isValid) {
    Logger.ILog(`Searching by Movie path`);

    try {
        const movie = radarr.getMovieByPath(searchPattern);
        return movie && isValid(movie, true) ? movie : null;
    } catch (e) {
        Logger.ELog(`Error searching movie by path: ${e.message}`);
        return null;
    }
}

/**
 * @description Parse the movie name using Radarr parsing based on the search pattern.
 * @param {string} searchPattern - The search string (file or folder name)
 * @param {Object} radarr - Radarr API instance
 * @param {bool} fullOutput - Get full output or only the movie data
 * @returns {Object|null} Parsed movie object, or null if none.
 */
function parseMovie(searchPattern, radarr, fullOutput=false) {
    let endpoint = 'parse'

    Logger.ILog(`Trying to Parse Movie name using Radarr Parsing`);

    if (!searchPattern) {
        Logger.WLog('No pattern passed in to find movie');
        return null;
    }

    try {
        const queryParams = buildQueryParams({ title: searchPattern });
        const item = radarr.fetchJson(endpoint, queryParams);

        if (fullOutput) return item || null;

        if (item?.movie?.title) {
            Logger.ILog(`Found Movie: ${item.movie.title}`);
            return item.movie;
        }
        Logger.WLog(`The ${endpoint} endpoint did not recognise this title.`);
        return null;
    } catch (e) {
        Logger.ELog(`Error fetching Radarr ${endpoint} endpoint: ${e.message}`);
        return null;
    }
}

/**
 * @description Searches the Radarr queue for a movie based on the search pattern
 * @param {string} searchPattern - The search string (file or folder name)
 * @param {Object} radarr - Radarr API instance
 * @param {Function} isValid - Validates the found movie
 * @returns {Object|null} Movie object if found, or null if not found
 */
function searchInQueue(searchPattern, radarr, isValid) {
    Logger.ILog(`Searching in Queue`);

    return searchRadarrAPI('queue', searchPattern, radarr, (item, sp) => {
        return item.outputPath?.toLowerCase().includes(sp);
    }, item => isValid(item.movie, true));   // queue items are Radarr's own grabs
}

/**
 * @description Searches the Radarr download history for a movie based on the search pattern
 * @param {string} searchPattern - The search string (file or folder name)
 * @param {Object} radarr - Radarr API instance
 * @param {Function} isValid - Validates the found movie
 * @returns {Object|null} Movie object if found, or null if not found
 */
function searchInDownloadHistory(searchPattern, radarr, isValid) {
    Logger.ILog(`Searching in Download History`);

    return searchRadarrAPI('history', searchPattern, radarr, (item, sp) => {
        // guard in case the API version ignores the eventType filter
        const imported = !item.eventType || item.eventType === 'downloadFolderImported' || item.eventType === 3;
        return imported && baseName(item.data?.droppedPath) === sp;
    }, item => isValid(item.movie, !!item.downloadId),   // no downloadId = imported by path, verify title
    { eventType: 3 });   // 3 == downloadFolderImported
}

/**
 * @description Searches the Radarr grabbed history for a movie based on the search pattern
 * @param {string} searchPattern - The search string (file or folder name)
 * @param {Object} radarr - Radarr API instance
 * @param {Function} isValid - Validates the found movie
 * @returns {Object|null} Movie object if found, or null if not found
 */
function searchInGrabHistory(searchPattern, radarr, isValid) {
    Logger.ILog(`Searching in Grab History`);

    // Indexers often report release names with spaces instead of dots, so compare
    // both sides with punctuation collapsed
    const loose = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    return searchRadarrAPI('history', searchPattern, radarr, (item, sp) => {
        return item.sourceTitle && loose(item.sourceTitle) === loose(sp);
    }, item => isValid(item.movie, true), { eventType: 1 });   // 1 == grabbed
}

/**
 * @description Generic function to search Radarr API (queue or history) based on a search pattern.
 *              Every record that matches the pattern is checked with acceptItem, so a record that
 *              Radarr attached to the wrong movie is skipped instead of returned.
 * @param {string} endpoint - The Radarr API endpoint to search (queue or history)
 * @param {string} searchPattern - The search string (file or folder name)
 * @param {Object} radarr - Radarr API instance
 * @param {Function} matchFunction - A function that determines if an item matches the search pattern
 * @param {Function} acceptItem - Validates the movie attached to a matching item
 * @param {Object} [extraParams={}] - Additional query parameters for the API request
 * @returns {Object|null} Movie object if found, or null if not found
 */
function searchRadarrAPI(endpoint, searchPattern, radarr, matchFunction, acceptItem, extraParams = {}) {
    let page = 1;
    const pageSize = 1000;
    const includeMovie = 'true'
    let sp = null;

    if (!searchPattern) {
        Logger.WLog('No pattern passed in to find movie');
        return null;
    } else {
        sp = searchPattern.toLowerCase();
    }

    try {
        while (true) {
            const queryParams = buildQueryParams({ page, pageSize, includeMovie, ...extraParams });
            const json = radarr.fetchJson(endpoint, queryParams);
            const items = json?.records || [];

            if (items.length === 0) {
                Logger.WLog(`Reached the end of ${endpoint} endpoint with no match.`);
                break;
            }

            for (const item of items.filter(i => matchFunction(i, sp))) {
                Logger.ILog(`Candidate in ${endpoint}: "${item.movie?.title}" (${item.movie?.year}), movieId ${item.movie?.id ?? item.movieId}`);
                if (acceptItem(item)) {
                    Logger.ILog(`Found Movie: ${item.movie.title}`);
                    return item.movie;
                }
            }

            if (endpoint === 'queue' || items.length < pageSize) {
                Logger.WLog(`Reached the end of ${endpoint} endpoint with no match.`);
                break;
            }

            page++;
        }
    } catch (e) {
        Logger.ELog(`Error fetching Radarr ${endpoint} endpoint: ${e.message}`);
    }
    return null;
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
