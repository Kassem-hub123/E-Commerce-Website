import { query } from "../db/pool.js";

export async function findAdminByUsername(username) {
  const { rows } = await query(
    "SELECT id, username, role, password_hash FROM admins WHERE username = $1",
    [username]
  );

  return rows[0] || null;
}
