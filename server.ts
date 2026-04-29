import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

// Routes
import authRoutes from "./src/routes/authRoutes.ts";
import recipeRoutes from "./src/routes/recipeRoutes.ts";
import categoryRoutes from "./src/routes/categoryRoutes.ts";
import uploadRoutes from "./src/routes/uploadRoutes.ts";
import importRoutes from "./src/routes/importRoutes.ts";
import plannerRoutes from "./src/routes/plannerRoutes.ts";
import freezerRoutes from "./src/routes/freezerRoutes.ts";

async function start() {
  console.log("LA_MIA_CUCINA_REBORN");
  const app = express();
  app.use(express.json());

  // API
  app.use("/api/auth", authRoutes);
  app.use("/api/recipes", recipeRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/import", importRoutes);
  app.use("/api/planner", plannerRoutes);
  app.use("/api/freezer", freezerRoutes);

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    try {
      const template = fs.readFileSync(path.resolve("index.html"), "utf-8");
      const html = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      next(e);
    }
  });

  app.listen(3000, "0.0.0.0", () => {
    console.log("LA_MIA_CUCINA_READY");
  });
}

start();