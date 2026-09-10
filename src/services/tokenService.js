import jwt from "jsonwebtoken";
import { jwtSecret, tokenLifetime } from "../config/env.js";

export function createToken(admin) {
  return jwt.sign({ username: admin.username, role: admin.role }, jwtSecret, {
    subject: String(admin.id),
    expiresIn: tokenLifetime
  });
}

export function readToken(token) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}
