import express from "express";
import multer from "multer";
import path from "path";

const router = express.Router();

const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
});

router.post("/", upload.single("video"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.resolve(req.file.path);

    console.log("✅ Video uploaded:", filePath);

    res.json({
      path: filePath,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

export const uploadRouter = () => router;
