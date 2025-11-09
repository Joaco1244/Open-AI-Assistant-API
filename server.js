
const express = require("express");
require("dotenv").config();
const helmet = require("helmet");
const cors = require("cors");
const pino = require("pino");
const pinoHttp = require("pino-http");
const rateLimiter = require("./rateLimiter.js");
const authRoutes = require("./routes/auth");
const threadRoutes = require("./routes/thread");
const chatRoutes = require("./routes/chat");
const assistantRoutes = require("./routes/assistant");
const webhookRoutes = require("./routes/webhooks");
const db = require("./db/connection");

const logger = pino({ level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug") });

const app = express();
app.use(express.json({ limit: "512kb" }));
app.use(helmet());
app.use(cors({ origin: true }));
app.use(pinoHttp({ logger }));
app.use(rateLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/thread", threadRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/assistants", assistantRoutes);
app.use("/api/webhooks", webhookRoutes);

// Serve static test UI
app.use(express.static("public"));

app.get("/healthz", (_req, res) => res.json({ ok: true }));

const PORT = parseInt(process.env.PORT || "3001", 10);

db.initialize()
  .then(() => {
    logger.info("Database connected");
    app.listen(PORT, () => logger.info(`Server listening on ${PORT}`));
  })
  .catch((err) => {
    logger.error(err, "Failed to initialize database");
    process.exit(1);
  });

module.exports = app;
