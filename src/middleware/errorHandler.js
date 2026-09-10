import multer from "multer";
import { isProduction } from "../config/env.js";
import { MAX_PRODUCT_IMAGES } from "./upload.js";

export function notFound(req, res) {
  res.status(404).json({ message: `No route for ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Each image must be smaller than 5 MB."
        : error.code === "LIMIT_FILE_COUNT"
          ? `You can upload up to ${MAX_PRODUCT_IMAGES} images per product.`
          : "That upload could not be processed.";

    return res.status(400).json({ message });
  }

  if (error.status && error.status < 500) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(error);
  res.status(500).json({
    message: isProduction ? "Something went wrong. Please try again." : error.message
  });
}
