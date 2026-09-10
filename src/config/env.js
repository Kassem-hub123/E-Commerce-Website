import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export const rootDir = path.dirname(srcDir);
export const publicDir = path.join(rootDir, "public");
export const uploadDir = path.join(publicDir, "uploads");

export const isProduction = process.env.NODE_ENV === "production";
export const port = Number(process.env.PORT) || 3000;

export const databaseUrl =
  process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ecommerce_store";

export const jwtSecret = process.env.JWT_SECRET || "development-secret-do-not-use-in-production";
export const tokenLifetime = process.env.JWT_EXPIRES_IN || "8h";

export const firstAdmin = {
  username: process.env.ADMIN_USERNAME || "admin",
  password: process.env.ADMIN_PASSWORD || "admin123"
};

export const store = {
  name: process.env.STORE_NAME || "Corner Store",
  currency: process.env.CURRENCY || "USD"
};

export const imageKit = {
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
  folder: process.env.IMAGEKIT_FOLDER || "/products"
};

export const imageKitEnabled = Boolean(imageKit.privateKey && imageKit.urlEndpoint);

if (isProduction && jwtSecret.startsWith("development-secret")) {
  throw new Error("Set JWT_SECRET before starting the server in production.");
}
