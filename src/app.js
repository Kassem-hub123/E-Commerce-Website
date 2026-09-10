import express from "express";
import { publicDir } from "./config/env.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(publicDir));

app.use("/api/settings", settingsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);

app.use("/api", notFound);
app.use(errorHandler);

export default app;
