import { readToken } from "../services/tokenService.js";

// Reads "Authorization: Bearer <token>" and puts the admin on the request.
export function requireAdmin(req, res, next) {
  const [scheme, token] = (req.get("Authorization") || "").split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Please log in first." });
  }

  const payload = readToken(token);

  if (!payload) {
    return res.status(401).json({ message: "Your session expired. Please log in again." });
  }

  if (payload.role !== "admin") {
    return res.status(403).json({ message: "This account cannot manage the shop." });
  }

  req.admin = { id: Number(payload.sub), username: payload.username, role: payload.role };
  next();
}
