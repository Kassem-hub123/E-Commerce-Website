import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import ImageKit, { toFile } from "@imagekit/nodejs";
import { imageKit, imageKitEnabled, uploadDir } from "../config/env.js";

const client = imageKitEnabled ? new ImageKit({ privateKey: imageKit.privateKey }) : null;

if (!imageKitEnabled) {
  console.log("ImageKit keys are not set - uploads are saved to public/uploads instead.");
}

function safeFileName(originalName) {
  const extension = path.extname(originalName).toLowerCase() || ".jpg";
  const base = path
    .basename(originalName, path.extname(originalName))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

  return `${base || "image"}-${crypto.randomUUID().slice(0, 8)}${extension}`;
}

async function saveToDisk(file) {
  const fileName = safeFileName(file.originalname);
  await fs.writeFile(path.join(uploadDir, fileName), file.buffer);

  return { url: `/uploads/${fileName}`, fileId: null };
}

async function saveToImageKit(file) {
  const fileName = safeFileName(file.originalname);
  const response = await client.files.upload({
    file: await toFile(file.buffer, fileName),
    fileName,
    folder: imageKit.folder
  });

  return { url: response.url, fileId: response.fileId ?? null };
}

// Returns [{ url, fileId }] in the same order the files were uploaded.
export function saveImages(files = []) {
  const save = imageKitEnabled ? saveToImageKit : saveToDisk;
  return Promise.all(files.map(save));
}

// Best effort clean-up: a failed delete should never break the request.
export async function removeImage({ url, fileId }) {
  try {
    if (fileId && client) {
      await client.files.delete(fileId);
    } else if (url?.startsWith("/uploads/")) {
      await fs.unlink(path.join(uploadDir, path.basename(url)));
    }
  } catch (error) {
    console.warn(`Could not delete image ${fileId || url}: ${error.message}`);
  }
}

export function removeImages(images = []) {
  return Promise.all(images.map(removeImage));
}
