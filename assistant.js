const express = require("express");
const router = express.Router();
const { authMiddleware } = require("./auth.js");
const openai = require("./openai.js");
const db = require("./connection.js");
const { v4: uuidv4 } = require("uuid");

/**
 * Create an assistant for a client (creates external assistant and stores mapping)
 * Protected by JWT
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const client = req.client;
    const { name, config } = req.body;
    // Create on OpenAI
    const created = await openai.createAssistant(client.id, { name, ...config });
    // Persist mapping
    const record = await db.query(
      `INSERT INTO assistants (client_id, assistant_id, name, config) VALUES ($1,$2,$3,$4) RETURNING *`,
      [client.id, created.id || created.id || created.assistant_id || uuidv4(), name || created.name, config || created]
    );
    res.json({ assistant: record.rows[0], external: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create assistant" });
  }
});

/**
 * List assistants for client
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const client = req.client;
    const r = await db.query("SELECT * FROM assistants WHERE client_id = $1", [client.id]);
    res.json({ assistants: r.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list assistants" });
  }
});

module.exports = router;
