import { buildPublicSupabaseUrl, deleteMedia, getPrivateMediaUrl, uploadMedia } from "./media";

export async function uploadFile(_path, file) {
  return uploadMedia(file, { mediaType: "file" });
}

export async function uploadBlob(_path, blob) {
  return uploadFile(_path, blob);
}

export async function getPublicUrl(media) {
  if (typeof media === "string") {
    return getPrivateMediaUrl(media);
  }

  if (media?.bucket === "public-media" && media.objectPath) {
    return buildPublicSupabaseUrl(media.bucket, media.objectPath);
  }

  return media?.publicUrl || media?.url || null;
}

export async function deleteFile(mediaId) {
  return deleteMedia(mediaId);
}
