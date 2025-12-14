import fs from "fs";
import path from "path";
import { AssemblyAI } from "assemblyai";
import { extractAudio } from "./ffmpeg";

// Initialize AssemblyAI client
const apiKey = process.env.ASSEMBLYAI_API_KEY;
if (!apiKey) {
  throw new Error("ASSEMBLYAI_API_KEY is not set in environment variables");
}

// AssemblyAI v4 syntax
const client = new AssemblyAI({
  apiKey: apiKey,
});

export async function generateCaptions(videoPath: string) {
  const ROOT = process.cwd();
  const isRender = process.env.RENDER === 'true' || process.env.RENDER_EXTERNAL_URL;
  const uploadDir = isRender ? path.join("/tmp", "uploads") : path.join(ROOT, "uploads");
  
  console.log(`🔊 Extracting audio from: ${videoPath}`);
  
  // Generate unique audio filename
  const audioFilename = `audio-${Date.now()}.wav`;
  const audioPath = path.join(uploadDir, audioFilename);

  try {
    // Extract audio using FFmpeg
    await extractAudio(videoPath, audioPath);
    
    if (!fs.existsSync(audioPath)) {  
      throw new Error("Audio extraction failed - file not created");
    }
    
    const stats = fs.statSync(audioPath);
    console.log(`✅ Audio extracted: ${audioFilename} (${(stats.size / 1024).toFixed(2)} KB)`);

    // Transcribe with AssemblyAI v4
    console.log("🤖 Transcribing audio with AssemblyAI...");
    
    // For AssemblyAI v4, we need to use different approach
    const fileData = fs.readFileSync(audioPath);
    
    const transcript = await client.transcripts.transcribe({
      audio: fileData,  // Pass buffer instead of stream
      punctuate: true,
      format_text: true,
      // word_boost parameter changed in v4
      word_boost: ["caption", "subtitles", "video", "audio"],
      boost_param: "high",
      speaker_labels: false,  // Add this to avoid errors
    });

    // Clean up audio file
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
      console.log("🧹 Cleaned up temporary audio file");
    }

    if (transcript.status === "error") {
      console.error("AssemblyAI Error:", transcript.error);
      throw new Error(`Transcription failed: ${transcript.error}`);
    }

    // Check if words exist (v4 might have different structure)
    if (!transcript.words || transcript.words.length === 0) {
      // Try alternative property names
      const alternativeWords = (transcript as any).utterances?.flatMap((u: any) => u.words) || [];
      if (alternativeWords.length === 0) {
        console.warn("No words found in transcript");
        return [];
      }
      // Use alternative words
      const captions = alternativeWords.map((w: any) => ({
        start: w.start / 1000,
        end: w.end / 1000,
        text: w.text,
      }));
      console.log(`📝 Generated ${captions.length} caption segments from utterances`);
      return captions;
    }

    // Convert milliseconds to seconds and format captions
    const captions = transcript.words.map((w: any) => ({
      start: w.start / 1000,
      end: w.end / 1000,
      text: w.text,
    }));

    console.log(`📝 Generated ${captions.length} caption segments`);
    
    // Log first few captions for debugging
    if (captions.length > 0) {
      console.log("Sample captions:");
      captions.slice(0, 3).forEach((cap, i) => {
        console.log(`  ${i + 1}. [${cap.start.toFixed(2)}-${cap.end.toFixed(2)}s] ${cap.text}`);
      });
    }

    return captions;
  } catch (error: any) {
    console.error("❌ Caption generation failed:", error);
    
    // Clean up audio file if it exists
    if (fs.existsSync(audioPath)) {
      try {
        fs.unlinkSync(audioPath);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }
    
    throw new Error(`Caption generation failed: ${error.message}`);
  }
}