// Phone photos are often 3–12 MB. Before sending, the photo is shrunk in the browser to at most
// 1600 pixels on its longest side and saved as JPEG. That keeps handwriting readable for Claude while the
// upload stays small (usually 150–500 KB), which matters on a slow mobile connection.

const MAX_SIDE = 1600;

export type PhotoForUpload = { media_type: "image/jpeg"; data: string; previewUrl: string };

// Draws any image source (a photo file or a camera frame) onto a canvas no larger than MAX_SIDE.
function toJpeg(source: CanvasImageSource, width: number, height: number): PhotoForUpload {
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black as JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { media_type: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1), previewUrl: dataUrl };
}

// A photo chosen from the gallery or the phone's camera app.
export async function preparePhoto(file: File): Promise<PhotoForUpload> {
  if (!file.type.startsWith("image/")) throw new Error("not-image");
  // createImageBitmap also applies the photo's rotation, so a phone picture isn't sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    return toJpeg(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

// The current frame of the in-page camera.
export function captureFrame(video: HTMLVideoElement): PhotoForUpload {
  if (!video.videoWidth || !video.videoHeight) throw new Error("no-frame");
  return toJpeg(video, video.videoWidth, video.videoHeight);
}

// Opens the camera, preferring the back camera on a phone. Needs HTTPS (or localhost) and permission.
export async function openCamera(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-camera");
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
    audio: false,
  });
}
