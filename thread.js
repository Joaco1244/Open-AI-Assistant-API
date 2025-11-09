const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../lib/auth");
const openai = require("../lib/openai");
const db = require("../db/connection");
const { v4: uuidv4 } = require("uuid");

/**
 * Create a thread for a specific assistant.
 * Body: { assistantId: "<assistantId>", metadata: {...} }
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const client = req.client;
    const { assistantId, metadata } = req.body;
    if (!assistantId) return res.status(400).json({ error: "assistantId required" });

    const external = await openai.createThread(assistantId, metadata || {});
    // Save thread mapping
    const externalThreadId = external.id || external.thread?.id || uuidv4();
    const r = await db.query(
      `INSERT INTO threads (client_id, assistant_id, external_thread_id, meta) VALUES ($1,$2,$3,$4) RETURNING *`,
      [client.id, assistantId, externalThreadId, metadata || {}]
    );
    res.json({ thread: r.rows[0], external });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create thread" });
  }
});

module.exports = router;