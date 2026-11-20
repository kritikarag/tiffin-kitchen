// Phone photos are often 3–12 MB. Before sending, the photo is shrunk in the browser to at most
// 1600 pixels on its longest side and saved as JPEG. That keeps handwriting readable for Claude while the
// upload stays small (usually 200–500 KB), which matters on a slow mobile connection.

const MAX_SIDE = 1600;

export type PhotoForUpload = { media_type: "image/jpeg"; data: string; previewUrl: string };

export async function preparePhoto(file: File): Promise<PhotoForUpload> {
  if (!file.type.startsWith("image/")) throw new Error("not-image");
  // createImageBitmap also applies the photo's rotation, so a phone picture isn't sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no-canvas");
  ctx.fillStyle = "#fff"; // transparent PNGs would otherwise turn black as JPEG
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { media_type: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1), previewUrl: dataUrl };
}
