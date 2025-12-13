import ffmpeg from "fluent-ffmpeg";

export function extractAudio(
  videoPath: string,
  audioPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec("pcm_s16le")
      .audioFrequency(16000) // reduce size
      .audioChannels(1)      // mono
      .format("wav")
      .save(audioPath)
      .on("end", () => {
        resolve(); // ✅ wrap resolve
      })
      .on("error", (err: any) => {
        reject(err);
      });
  });
}
