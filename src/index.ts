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
app.use(express.json({ limit: "50mb" }));

const ROOT = process.cwd();
const uploadDir = path.join(ROOT, "uploads");
const outputDir = path.join(ROOT, "outputs");

fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

/* ---------- STATIC ---------- */
app.use("/uploads", express.static(uploadDir));
app.use("/outputs", express.static(outputDir));

/* ---------- MULTER ---------- */
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_, file, cb) => {
      const safe = file.originalname.replace(/[^\w.-]/g, "_");
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
});

/* ---------- HELPERS ---------- */
function normalizePath(p: string) {
  return p.replace(/\\/g, "/");
}

function urlToLocalPath(videoPath: string): string {
  if (videoPath.startsWith("http")) {
    const u = new URL(videoPath);
    return path.join(ROOT, decodeURIComponent(u.pathname));
  }

  if (videoPath.startsWith("/uploads")) {
    return path.join(ROOT, videoPath.slice(1));
  }

  return videoPath;
}

/* ---------- UPLOAD + NORMALIZE ---------- */
app.post("/upload", upload.single("video"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Video required" });
  }

  const inputPath = req.file.path;
  const outputName = `safe-${Date.now()}.mp4`;
  const outputPath = path.join(uploadDir, outputName);

  try {
    await new Promise<void>((resolve, reject) => {
      // In your /upload endpoint, update FFmpeg command:
      ffmpeg(inputPath)
        .videoCodec("libx264")
        .audioCodec("copy") // Keep original audio codec instead of re-encoding
        .outputOptions([
          "-pix_fmt yuv420p",
          "-movflags faststart",
          "-r 30",
          "-avoid_negative_ts make_zero", // Prevent timestamp issues
        ])
        .on("end", () => resolve())
        .on("error", (err: any) => reject(err))
        .save(outputPath);
    });

    if (!fs.existsSync(outputPath)) {
      throw new Error("FFmpeg output file not created");
    }

    fs.unlinkSync(inputPath);

    res.json({
      videoPath: `http://localhost:5000/uploads/${outputName}`,
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    if (fs.existsSync(inputPath)) {
      console.warn("Keeping original file:", inputPath);
    }
    res.status(500).json({ error: "Video processing failed" });
  }
});

/* ---------- CAPTIONS ---------- */
app.post("/captions", async (req, res) => {
  try {
    const localPath = normalizePath(urlToLocalPath(req.body.videoPath));

    if (!fs.existsSync(localPath)) {
      throw new Error("Video file not found on server");
    }

    const captions = await generateCaptions(localPath);
    res.json({ captions });
  } catch (err: any) {
    console.error("CAPTIONS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- RENDER ---------- */
app.post("/render", async (req, res) => {
  try {
    const { videoPath, captions, style } = req.body;

    if (!videoPath || !Array.isArray(captions)) {
      return res.status(400).json({
        error: "Invalid render payload",
      });
    }

    const localVideoPath = normalizePath(urlToLocalPath(videoPath));

    if (!fs.existsSync(localVideoPath)) {
      // Try to find the file in uploads directory
      const fileName = path.basename(videoPath);
      const altPath = path.join(uploadDir, fileName);

      if (fs.existsSync(altPath)) {
        console.log(`Found video at alternative path: ${altPath}`);
        const output = await renderVideo({
          videoPath: altPath, // Pass local path to renderVideo
          captions,
          style,
        });

        res.json({
          outputUrl: `/outputs/${path.basename(output)}`,
        });
      } else {
        throw new Error(`Video file not found: ${localVideoPath}`);
      }
    } else {
      const output = await renderVideo({
        videoPath: localVideoPath,
        captions,
        style,
      });

      res.json({
        outputUrl: `/outputs/${path.basename(output)}`,
      });
    }
  } catch (err: any) {
    console.error("RENDER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- START ---------- */
app.listen(5000, () => {
  console.log("🚀 Backend running at http://localhost:5000");
});
