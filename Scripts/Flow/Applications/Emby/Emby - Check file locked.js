/**
 * @name Emby - Check file locked
 * @uid e5170bb3-136d-4f46-a17d-51da594cb636
 * @description Check current/active Emby sessions to see if input file is being played/used. URI and ApiKey can be set via variables or input parameters.
 * @author https://github.com/nkm8
 * @revision 1
 * @param {string} URI Emby root URI and port (e.g. http://emby:8686)
 * @param {string} ApiKey API key
 * @output File unused/available
 * @output File used/unavailable
 */
function Script(URI, ApiKey) {
  URI = URI || Variables['Emby.URI'];
  ApiKey = ApiKey || Variables['Emby.ApiKey'];

  let myEmby = new Emby(URI, ApiKey);
  if (myEmby.checkFile(Variables.file.Orig.FullName)) {
    return 1;
  } else {
    return 2;
  } 
}

class Emby {
  constructor(URI, ApiKey) {
    if (!URI || !ApiKey) {
      return Flow.Fail("No credentials specified"); 
    }

    this.URI = URI;
    this.ApiKey = ApiKey;
  }

  checkFile(path) {
    // this endpoint isn't in the public REST API docs, but if you navigate to the Emby server management dashboard, there is an 'API' hyperlink
    // follow this link to the full Swagger docs where you can see the expected input/output for the SessionService
    let endpoint = `${this.URI}/emby/Sessions?api_key=${this.ApiKey}&IsPlaying=true`;

    Logger.ILog(`File to check if in use: ${path}`);
    let response = http.GetAsync(endpoint).Result;
    let result = true;

    if (response.IsSuccessStatusCode) {
      let jsonData = response.Content.ReadAsStringAsync().Result;
      let responseData = JSON.parse(jsonData);
      Logger.ILog(responseData);

      // Iterate through sessions to find the playing item's path
      responseData.forEach(session => {
        if (session.NowPlayingItem && session.NowPlayingItem.Path) {
            Logger.ILog(`Emby Playing File Path: ${session.NowPlayingItem.Path}`);
            if (session.NowPlayingItem.Path == path) {
              Logger.ILog('Matched playing file!');
              result = false;
            }
        }
      });
      Logger.ILog(`checkFile evaluated result: ${result}`);
      return result;
    } else {
      let error = response.Content.ReadAsStringAsync().Result;
      Logger.WLog("API error: " + error);
      Flow.Fail("API error")
      return false; // we don't know, so assume file is in use
    }
  }
}
