import fs from "fs";
import path from "path";
import { AssemblyAI } from "assemblyai";
import { extractAudio } from "./ffmpeg";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

export async function generateCaptions(videoPath: string) {
  const audioPath = path.join(
    "uploads",
    `audio-${Date.now()}.wav`
  );

  await extractAudio(videoPath, audioPath);

  const transcript = await client.transcripts.transcribe({
    audio: fs.createReadStream(audioPath),
    punctuate: true,
    format_text: true,
  });

  if (transcript.status === "error") {
    throw new Error(transcript.error);
  }

  return (
    transcript.words?.map((w) => ({
      start: w.start / 1000,
      end: w.end / 1000,
      text: w.text,
    })) ?? []
  );
}
