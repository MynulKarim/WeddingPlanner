/**
 * Media upload validation — Phase 3 (pure, unit-tested).
 * Server never trusts client-provided MIME alone: actions re-check the
 * received File's type/size, and storage policies enforce tenant scope.
 */

export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const VIDEO_MIMES = ['video/mp4', 'video/webm'];

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 32 * 1024 * 1024;

export type MediaKind = 'image' | 'video';

export function kindForMime(mime: string): MediaKind | null {
  if (IMAGE_MIMES.includes(mime)) return 'image';
  if (VIDEO_MIMES.includes(mime)) return 'video';
  return null;
}

export function validateMediaFile(input: { mime: string; sizeBytes: number }): string | null {
  const kind = kindForMime(input.mime);
  if (!kind) return 'Only JPEG, PNG, WebP, GIF images or MP4/WebM videos are allowed.';
  const limit = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (input.sizeBytes <= 0) return 'File is empty.';
  if (input.sizeBytes > limit) {
    return kind === 'image'
      ? 'Images must be 8 MB or smaller.'
      : 'Videos must be 32 MB or smaller.';
  }
  return null;
}

export function extensionForMime(mime: string): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'video/mp4':
      return 'mp4';
    case 'video/webm':
      return 'webm';
    default:
      return 'bin';
  }
}
