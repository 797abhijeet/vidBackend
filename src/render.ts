import { renderMedia, getCompositions } from "@remotion/renderer";
import path from "path";

export async function renderVideo(
  videoPath: string,
  captions: any[],
  style: "top" | "bottom"
) {
  const serveUrl = "http://localhost:3000";

  // 1️⃣ Fetch compositions from running frontend
  const compositions = await getCompositions(serveUrl);

  // 2️⃣ Find the required composition
  const composition = compositions.find(
    (c) => c.id === "CaptionedVideo"
  );

  if (!composition) {
    throw new Error("Composition 'CaptionedVideo' not found");
  }

  const output = path.resolve(
    `outputs/output-${Date.now()}.mp4`
  );

  // 3️⃣ Render the video
  await renderMedia({
    composition, // ✅ VideoConfig (NOT string)
    serveUrl,
    codec: "h264",
    outputLocation: output,
    inputProps: {
      videoPath,
      captions,
      style,
    },
  });

  return output;
}
