import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcrypt";
import { firstAdmin, uploadDir } from "../config/env.js";
import { query } from "./pool.js";

const schemaFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql");

// Creates the tables and the first admin account. Safe to run on every start.
export async function setupDatabase() {
  await fs.mkdir(uploadDir, { recursive: true });
  await query(await fs.readFile(schemaFile, "utf8"));

  const { rows } = await query("SELECT COUNT(*)::int AS total FROM admins");
  if (rows[0].total > 0) return;

  const passwordHash = await bcrypt.hash(firstAdmin.password, 10);
  await query("INSERT INTO admins (username, password_hash) VALUES ($1, $2)", [
    firstAdmin.username,
    passwordHash
  ]);

  console.log(`Created admin "${firstAdmin.username}". Change the password before going live.`);
}
