import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import path from "path";
import fs from "fs";

let bundledServeUrl: string | null = null;

export async function renderVideo({
  videoPath,
  captions,
  style,
}: {
  videoPath: string;
  captions: any[];
  style: string;
}) {
  // 🔥 BUNDLE ONLY ONCE
  bundledServeUrl = await bundle(
    path.resolve(__dirname, "../../remotion/src/index.ts"),
    (progress) => {
      console.log(`Bundling: ${Math.round(progress * 100)}%`);
    },
    {
      outDir: path.resolve("remotion-bundle"),
    }
  );

  const compositions = await getCompositions(bundledServeUrl);
  const composition = compositions.find((c) => c.id === "CaptionedVideo");

  if (!composition) {
    throw new Error("Composition not found");
  }

  const outputPath = path.resolve("outputs", `render-${Date.now()}.mp4`);
  
  // 🔥 CRITICAL FIX: Convert videoPath to URL
  // Check if videoPath is already a URL
  let videoUrl = videoPath;
  
  if (!videoPath.startsWith('http')) {
    // It's a local path, convert to URL
    // Extract filename from path
    const fileName = path.basename(videoPath);
    videoUrl = `http://localhost:5000/uploads/${fileName}`;
    
    // Verify file exists locally
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found at: ${videoPath}`);
    }
    
    console.log(`Converted local path to URL: ${videoPath} -> ${videoUrl}`);
  }

  console.log("Rendering with:");
  console.log("- Video URL:", videoUrl);
  console.log("- Captions count:", captions.length);
  console.log("- Style:", style);
  console.log("- Output path:", outputPath);

  await renderMedia({
    composition,
    serveUrl: bundledServeUrl,
    codec: "h264",
    audioCodec: "aac",
    outputLocation: outputPath,
    inputProps: {
      videoPath: videoUrl, // Pass URL, not local path
      captions,
      style,
    },
  });

  console.log("Render completed:", outputPath);
  return outputPath;
}