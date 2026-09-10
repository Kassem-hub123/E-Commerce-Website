import multer from "multer";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const MAX_PRODUCT_IMAGES = 3;

export class UploadError extends Error {
  status = 400;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_PRODUCT_IMAGES },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new UploadError("Only image files can be uploaded."));
      return;
    }

    callback(null, true);
  }
});

export const uploadProductImages = upload.array("images", MAX_PRODUCT_IMAGES);
