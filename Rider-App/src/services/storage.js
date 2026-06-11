import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getStorage,
} from "firebase/storage";

const storage = getStorage();

export async function uploadFile(path, file) {
  const fileRef = storageRef(storage, path);
  const uploadTask = uploadBytesResumable(fileRef, file, { contentType: file.type || "image/*" });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      null,
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
}

export async function uploadBlob(path, blob) {
  return uploadFile(path, blob);
}

export async function getPublicUrl(path) {
  const fileRef = storageRef(storage, path);
  return getDownloadURL(fileRef);
}

export async function deleteFile(path) {
  const fileRef = storageRef(storage, path);
  await deleteObject(fileRef);
}

export { storage };
