import "dotenv/config"; // MUST be first

import express from "express";
import cors from "cors";
import path from "path"; // ✅ FIXED
import { uploadRouter } from "./upload";
import { generateCaptions } from "./whisper";
import { renderVideo } from "./render";

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Serve rendered videos
app.use(
  "/outputs",
  express.static(path.join(process.cwd(), "outputs"))
);

// ✅ Upload route
app.use("/upload", uploadRouter());

// ✅ Generate captions
app.post("/captions", async (req, res) => {
  const { videoPath } = req.body;

  if (!videoPath) {
    return res.status(400).json({ error: "videoPath is required" });
  }

  const captions = await generateCaptions(videoPath);
  res.json({ captions });
});

// ✅ Render final video
app.post("/render", async (req, res) => {
  const { videoPath, captions, style } = req.body;

  if (!videoPath) {
    return res.status(400).json({ error: "videoPath is required" });
  }

  const output = await renderVideo(videoPath, captions, style);
  res.json({ output });
});

app.listen(5000, () => {
  console.log("🚀 Backend running at http://localhost:5000");
});
