import pg from "pg";
import { databaseUrl } from "../config/env.js";

// Postgres returns NUMERIC as a string to avoid float rounding. Prices here are
// small enough that a JS number is fine, and the frontend expects a number.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);

export const pool = new pg.Pool({ connectionString: databaseUrl });

pool.on("error", error => {
  console.error("Unexpected database error:", error.message);
});

export function query(text, params) {
  return pool.query(text, params);
}

// Runs the callback inside a transaction and always releases the client.
export async function withTransaction(callback) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
