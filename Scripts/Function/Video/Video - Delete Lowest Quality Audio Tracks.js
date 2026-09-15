/**
 * @description Attempts to remove all but the highest quality audio stream for each language, determined by which audio stream(s) have the highest bitrate and channel count. Pair with "Video - Delete Non-Original Language Audio" to completely clean extra audio streams.
 * @author aStonePenguin
 * @revision 1
 * @output Audio stream(s) were deleted
 * @output No audio streams were deleted
 * @output Unable to determine highest quality streams
 */
function Script()
{
	let model = Variables.FfmpegBuilderModel;

	if(!model)
	{
		Logger.ELog('FFMPEG Builder variable not found');
		return -1;
	}

	if(!model.AudioStreams || model.AudioStreams.length === 0)
	{
		Logger.ELog('No audio streams found in this file');
		return -1;
	}

	let audioStreams = model.AudioStreams;
	let alreadyDeletedCount = audioStreams.filter(s => s.Deleted === true).length;
	let activeCount = audioStreams.length - alreadyDeletedCount;

	// Group audio streams by language
	let byLanguage = {};

	for (let i = 0; i < audioStreams.length; i++)
	{
		let stream = audioStreams[i];

		if (stream.Deleted === true)
			continue;

		let lang = (stream.Language || 'und').toLowerCase();
		if (!byLanguage[lang])
			byLanguage[lang] = [];

		byLanguage[lang].push(stream);
	}

	let languages = Object.keys(byLanguage);
	let markedCount = 0;

	for (let l = 0; l < languages.length; l++)
	{
		let lang = languages[l];
		let streams = byLanguage[lang];

		// Only one track for this language, nothing to compare
		if (streams.length <= 1)
			continue;

		// Make sure every stream has a usable bitrate before comparing
		let missingBitrate = streams.find(s => !s.Stream.Bitrate);
		if (missingBitrate)
		{
			Logger.WLog(`Unable to determine bitrate for audio stream # ${missingBitrate.Index} (language '${lang}')`);
			return 3;
		}

		// Make sure every stream has a usable channel count before comparing
		let missingChannels = streams.find(s => !s.Stream.Channels);
		if (missingChannels)
		{
			Logger.WLog(`Unable to determine channel count for audio stream # ${missingChannels.Index} (language '${lang}')`);
			return 3;
		}

		let maxBitrate = Math.max(...streams.map(s => s.Stream.Bitrate));
		let maxChannels = Math.max(...streams.map(s => s.Stream.Channels));

		let bitrateLeaders = streams.filter(s => s.Stream.Bitrate === maxBitrate);

		// Shouldn't happen, probably a duplicate if it does, fail anyway
		if (bitrateLeaders.length > 1)
		{
			Logger.WLog(`Multiple audio streams tied for highest bitrate for language '${lang}', unable to determine best audio stream`);
			return 3;
		}

		let best = bitrateLeaders[0];

		// The highest bitrate track must also be the highest channel count, which it should in theory always be
		if (best.Stream.Channels !== maxChannels)
		{
			Logger.WLog(`Highest audio stream ${best.Index} does not have the highest channel count for language '${lang}', unable to determine best audio stream`);
			return 3;
		}

		// Mark every other track in this language group for deletion
		for (let i = 0; i < streams.length; i++)
		{
			if (streams[i] !== best)
			{
				streams[i].Deleted = true;
				markedCount++;
				Logger.ILog(`Marking audio stream ${streams[i].Index} (language '${lang}', bitrate=${streams[i].Stream.Bitrate}, channels=${streams[i].Stream.Channels}) for deletion`);
			}
		}

		Logger.ILog(`Keeping audio stream ${best.Index} as best for language '${lang}' (bitrate=${best.Stream.Bitrate}, channels=${best.Stream.Channels})`);
	}

	if (markedCount === 0)
	{
		Logger.ILog('No duplicate audio streams found, nothing to remove');
		return 2;
	}

	Logger.ILog(`Marked ${markedCount}/${activeCount} un-marked audio streams for deletion`);

	return 1;
}
