import { getIdToken } from "./auth";

const FUNCTIONS_BASE_URL = process.env.EXPO_PUBLIC_FUNCTIONS_BASE_URL?.replace(/\/$/, "");
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const PUBLIC_BUCKET = "public-media";

function encodeObjectPath(objectPath) {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

export function buildPublicSupabaseUrl(bucket, objectPath) {
  if (!SUPABASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL");
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeObjectPath(objectPath)}`;
}

function getFunctionsBaseUrl() {
  if (!FUNCTIONS_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_FUNCTIONS_BASE_URL");
  }

  return FUNCTIONS_BASE_URL;
}

async function callMediaFunction(path, payload) {
  const idToken = await getIdToken();

  if (!idToken) {
    throw new Error("Not signed in");
  }

  const response = await fetch(`${getFunctionsBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Media request failed with status ${response.status}`);
  }

  return data;
}

function extensionFromMime(mimeType) {
  const mimeToExtension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/avif": "avif",
  };

  return mimeToExtension[mimeType] || "bin";
}

async function normalizeUploadFile(file) {
  const blob = file.blob || file;
  const name = file.name || file.fileName || `upload-${Date.now()}`;
  const mimeType = file.type || blob.type || file.mimeType || "application/octet-stream";
  const size = file.size ?? blob.size ?? file.fileSize ?? 0;

  if (file.uri) {
    const response = await fetch(file.uri);
    const uriBlob = await response.blob();

    return {
      blob: uriBlob,
      name,
      type: mimeType,
      size: size || uriBlob.size || 0,
    };
  }

  return {
    blob,
    name,
    type: mimeType,
    size,
  };
}

export async function uploadMedia(file, metadata = {}) {
  const uploadFile = await normalizeUploadFile(file);
  const config = await callMediaFunction("/createMediaUploadUrl", {
    fileName: uploadFile.name,
    contentType: uploadFile.type,
    size: uploadFile.size,
    ownerUid: metadata.ownerUid,
    parentCollection: metadata.parentCollection,
    parentId: metadata.parentId,
    mediaType: metadata.mediaType,
    bucket: metadata.bucket,
  });

  const uploadResponse = await fetch(config.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": uploadFile.type || config.contentType,
      "X-Upload-Token": config.uploadToken,
    },
    body: uploadFile.blob,
  });

  if (!uploadResponse.ok) {
    throw new Error("Supabase upload failed");
  }

  await callMediaFunction("/confirmMediaUpload", { mediaId: config.mediaId });

  return {
    id: config.mediaId,
    mediaId: config.mediaId,
    provider: config.provider,
    bucket: config.bucket,
    objectPath: config.objectPath,
    url: config.url,
    publicUrl: config.publicUrl,
    contentType: config.contentType,
    size: config.size,
    ownerUid: config.ownerUid,
    mediaType: config.mediaType,
    parentCollection: config.parentCollection,
    parentId: config.parentId,
    uploadStatus: "uploaded",
  };
}

export async function getPrivateMediaUrl(mediaId) {
  const data = await callMediaFunction("/getMediaDownloadUrl", { mediaId });
  return data.signedUrl;
}

export async function deleteMedia(mediaId) {
  return callMediaFunction("/deleteMedia", { mediaId });
}

export async function getMediaDisplayUrl(media) {
  if (!media) return null;

  if (media.provider !== "supabase") {
    return media.url || media.publicUrl || null;
  }

  if (media.bucket === PUBLIC_BUCKET || media.publicUrl) {
    return media.publicUrl || buildPublicSupabaseUrl(media.bucket, media.objectPath);
  }

  const mediaId = media.id || media.mediaId;

  if (!mediaId) {
    return media.publicUrl || media.url || null;
  }

  return getPrivateMediaUrl(mediaId);
}

export { extensionFromMime };
