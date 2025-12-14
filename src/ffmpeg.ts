import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

ffmpeg.setFfmpegPath(ffmpegPath!);

export function extractAudio(
  videoPath: string,
  audioPath: string
) {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .audioChannels(1)
      .format("wav")
      .on("end", () => resolve())
      .on("error", (e:any) => reject(e))
      .save(audioPath);
  });
}
