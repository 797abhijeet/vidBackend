import fs from "fs";
import OpenAI from "openai";
import { extractAudio } from "./ffmpeg";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120_000,
});

export async function generateCaptions(videoPath: string) {
  const audioPath = `uploads/audio-${Date.now()}.wav`;

  await extractAudio(videoPath, audioPath);

  console.log(
    "Audio size (MB):",
    (fs.statSync(audioPath).size / 1024 / 1024).toFixed(2)
  );

  for (let i = 1; i <= 3; i++) {
    try {
      console.log(`Whisper attempt ${i} started`);

      // ✅ create stream INSIDE try (new stream every attempt)
      const stream = fs.createReadStream(audioPath);

      const result = await openai.audio.transcriptions.create({
        file: stream,
        model: "gpt-4o-transcribe",
        response_format: "verbose_json",
      });

      console.log("Whisper success");

      return (
        result.segments?.map((s: any) => ({
          start: s.start,
          end: s.end,
          text: s.text,
        })) ?? []
      );
    } catch (err) {
      console.error(`Whisper attempt ${i} failed`, err);
      if (i === 3) throw err;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  return [];
}
