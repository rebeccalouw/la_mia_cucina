import dotenv from "dotenv";
dotenv.config();

import express from "express";
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
import { errorHandler } from "./src/lib/errorHandler.ts";

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

async function start() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // API
  app.use("/api/auth", authRoutes);
  app.use("/api/recipes", recipeRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/import", importRoutes);
  app.use("/api/planner", plannerRoutes);
  app.use("/api/freezer", freezerRoutes);

  if (isProduction) {
    // Serve the build produced by `npm run build`. Previously this ran the Vite dev server in
    // every environment, so dist/ was never used.
    const distDir = path.resolve("dist");
    const indexHtml = path.join(distDir, "index.html");

    if (!fs.existsSync(indexHtml)) {
      throw new Error("dist/index.html is missing. Run `npm run build` before starting in production.");
    }

    app.use(express.static(distDir));

    app.use("*", (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      res.sendFile(indexHtml);
    });
  } else {
    // Imported lazily so production never loads the dev server.
    const { createServer: createViteServer } = await import("vite");

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
  }

  app.use(errorHandler);

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`La Mia Cucina ready on http://localhost:${PORT} (${isProduction ? 'production' : 'development'})`);
  });

  // An unhandled 'error' event here used to crash with a raw Node stack trace.
  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the other process, or start with PORT=<other port>.`);
      process.exit(1);
    }
    throw err;
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
