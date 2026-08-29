import "dotenv/config";
import express from "express";
import cors from "cors";
import serverless from "serverless-http";
import { handleUnsplash } from "./routes/unsplash";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/unsplash", handleUnsplash);

  return app;
}

// Netlify Functions entry. Wraps the Express app in serverless-http
// so the prebuilt server bundle can be re-exported as a function handler.
export const handler = serverless(createServer());
