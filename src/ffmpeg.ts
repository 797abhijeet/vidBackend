import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

// Set FFmpeg path
if (!ffmpegPath) {
  throw new Error("FFmpeg binary not found. Install ffmpeg-static or system FFmpeg.");
}
ffmpeg.setFfmpegPath(ffmpegPath);

export function extractAudio(
  videoPath: string,
  audioPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🎵 Extracting audio: ${videoPath} -> ${audioPath}`);
    
    ffmpeg(videoPath)
      .noVideo()
      .audioCodec("pcm_s16le")
      .audioFrequency(16000)
      .audioChannels(1)
      .format("wav")
      .on("start", (commandLine) => {
        console.log("FFmpeg command:", commandLine);
      })
      .on("end", () => {
        console.log("✅ Audio extraction complete");
        resolve();
      })
      .on("error", (err: any) => {
        console.error("❌ Audio extraction error:", err);
        reject(new Error(`Audio extraction failed: ${err.message}`));
      })
      .save(audioPath);
  });
}

export function getVideoInfo(videoPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err: any, metadata: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
}