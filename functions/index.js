const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret, defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { createClient } = require("@supabase/supabase-js");
const { randomUUID } = require("crypto");

const supabaseUrl = defineString("SUPABASE_URL");
const supabaseServiceRoleKey = defineSecret("SUPABASE_SERVICE_ROLE_KEY");

if (!admin.apps.length) {
  admin.initializeApp();
}

const auth = admin.auth();
const db = admin.firestore();

const supabase = createClient(
  supabaseUrl.value(),
  supabaseServiceRoleKey.value(),
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const PRIVATE_BUCKET = "private-media";
const PUBLIC_BUCKET = "public-media";
const UPLOAD_STAGING_BUCKET = "upload-staging";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DOWNLOAD_URL_TTL_SECONDS = 300;
const PENDING_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

const allowedBuckets = new Set([PRIVATE_BUCKET, PUBLIC_BUCKET, UPLOAD_STAGING_BUCKET]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "pdf", "heic", "heif", "avif"]);
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
  "image/heic",
  "image/heif",
  "image/avif",
]);
const safeParentCollections = new Set(["users", "orders", "vendors", "restaurants"]);

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

async function verifyFirebaseUser(req) {
  const token = getBearerToken(req);

  if (!token) {
    throw Object.assign(new Error("Missing Firebase ID token"), { code: "auth/id-token-missing" });
  }

  return auth.verifyIdToken(token);
}

function getExtension(fileName) {
  const safeName = sanitizeFileName(fileName || "");
  const parts = safeName.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function getExtensionFromMime(contentType) {
  const mimeToExtension = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
    "image/heic": "heic",
    "image/heif": "heif",
    "image/avif": "avif",
  };

  return mimeToExtension[contentType] || "";
}

