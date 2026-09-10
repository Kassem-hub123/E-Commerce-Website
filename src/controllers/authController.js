import bcrypt from "bcrypt";
import { findAdminByUsername } from "../models/adminModel.js";
import { createToken } from "../services/tokenService.js";

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000;

// Simple in-memory brute force guard. Enough for a single-server shop.
const attempts = new Map();

function attemptsFor(key) {
  const record = attempts.get(key);

  if (!record || Date.now() - record.firstAt > LOCKOUT_MS) {
    const fresh = { count: 0, firstAt: Date.now() };
    attempts.set(key, fresh);
    return fresh;
  }

  return record;
}

export async function login(req, res) {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  const record = attemptsFor(req.ip);

  if (record.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ message: "Too many failed logins. Try again in a few minutes." });
  }

  const admin = await findAdminByUsername(username);
  const passwordMatches = admin && (await bcrypt.compare(password, admin.password_hash));

  if (!passwordMatches) {
    record.count += 1;
    return res.status(401).json({ message: "Wrong username or password." });
  }

  attempts.delete(req.ip);

  res.json({
    token: createToken(admin),
    admin: { username: admin.username, role: admin.role }
  });
}

export function me(req, res) {
  res.json({ admin: req.admin });
}
