/**
 * @author reven 
 * @uid 8cdce0bf-abf9-4ed0-8d95-93db86c3fb58
 * @description Checks if a file is newer than the specified days 
 * @help Checks if a file is newer than the specified days and if it is will output 1, else will call output 2.
 * @revision 2
 * @param {int} Days The number of days to check how old the file is 
 * @param {bool} UseLastWriteTime If the last write time should be used, otherwise the creation time will be 
 * @output The file is newer than the days specified 
 * @output the file is not newer than the days specified
 */
function Script(Days, UseLastWriteTime)
{
	var fi = FileInfo(Flow.WorkingFile); 
	let date = UseLastWriteTime ? fi.LastWriteTime : fi.CreationTime;
    
    // time difference 
    let timeDiff = new Date().getTime() - date;
    // convert that time to number of days 
    let dayDiff = Math.round(timeDiff / (1000 * 3600 * 24));
    
    Logger.ILog(`File is ${dayDiff} days old`);
    
	return dayDiff > Days ? 2 : 1;
}