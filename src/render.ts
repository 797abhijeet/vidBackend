import { bundle } from "@remotion/bundler";
import { getCompositions, renderMedia } from "@remotion/renderer";
import path from "path";
import fs from "fs";

let bundledServeUrl: string | null = null;

/* ---------- BASE URL HELPER ---------- */
function getBaseUrl(): string {
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  const port = process.env.PORT || "5000";
  return `http://localhost:${port}`;
}

/* ---------- RENDER FUNCTION ---------- */
export async function renderVideo({
  videoPath,
  captions,
  style,
}: {
  videoPath: string;
  captions: any[];
  style: string;
}) {
  const ROOT = process.cwd();
  const isRender = process.env.RENDER === 'true' || process.env.RENDER_EXTERNAL_URL;
  const outputDir = isRender ? path.join("/tmp", "outputs") : path.join(ROOT, "outputs");
  
  // Ensure output directory exists
  fs.mkdirSync(outputDir, { recursive: true });

  // Bundle Remotion (only once)
  if (!bundledServeUrl) {
    console.log("📦 Bundling Remotion components...");
    
    try {
      const remotionRoot = path.resolve(ROOT, "../remotion");
      const remotionEntry = path.join(remotionRoot, "src/index.ts");
      
      // Check if Remotion project exists, fallback to local
      if (!fs.existsSync(remotionEntry)) {
        console.warn("Remotion project not found, using local fallback");
        // Create a simple fallback if needed
        const fallbackDir = path.join(ROOT, "remotion-fallback");
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        bundledServeUrl = path.join(fallbackDir, "bundle.js");
      } else {
        bundledServeUrl = await bundle(
          remotionEntry,
          (progress) => {
            console.log(`Bundling: ${Math.round(progress * 100)}%`);
          },
          {
            outDir: path.join(ROOT, "remotion-bundle"),
            webpackOverride: (config) => {
              // Add any webpack overrides if needed
              return config;
            },
          }
        );
      }
      console.log("✅ Remotion bundled successfully");
    } catch (error) {
      console.error("❌ Remotion bundling failed:", error);
      throw new Error(`Remotion bundling failed: ${error}`);
    }
  }

  // Get compositions
  console.log("🎬 Getting Remotion compositions...");
  const compositions = await getCompositions(bundledServeUrl);
  const composition = compositions.find((c) => c.id === "CaptionedVideo");

  if (!composition) {
    throw new Error("'CaptionedVideo' composition not found in Remotion bundle");
  }

  // Create output path
  const outputPath = path.join(outputDir, `render-${Date.now()}.mp4`);
  
  // Convert videoPath to URL
  let videoUrl = videoPath;
  if (!videoPath.startsWith("http")) {
    const fileName = path.basename(videoPath);
    videoUrl = `${getBaseUrl()}/uploads/${fileName}`;
    
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found at: ${videoPath}`);
    }
    
    console.log(`Converted local path to URL: ${videoPath} -> ${videoUrl}`);
  }

  console.log("🎥 Rendering video with:");
  console.log(`  Video: ${videoUrl}`);
  console.log(`  Captions: ${captions.length}`);
  console.log(`  Style: ${style}`);
  console.log(`  Output: ${outputPath}`);
  console.log(`  Duration: ${composition.durationInFrames / 30}s`);

  try {
    // Render the video
    await renderMedia({
      composition,
      serveUrl: bundledServeUrl,
      codec: "h264",
      audioCodec: "aac",
      outputLocation: outputPath,
      inputProps: {
        videoPath: videoUrl,
        captions,
        style,
      },
      onProgress: ({ progress }) => {
        console.log(`Rendering: ${Math.round(progress * 100)}%`);
      },
    });

    console.log(`✅ Render completed: ${outputPath}`);
    
    // Verify file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error("Rendered video file was not created");
    }
    
    const stats = fs.statSync(outputPath);
    console.log(`📊 File size: ${(stats.size / (1024 * 1024)).toFixed(2)} MB`);

    return outputPath;
  } catch (error) {
    console.error("❌ Render failed:", error);
    
    // Clean up partial output if exists
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }
    
    throw error;
  }
}