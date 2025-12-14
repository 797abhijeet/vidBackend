// REMOVE THESE LINES (lines 1-10):
// declare module "fluent-ffmpeg" {
//   const ffmpeg: any;
//   export default ffmpeg;
// }

// KEEP EVERYTHING ELSE:
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
      .audioFrequency(16000)  // AssemblyAI recommended frequency
      .audioChannels(1)       // Mono audio
      .format("wav")
      .on("start", (commandLine) => {
        console.log("FFmpeg command:", commandLine);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`Audio extraction: ${Math.floor(progress.percent)}%`);
        }
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

// Additional FFmpeg utilities
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

export function convertVideo(
  inputPath: string,
  outputPath: string,
  options: any = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .videoCodec(options.videoCodec || "libx264")
      .audioCodec(options.audioCodec || "aac")
      .outputOptions(options.outputOptions || [
        "-pix_fmt yuv420p",
        "-movflags faststart",
      ]);

    if (options.width && options.height) {
      command.size(`${options.width}x${options.height}`);
    }

    command
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });
}