function sanitizeFileName(fileName) {
  return String(fileName || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function encodeObjectPath(objectPath) {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

function buildPublicMediaUrl(bucket, objectPath) {
  return `${supabaseUrl.value()}/storage/v1/object/public/${bucket}/${encodeObjectPath(objectPath)}`;
}

function buildSupabaseUrl(bucket, objectPath) {
  return `supabase://${bucket}/${objectPath}`;
}

function buildObjectPath(bucket, uid, ext) {
  const date = new Date().toISOString().slice(0, 10);
  const folder = bucket === PUBLIC_BUCKET ? "public" : "users";
  return `${folder}/${uid}/media/${date}/${randomUUID()}.${ext}`;
}

function validateUploadMetadata(body) {
  const fileName = String(body.fileName || "").trim();
  const contentType = String(body.contentType || "").trim().toLowerCase();
  const size = Number(body.size);
  const bucket = String(body.bucket || PRIVATE_BUCKET).trim();
  const ownerUid = String(body.ownerUid || "").trim();

  if (!fileName || !contentType || !Number.isFinite(size) || size <= 0) {
    throw new Error("Missing upload metadata");
  }

  if (!allowedBuckets.has(bucket)) {
    throw new Error("Unsupported media bucket");
  }

  if (size > MAX_FILE_SIZE) {
    throw new Error("File too large");
  }

  if (!allowedMimeTypes.has(contentType)) {
    throw new Error("Unsupported content type");
  }

  const ext = getExtension(fileName) || getExtensionFromMime(contentType);

  if (!allowedExtensions.has(ext)) {
    throw new Error("Unsupported file type");
  }

  return {
    fileName: sanitizeFileName(fileName),
    contentType,
    size,
    bucket,
    ownerUid: ownerUid || null,
    parentCollection: body.parentCollection || null,
    parentId: body.parentId || null,
    mediaType: body.mediaType || null,
    ext,
  };
}

async function assertCanUploadMedia(uid, body) {
  if (body.ownerUid && body.ownerUid !== uid) {
    throw new Error("Forbidden");
  }

  if (body.parentCollection && body.parentId) {
    if (!safeParentCollections.has(body.parentCollection)) {
      throw new Error("Invalid parent resource");
    }

    if (body.parentCollection === "users" && body.parentId === uid) {
      return;
    }

    const doc = await db.collection(body.parentCollection).doc(body.parentId).get();

    if (!doc.exists) {
      throw new Error("Parent resource not found");
    }

    const data = doc.data() || {};
    const allowedUids = [
      data.ownerUid,
      data.owner_uid,
      data.userId,
      data.user_id,
      data.customerId,
      data.customer_id,
      data.riderId,
      data.rider_id,
      data.vendorId,
      data.vendor_id,
      data.restaurantId,
      data.restaurant_id,
    ].filter(Boolean);

    if (!allowedUids.includes(uid)) {
      throw new Error("Forbidden");
    }
  }
}

async function assertCanAccessMedia(uid, media, allowPublicRead = false) {
  if (allowPublicRead && media.bucket === PUBLIC_BUCKET) {
    return;
  }

  if (media.ownerUid === uid) {
    return;
  }

  if (media.parentCollection && media.parentId) {
    if (media.parentCollection === "users" && media.parentId === uid) {
      return;
    }

    if (!safeParentCollections.has(media.parentCollection)) {
      throw new Error("Forbidden");
    }

    const doc = await db.collection(media.parentCollection).doc(media.parentId).get();

    if (!doc.exists) {
      throw new Error("Parent resource not found");
    }

    const data = doc.data() || {};
    const allowedUids = [
      data.ownerUid,
      data.owner_uid,
      data.userId,
      data.user_id,
      data.customerId,
      data.customer_id,
      data.riderId,
      data.rider_id,
      data.vendorId,
      data.vendor_id,
      data.restaurantId,
      data.restaurant_id,
    ].filter(Boolean);

    if (allowedUids.includes(uid)) {
      return;
    }
  }

  throw new Error("Forbidden");
}

function writeError(res, err, context) {
  console.error(`${context}:`, err);

  if (["auth/id-token-missing", "auth/id-token-expired", "auth/argument-error"].includes(err.code)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (err.message === "Forbidden") {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (err.message === "Parent resource not found") {
    return res.status(404).json({ error: "Parent resource not found" });
  }

  if ([
    "Missing upload metadata",
    "Unsupported media bucket",
    "File too large",
    "Unsupported content type",
    "Unsupported file type",
    "Invalid parent resource",
    "Missing mediaId",
  ].includes(err.message)) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({ error: "Internal server error" });
}

exports.createMediaUploadUrl = onRequest({ cors: true, secrets: [supabaseServiceRoleKey] }, async (req, res) => {
  try {
    const user = await verifyFirebaseUser(req);
    const uid = user.uid;
    const metadata = validateUploadMetadata(req.body || {});

    await assertCanUploadMedia(uid, metadata);

    const objectPath = buildObjectPath(metadata.bucket, uid, metadata.ext);
    const { data, error } = await supabase.storage
      .from(metadata.bucket)
      .createSignedUploadUrl(objectPath);

    if (error || !data?.signedUrl || !data.token) {
      console.error("Supabase upload URL error:", error || data);
      return res.status(500).json({ error: "Could not create upload URL" });
    }

    const mediaRef = db.collection("media").doc();
    const media = {
      provider: "supabase",
      bucket: metadata.bucket,
      objectPath,
      url: buildSupabaseUrl(metadata.bucket, objectPath),
      publicUrl: metadata.bucket === PUBLIC_BUCKET ? buildPublicMediaUrl(metadata.bucket, objectPath) : null,
      contentType: metadata.contentType,
      size: metadata.size,
      ownerUid: metadata.ownerUid || uid,
      mediaType: metadata.mediaType,
      parentCollection: metadata.parentCollection,
      parentId: metadata.parentId,
      uploadStatus: "pending_upload",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await mediaRef.set(media);

    return res.status(201).json({
      mediaId: mediaRef.id,
      provider: media.provider,
      bucket: media.bucket,
      objectPath: media.objectPath,
      url: media.url,
      publicUrl: media.publicUrl,
      uploadUrl: data.signedUrl,
      uploadToken: data.token,
      contentType: media.contentType,
      size: media.size,
      ownerUid: media.ownerUid,
      mediaType: media.mediaType,
      parentCollection: media.parentCollection,
      parentId: media.parentId,
      uploadStatus: media.uploadStatus,
    });
  } catch (err) {
    return writeError(res, err, "createMediaUploadUrl error");
  }
});

exports.confirmMediaUpload = onRequest({ cors: true, secrets: [supabaseServiceRoleKey] }, async (req, res) => {
  try {
    const user = await verifyFirebaseUser(req);
    const uid = user.uid;
    const { mediaId } = req.body || {};

    if (!mediaId) {
      throw new Error("Missing mediaId");
    }

    const mediaRef = db.collection("media").doc(mediaId);
    const mediaDoc = await mediaRef.get();

    if (!mediaDoc.exists) {
      return res.status(404).json({ error: "Media not found" });
    }

    const media = mediaDoc.data();
    await assertCanAccessMedia(uid, media);

    if (media.uploadStatus === "uploaded") {
      return res.json({ mediaId, uploadStatus: "uploaded" });
    }

    await mediaRef.update({
      uploadStatus: "uploaded",
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.json({ mediaId, uploadStatus: "uploaded" });
  } catch (err) {
    return writeError(res, err, "confirmMediaUpload error");
  }
});

exports.getMediaDownloadUrl = onRequest({ cors: true, secrets: [supabaseServiceRoleKey] }, async (req, res) => {
  try {
    const user = await verifyFirebaseUser(req);
    const uid = user.uid;
    const { mediaId } = req.body || {};

    if (!mediaId) {
      throw new Error("Missing mediaId");
    }

    const mediaDoc = await db.collection("media").doc(mediaId).get();

    if (!mediaDoc.exists) {
      return res.status(404).json({ error: "Media not found" });
    }

    const media = mediaDoc.data();
    await assertCanAccessMedia(uid, media, true);

    if (media.bucket === PUBLIC_BUCKET) {
      return res.json({
        signedUrl: media.publicUrl || buildPublicMediaUrl(media.bucket, media.objectPath),
        expiresInSeconds: null,
        isPublic: true,
      });
    }

    const { data, error } = await supabase.storage
      .from(media.bucket)
      .createSignedUrl(media.objectPath, DOWNLOAD_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      console.error("Supabase download URL error:", error || data);
      return res.status(500).json({ error: "Could not create download URL" });
    }

    return res.json({
      signedUrl: data.signedUrl,
      expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
      isPublic: false,
    });
  } catch (err) {
    return writeError(res, err, "getMediaDownloadUrl error");
  }
});

exports.deleteMedia = onRequest({ cors: true, secrets: [supabaseServiceRoleKey] }, async (req, res) => {
  try {
    const user = await verifyFirebaseUser(req);
    const uid = user.uid;
    const { mediaId } = req.body || {};

    if (!mediaId) {
      throw new Error("Missing mediaId");
    }

    const mediaRef = db.collection("media").doc(mediaId);
    const mediaDoc = await mediaRef.get();

    if (!mediaDoc.exists) {
      return res.status(404).json({ error: "Media not found" });
    }

    const media = mediaDoc.data();
    await assertCanAccessMedia(uid, media);

    if (media.provider !== "supabase") {
      return res.status(400).json({ error: "Unsupported media provider" });
    }

    const { error } = await supabase.storage
      .from(media.bucket)
      .remove([media.objectPath]);

    if (error) {
      console.error("Supabase delete URL error:", error);
      return res.status(500).json({ error: "Could not delete media object" });
    }

    await mediaRef.delete();

    return res.json({ deleted: true, mediaId });
  } catch (err) {
    return writeError(res, err, "deleteMedia error");
  }
});

exports.cleanupPendingMediaUploads = onSchedule("every 24 hours", { secrets: [supabaseServiceRoleKey] }, async () => {
  const cutoff = admin.firestore.Timestamp.fromDate(new Date(Date.now() - PENDING_UPLOAD_TTL_MS));
  const snap = await db.collection("media")
    .where("uploadStatus", "==", "pending_upload")
    .where("createdAt", "<", cutoff)
    .limit(100)
    .get();

  const deletes = [];

  for (const docSnap of snap.docs) {
    const media = docSnap.data();

    if (media.provider === "supabase" && media.bucket && media.objectPath) {
      await supabase.storage.from(media.bucket).remove([media.objectPath]);
    }

    deletes.push(docSnap.ref.delete());
  }

  await Promise.all(deletes);
  console.log(`Deleted ${deletes.length} pending Supabase media uploads`);
});
