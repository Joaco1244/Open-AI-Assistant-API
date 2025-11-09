import express, { json } from "express";
import helmet from "helmet";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";

import voiceflowRoutes from "./routes/voiceflow";
import logger from "./utils/logger";

export function createServer() {
  const app = express();

  // Body parser
  app.use(json({ limit: "256kb" }));

  // Security
  app.use(helmet());
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Logging
  app.use(pinoHttp({ logger }));

  // Rate limiting (simple config; can be replaced with a distributed store)
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
  const max = Number(process.env.RATE_LIMIT_MAX || 120);

  let limiterOptions: any = { windowMs, max, standardHeaders: true, legacyHeaders: false };

  if (process.env.SESSION_STORE === "redis" && process.env.REDIS_URL) {
    const redisClient = new Redis(process.env.REDIS_URL);
    limiterOptions.store = new RedisStore({
      sendCommand: (...args: any[]) => redisClient.call(...args),
      prefix: "rl:"
    });
  }

  app.use(rateLimit(limiterOptions));

  // Routes
  app.use("/voiceflow", voiceflowRoutes);

  // Health
  app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: any, res: any, _next: any) => {
    logger.error(err, "Unhandled error");
    res.status(err.status || 500).json({ error: "Internal server error" });
  });

  return app;
}

export default createServer;