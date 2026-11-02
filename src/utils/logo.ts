// Club-logo helpers. A logo is stored inline as a data URL in both the tournament
// snapshot and its landing-page meta, so it must stay small: any pasted/picked
// image is downscaled to fit LOGO_MAX_DIM and re-encoded, then rejected if the
// result is still over LOGO_MAX_BYTES.

export const LOGO_MAX_DIM = 128;
export const LOGO_MAX_BYTES = 48 * 1024;
// Raw input cap — refuse to even decode absurdly large files.
export const LOGO_MAX_INPUT_BYTES = 10 * 1024 * 1024;

// Approximate decoded byte size of a base64 data URL.
export function dataUrlByteSize(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
}

// Scales (w, h) down to fit within max × max, preserving aspect ratio. Never upscales.
export function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    img.src = url;
  });
}

// Converts an image Blob/File into a small data URL suitable for storing as a logo.
// Throws an Error with a user-facing message if the input isn't usable.
export async function imageBlobToLogoDataUrl(blob: Blob): Promise<string> {
  if (!blob.type.startsWith('image/')) throw new Error('That is not an image');
  if (blob.size > LOGO_MAX_INPUT_BYTES) throw new Error('Image is too large (max 10 MB)');

  const img = await loadImage(blob);
  const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, LOGO_MAX_DIM);
  if (!width || !height) throw new Error('Could not read that image');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process that image');
  ctx.drawImage(img, 0, 0, width, height);

  // WebP keeps transparency and is much smaller than PNG; browsers that can't
  // encode WebP silently return PNG, so check the size either way.
  let dataUrl = canvas.toDataURL('image/webp', 0.85);
  if (!dataUrl.startsWith('data:image/webp')) dataUrl = canvas.toDataURL('image/png');
  if (dataUrlByteSize(dataUrl) > LOGO_MAX_BYTES) dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  if (dataUrlByteSize(dataUrl) > LOGO_MAX_BYTES)
    throw new Error(`Logo is too large after resizing (max ${Math.round(LOGO_MAX_BYTES / 1024)} KB)`);
  return dataUrl;
}

// Accept only image data URLs we could have produced — guards against arbitrary
// strings being rendered as <img src>.
export function isValidLogoDataUrl(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v) &&
    dataUrlByteSize(v) <= LOGO_MAX_BYTES
  );
}
