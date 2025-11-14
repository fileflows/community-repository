/**
 * @description Checks if a video file's audio bitrate matches an input kbps.
 * @help Enter a Kbps number below. Select which audio tracks you want to test with the dropdown. Select the operand to use in the test. If you selected "Specified track" enter the Audio track in the Input Audio Track box.
 * @author hag
 * @uid 7fedd272-ebbc-47e2-8140-dcb23aa90661
 * @revision 4
 * @param {int} InputBitrateKbps Kbps input value. Integers only.
 * @param {('Any'|'All'|'Specified track')} TracksAnalysed Which track(s) of audio in the video file to test.
 * @param {('Equals'|'Greater Than'|'Less Than'|'Greater Than or Equal To'|'Less Than or Equal To'|'Not Equals')} Operand The operand to use in the test.
 * @param {int} InputAudioTrack The audio track you wish to analyse if you selected "Specified track" in Tracks Analysed. Starting at 1 (First audio track). If left at 0 the script will assume you mean the first track.
 * @output File's audio bitrate matches
 * @output File's audio bitrate does not match
 * @output No audio in file or at the track # specified.
 */
function Script(InputBitrateKbps, TracksAnalysed, Operand, InputAudioTrack)
 {
	// pre reqs 
	if (Variables["InputBitrateKbps"]) {
        InputBitrateKbps = Variables["InputBitrateKbps"];
    }
	if (Variables["TracksAnalysed"]) {
        TracksAnalysed = Variables["TracksAnalysed"];
    }
	if (Variables["Operand"]) {
        Operand = Variables["Operand"];
    }
	if (Variables["InputAudioTrack"]) {
        InputAudioTrack = Variables["InputAudioTrack"];
    }
	if (InputAudioTrack == 0) {
			Logger.ILog('Input audio track to analyse set to 1 (First track) as the input was left at 0.');
			InputAudioTrack += 1
		}
	
	// get total amount of audio streams in the video
    let length = Variables?.FfmpegBuilderModel?.AudioStreams?.length;
	
	// check if theres no audio streams
	if(!length)
    {
        Logger.ILog('No audio streams found!');
        return 3;
    }

	// check the track that was selected, if specifing an audio stream, exists.
	if (TracksAnalysed == "Specified track" && length < InputAudioTrack) {
			Logger.ILog('Audio stream: ' + InputAudioTrack + ' not found!');
			return 3
	}
	
    Logger.ILog('Found audio streams: ' + length);
    let INPUT_BITRATE = InputBitrateKbps * 1000;
	Logger.ILog('Input bitrate set to: ' + INPUT_BITRATE);
	if (TracksAnalysed == "Specified track") {
			let ai = InputAudioTrack - 1;
			Logger.ILog('Input audio track to analyse set to: ' + InputAudioTrack + ' This is track at index ' +  ai + 'as ffmpeg builder model counts from 0.');
	}
	

	if(Operand == "Equals") {
			Logger.ILog('Operand set to Equals');
			if(TracksAnalysed.includes("Any")) {
				Logger.ILog('Analysing if any audio track is equal to the input bitrate: ' + INPUT_BITRATE);
				for(let i=0;i<length;i++)
				{
					let as = Variables.FfmpegBuilderModel.AudioStreams[i];
					Logger.ILog('Audio stream ' + i + ' has a bitrate of: ' + as.Stream.Bitrate);
					if(as.Stream.Bitrate == INPUT_BITRATE) {
						Logger.ILog('Audio stream ' + i + ' has a bitrate equal to the input bitrate: ' + INPUT_BITRATE);
						return 1;
					}
				}
			} else if(TracksAnalysed.includes("All")) {
				Logger.ILog('Analysing if all audio tracks are equal to the input bitrate: ' + INPUT_BITRATE);
				let StreamsAboveMax = 0;
				for(let i=0;i<length;i++)
				{
					let as = Variables.FfmpegBuilderModel.AudioStreams[i];
					Logger.ILog('Audio stream ' + i + ' has a bitrate of: ' + as.Stream.Bitrate);
					if(as.Stream.Bitrate == INPUT_BITRATE) {
						Logger.ILog('Audio stream ' + i + ' has a bitrate equal to the input bitrate: ' + INPUT_BITRATE);
						StreamsAboveMax += 1;
					} else {
						Logger.ILog('Audio stream ' + i + ' does not have a bitrate equal to the input bitrate: ' + INPUT_BITRATE);
					}
				}
				if(StreamsAboveMax == length) {
					Logger.ILog('All of the audio streams has a bitrate equal to the input bitrate: ' + INPUT_BITRATE);
					return 1;
				} else {
					Logger.ILog('NOT All of the audio streams has a bitrate equal to the input bitrate: ' + INPUT_BITRATE);
					return 2;
				}
			} else if(TracksAnalysed.includes("Specified track")) {
				let ai = InputAudioTrack - 1;
				Logger.ILog('Analysing if audio track at index: ' + ai + ' is equal to the input bitrate: ' + INPUT_BITRATE);
				let as = Variables.FfmpegBuilderModel.AudioStreams[ai];
				Logger.ILog('Audio stream ' + ai + ' has a bitrate of: ' + as.Stream.Bitrate);
				if(as.Stream.Bitrate == INPUT_BITRATE) {
					Logger.ILog('Audio stream ' + ai + ' has a bitrate equal to the input bitrate: ' + INPUT_BITRATE);
					return 1; 
				}
			}
			
			return 2;


		} else if(Operand == "Greater Than") {
			Logger.ILog('Operand set to Greater Than');
			if(TracksAnalysed.includes("Any")) {
				Logger.ILog('Analysing if any audio track is above the input bitrate: ' + INPUT_BITRATE);
				for(let i=0;i<length;i++)
				{
					let as = Variables.FfmpegBuilderModel.AudioStreams[i];
					Logger.ILog('Audio stream ' + i + ' has a bitrate of: ' + as.Stream.Bitrate);
					if(as.Stream.Bitrate > INPUT_BITRATE) {
						Logger.ILog('Audio stream ' + i + ' has a bitrate larger than the input bitrate: ' + INPUT_BITRATE);
						return 1;
					}
				}
			} else if(TracksAnalysed.includes("All")) {
				Logger.ILog('Analysing if all audio tracks are above the input bitrate: ' + INPUT_BITRATE);
				let StreamsAboveMax = 0;
				for(let i=0;i<length;i++)
				{
					let as = Variables.FfmpegBuilderModel.AudioStreams[i];
					Logger.ILog('Audio stream ' + i + ' has a bitrate of: ' + as.Stream.Bitrate);
					if(as.Stream.Bitrate > INPUT_BITRATE) {
						Logger.ILog('Audio stream ' + i + ' has a bitrate larger than the input bitrate: ' + INPUT_BITRATE);
						StreamsAboveMax += 1;
					} else {
						Logger.ILog('Audio stream ' + i + ' does not have a bitrate larger than the input bitrate: ' + INPUT_BITRATE);
					}
				}
				if(StreamsAboveMax == length) {
					Logger.ILog('All of the audio streams has a bitrate larger than the input bitrate: ' + INPUT_BITRATE);
					return 1;
				} else {
					Logger.ILog('NOT All of the audio streams has a bitrate larger than the input bitrate: ' + INPUT_BITRATE);
					return 2;
				}
			} else if(TracksAnalysed.includes("Specified track")) {
				let ai = InputAudioTrack - 1;
				Logger.ILog('Analysing if audio track at index: ' + ai + ' is greater than the input bitrate: ' + INPUT_BITRATE);
				let as = Variables.FfmpegBuilderModel.AudioStreams[ai];
				Logger.ILog('Audio stream ' + ai + ' has a bitrate of: ' + as.Stream.Bitrate);
				if(as.Stream.Bitrate > INPUT_BITRATE) {
					Logger.ILog('Audio stream ' + ai + ' has a bitrate greater than the input bitrate: ' + INPUT_BITRATE);
					return 1; 
				}
			}
			
			return 2;


		} else if(Operand == "Less Than") {
			Logger.ILog('Operand set to Less Than');
			if(TracksAnalysed.includes("Any")) {
				Logger.ILog('Analysing if any audio track is less than the input bitrate: ' + INPUT_BITRATE);
				for(let i=0;i<length;i++)
				{
					let as = Variables.FfmpegBuilderModel.AudioStreams[i];
					Logger.ILog('Audio stream ' + i + ' has a bitrate of: ' + as.Stream.Bitrate);
					if(as.Stream.Bitrate < INPUT_BITRATE) {
						Logger.ILog('Audio stream ' + i + ' has a bitrate less than the input bitrate: ' + INPUT_BITRATE);
						return 1;
					}
				}
			} else if(TracksAnalysed.includes("All")) {
				Logger.ILog('Analysing if all audio tracks are less than input bitrate: ' + INPUT_BITRATE);
				let StreamsAboveMax = 0;
				for(let i=0;i<length;i++)
				{
					let as = Variables.FfmpegBuilderModel.AudioStreams[i];
					Logger.ILog('Audio stream ' + i + ' has a bitrate of: ' + as.Stream.Bitrate);
					if(as.Stream.Bitrate < INPUT_BITRATE) {
						Logger.ILog('Audio stream ' + i + ' has a bitrate less than the input bitrate: ' + INPUT_BITRATE);
						StreamsAboveMax += 1;
					} else {
						Logger.ILog('Audio stream ' + i + ' does not have a bitrate less than the input bitrate: ' + INPUT_BITRATE);
					}
				}
				if(StreamsAboveMax == length) {
					Logger.ILog('All of the audio streams has a bitrate less than the input bitrate: ' + INPUT_BITRATE);
					return 1;
				} else {
					Logger.ILog('NOT All of the audio streams has a bitrate less than the input bitrate: ' + INPUT_BITRATE);
					return 2;
				}
			} else if(TracksAnalysed.includes("Specified track")) {
				let ai = InputAudioTrack - 1;
				Logger.ILog('Analysing if audio track at index: ' + ai + ' is less than the input bitrate: ' + INPUT_BITRATE);				
				let as = Variables.FfmpegBuilderModel.AudioStreams[ai];
				Logger.ILog('Audio stream ' + ai + ' has a bitrate of: ' + as.Stream.Bitrate);
				if(as.Stream.Bitrate < INPUT_BITRATE) {
					Logger.ILog('Audio stream ' + ai + ' has a bitrate less than the input bitrate: ' + INPUT_BITRATE);
					return 1; 
				}
			}
			
			return 2;


		} else if(Operand == "Greater Than or Equal To") {
			Logger.ILog('Operand set to Greater Than or Equal To');
			if(TracksAnalysed.includes("Any")) {
				Logger.ILog('Analysing if any audio track is Greater Than or Equal To the input bitrate: ' + INPUT_BITRATE);
				for(let i=0;i<length;i++)
				{
					let as = Variables.FfmpegBuilderModel.AudioStreams[i];
					Logger.ILog('Audio stream ' + i + ' has a bitrate of: ' + as.Stream.Bitrate);
					if(as.Stream.Bitrate >= INPUT_BITRATE) {
						Logger.ILog('Audio stream ' + i + ' has a bitrate Greater Than or Equal To the input bitrate: ' + INPUT_BITRATE);
						return 1;
					}
				}
			} else if(TracksAnalysed.includes("All")) {
				Logger.ILog('Analysing if all audio tracks are Greater Than or Equal To input bitrate: ' + INPUT_BITRATE);
				let StreamsAboveMax = 0;
				for(let i=0;i<length;i++)
				{
					let as = Variables.FfmpegBuilderModel.AudioStreams[i];
					Logger.ILog('Audio stream ' + i + ' has a bitrate of: ' + as.Stream.Bitrate);
					if(as.Stream.Bitrate >= INPUT_BITRATE) {
						Logger.ILog('Audio stream ' + i + ' has a bitrate Greater Than or Equal To the input bitrate: ' + INPUT_BITRATE);
						StreamsAboveMax += 1;
					} else {
						Logger.ILog('Audio stream ' + i + ' does not have a bitrate Greater Than or Equal To the input bitrate: ' + INPUT_BITRATE);
					}
				}
				if(StreamsAboveMax == length) {
					Logger.ILog('All of the audio streams has a bitrate Greater Than or Equal To the input bitrate: ' + INPUT_BITRATE);
					return 1;
				} else {
					Logger.ILog('NOT All of the audio streams has a bitrate Greater Than or Equal To the input bitrate: ' + INPUT_BITRATE);
					return 2;
				}
			} else if(TracksAnalysed.includes("Specified track")) {
				let ai = InputAudioTrack - 1;
				Logger.ILog('Analysing if audio track at index: ' + ai + ' is Greater Than or Equal To the input bitrate: ' + INPUT_BITRATE);				
				let as = Variables.FfmpegBuilderModel.AudioStreams[ai];
				Logger.ILog('Audio stream ' + ai + ' has a bitrate of: ' + as.Stream.Bitrate);
				if(as.Stream.Bitrate >= INPUT_BITRATE) {
					Logger.ILog('Audio stream ' + ai + ' has a bitrate Greater Than or Equal To the input bitrate: ' + INPUT_BITRATE);
					return 1; 
				}
			}
			
			return 2;


		} else if(Operand == "Less Than or Equal To") {
			Logger.ILog('Operand set to Less Than or Equal To');
			if(TracksAnalysed.includes("Any")) {
				Logger.ILog('Analysing if any audio track is Less Than or Equal To the input bitrate: ' + INPUT_BITRATE);
				for(let i=0;i<length;i++)
				{
					let as = Variables.FfmpegBuilderModel.AudioStreams[i];
					Logger.ILog('Audio stream ' + i + ' has a bitrate of: ' + as.Stream.Bitrate);
					if(as.Stream.Bitrate <= INPUT_BITRATE) {
						Logger.ILog('Audio stream ' + i + ' has a bitrate Less Than or Equal To the input bitrate: ' + INPUT_BITRATE);
						return 1;
				}
				}
			} else if(TracksAnalysed.includes("All")) {
				Logger.ILog('Analysing if all audio tracks are Less Than or Equal To input bitrate: ' + INPUT_BITRATE);
				let StreamsAboveMax = 0;
				for(let i=0;i<length;i++)
				{
					let as = Variables.FfmpegBuilderModel.AudioStreams[i];
					Logger.ILog('Audio stream ' + i + ' has a bitrate of: ' + as.Stream.Bitrate);
					if(as.Stream.Bitrate <= INPUT_BITRATE) {
						Logger.ILog('Audio stream ' + i + ' has a bitrate Less Than or Equal To the input bitrate: ' + INPUT_BITRATE);
						StreamsAboveMax += 1;
					} else {
						Logger.ILog('Audio stream ' + i + ' does not have a bitrate Less Than or Equal To the input bitrate: ' + INPUT_BITRATE);
					}
				}
				if(StreamsAboveMax == length) {
					Logger.ILog('All of the audio streams has a bitrate Less Than or Equal To the input bitrate: ' + INPUT_BITRATE);
					return 1;
				} else {
					Logger.ILog('NOT All of the audio streams has a bitrate Less Than or Equal To the input bitrate: ' + INPUT_BITRATE);
					return 2;
				}
			} else if(TracksAnalysed.includes("Specified track")) {
				let ai = InputAudioTrack - 1;
				Logger.ILog('Analysing if audio track at index: ' + ai + ' is Less Than or Equal To the input bitrate: ' + INPUT_BITRATE);
				let as = Variables.FfmpegBuilderModel.AudioStreams[ai];
				Logger.ILog('Audio stream ' + ai + ' has a bitrate of: ' + as.Stream.Bitrate);
				if(as.Stream.Bitrate <= INPUT_BITRATE) {
					Logger.ILog('Audio stream ' + ai + ' has a bitrate Less Than or Equal To the input bitrate: ' + INPUT_BITRATE);
					return 1; 
				}
			}
			
			return 2;


		} else if(Operand == "Not Equals") {
			Logger.ILog('Operand set to Not Equals');
			if(TracksAnalysed.includes("Any")) {
				Logger.ILog('Analysing if any audio track is Not Equal To the input bitrate: ' + INPUT_BITRATE);
				for(let i=0;i<length;i++)
				{
					let as = Variables.FfmpegBuilderModel.AudioStreams[i];
					Logger.ILog('Audio stream ' + i + ' has a bitrate of: ' + as.Stream.Bitrate);
					if(as.Stream.Bitrate != INPUT_BITRATE) {
						Logger.ILog('Audio stream ' + i + ' does not have a bitrate of: ' + INPUT_BITRATE);
						return 1;
				}
				}
			} else if(TracksAnalysed.includes("All")) {
				Logger.ILog('Analysing if all audio tracks are Not Equal To input bitrate: ' + INPUT_BITRATE);
				let StreamsAboveMax = 0;
				for(let i=0;i<length;i++)
				{
					let as = Variables.FfmpegBuilderModel.AudioStreams[i];
					Logger.ILog('Audio stream ' + i + ' has a bitrate of: ' + as.Stream.Bitrate);
					if(as.Stream.Bitrate != INPUT_BITRATE) {
						Logger.ILog('Audio stream ' + i + ' does not have bitrate: ' + INPUT_BITRATE);
						StreamsAboveMax += 1;
					} else {
						Logger.ILog('Audio stream ' + i + ' is a bitrate equal to the input bitrate: ' + INPUT_BITRATE);
					}
				}
				if(StreamsAboveMax == length) {
					Logger.ILog('All of the audio streams bitrates do not equal the input bitrate: ' + INPUT_BITRATE);
					return 1;
				} else {
					Logger.ILog('One or more of the audio streams has a bitrate equal to the input bitrate: ' + INPUT_BITRATE);
					return 2;
				}
			} else if(TracksAnalysed.includes("Specified track")) {
				let ai = InputAudioTrack - 1;
				Logger.ILog('Analysing if audio track at index: ' + ai + ' is Not Equal To the input bitrate: ' + INPUT_BITRATE);
				let as = Variables.FfmpegBuilderModel.AudioStreams[ai];
				Logger.ILog('Audio stream ' + ai + ' has a bitrate of: ' + as.Stream.Bitrate);
				if(as.Stream.Bitrate != INPUT_BITRATE) {
					Logger.ILog('Audio stream ' + ai + ' has a bitrate Not Equal To the input bitrate: ' + INPUT_BITRATE);
					return 1; 
				}
			}
			
			return 2;
		}
		
		return -1;
		
	}
