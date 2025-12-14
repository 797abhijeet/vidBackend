import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

import { generateCaptions } from "./whisper";
import { renderVideo } from "./render";

/* ---------- FFMPEG ---------- */
if (!ffmpegPath) {
  throw new Error("FFmpeg binary not found");
}
ffmpeg.setFfmpegPath(ffmpegPath);

/* ---------- APP ---------- */
const app = express();
app.use(cors());
app.use(express.json({ limit: "100mb" })); // Increased for video uploads

// For Render deployment, use /tmp directory for file storage
const ROOT = process.cwd();
const isRender =
  process.env.RENDER === "true" || process.env.RENDER_EXTERNAL_URL;
const uploadDir = isRender
  ? path.join("/tmp", "uploads")
  : path.join(ROOT, "uploads");
const outputDir = isRender
  ? path.join("/tmp", "outputs")
  : path.join(ROOT, "outputs");

// Create directories if they don't exist

fs.mkdirSync(outputDir, { recursive: true });

/* ---------- STATIC ---------- */
app.use("/uploads", express.static(uploadDir));

/* ---------- MULTER ---------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_, file, cb) => {
      const safe = file.originalname.replace(/[^\w.-]/g, "_");
      cb(null, `safe-${Date.now()}-${safe}`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

/* ---------- BASE URL HELPER ---------- */
function getBaseUrl(): string {
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL;
  }
  const port = process.env.PORT || "5000";
  return `http://localhost:${port}`;
}

/* ---------- HEALTH CHECK ---------- */
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Captionify Backend API",
    endpoints: ["POST /upload", "POST /captions", "POST /render"],
  });
});

/* ---------- UPLOAD ---------- */
app.post("/upload", upload.single("video"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Video file required" });
  }

  try {
    const filePath = req.file.path;
    const videoUrl = `${getBaseUrl()}/uploads/${req.file.filename}`;

    console.log(
      `✅ Upload saved: ${req.file.originalname} -> ${req.file.filename}`
    );

    // Just return the saved file path, no processing
    res.json({
      success: true,
      videoPath: videoUrl,
      filename: req.file.filename,
    });
  } catch (err: any) {
    console.error("UPLOAD ERROR:", err);
    res.status(500).json({
      error: "Upload failed",
      details: err.message,
    });
  }
});

/* ---------- CAPTIONS ---------- */
app.post("/captions", async (req, res) => {
  try {
    const { videoPath } = req.body;

    if (!videoPath) {
      return res.status(400).json({ error: "videoPath is required" });
    }

    console.log(`Generating captions for: ${videoPath}`);

    // Extract filename from URL or path
    let filename = videoPath;
    if (videoPath.includes("/uploads/")) {
      filename = videoPath.split("/uploads/")[1];
    }

    const localPath = path.join(uploadDir, filename);

    if (!fs.existsSync(localPath)) {
      throw new Error(`Video file not found: ${filename}`);
    }

    const captions = await generateCaptions(localPath);

    console.log(`Generated ${captions.length} captions`);

    res.json({
      success: true,
      captions: captions,
    });
  } catch (err: any) {
    console.error("CAPTIONS ERROR:", err);
    res.status(500).json({
      error: "Caption generation failed",
      details: err.message,
    });
  }
});

/* ---------- RENDER ---------- */
/* ---------- RENDER ---------- */
app.post("/render", async (req, res) => {
  try {
    const { videoPath, captions, style = "bottom" } = req.body;

    if (!videoPath || !Array.isArray(captions)) {
      return res.status(400).json({
        error: "videoPath and captions array are required",
      });
    }

    console.log(
      `Starting render: ${captions.length} captions, style: ${style}`
    );

    // Extract filename from URL or path
    let filename = videoPath;
    if (videoPath.includes("/uploads/")) {
      filename = videoPath.split("/uploads/")[1];
    }

    const localVideoPath = path.join(uploadDir, filename);

    if (!fs.existsSync(localVideoPath)) {
      throw new Error(`Video file not found: ${filename}`);
    }

    // Call render function (modified version without output folder creation)
    const output = await renderVideo({
      videoPath: localVideoPath,
      captions,
      style,
    });

    // Since we're not using /outputs anymore, we need to serve from /uploads
    // or use a different approach
    const outputFilename = path.basename(output);
    const outputUrl = `${getBaseUrl()}/uploads/${outputFilename}`;
    console.log(`Render complete: ${outputUrl}`);

    res.json({
      success: true,
      outputUrl: outputUrl,
      filename: outputFilename,
    });
  } catch (err: any) {
    console.error("RENDER ERROR:", err);
    res.status(500).json({
      error: "Video rendering failed",
      details: err.message,
    });
  }
});

/* ---------- START SERVER ---------- */
const PORT = parseInt(process.env.PORT || "5000", 10);
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`
🚀 Captionify Backend API
📡 URL: ${getBaseUrl()}
📍 Port: ${PORT}
📁 Uploads: ${uploadDir}
📁 Outputs: ${outputDir}
⚡ Environment: ${isRender ? "Render (Cloud)" : "Local"}
  `);
});
