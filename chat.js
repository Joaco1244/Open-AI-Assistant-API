const express = require("express");
const router = express.Router();
const authMiddleware = require("./authMiddleware.js");
const openai = require("./openai.js");
const db = require("./connection.js");

/**
 * POST /api/chat
 * Body:
 * {
 *   assistantId: "<assistantId>",      // required
 *   threadId: "<threadId>",           // optional; if provided, posts within thread
 *   text: "Hi",
 *   metadata: {...}
 * }
 *
 * Returns:
 * {
 *  type: "response",
 *  text: "...",
 *  assistantId, threadId, meta: {...}
 * }
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const client = req.client;
    const { assistantId, threadId, text, metadata } = req.body || {};

    if (!assistantId || !text) return res.status(400).json({ error: "assistantId and text are required" });

    let thread = null;
    if (threadId) {
      // Lookup local mapping to obtain external_thread_id
      const r = await db.query("SELECT * FROM threads WHERE id = $1 AND client_id = $2", [threadId, client.id]);
      if (!r.rows[0]) return res.status(404).json({ error: "Thread not found" });
      thread = r.rows[0];
    } else {
      // Create a new thread automatically for convenience
      const created = await openai.createThread(assistantId, metadata || {});
      const externalThreadId = created.id || created.thread?.id;
      const inserted = await db.query(
        `INSERT INTO threads (client_id, assistant_id, external_thread_id, meta) VALUES ($1,$2,$3,$4) RETURNING *`,
        [client.id, assistantId, externalThreadId, metadata || {}]
      );
      thread = inserted.rows[0];
    }

    // Post message to thread
    const externalThreadId = thread.external_thread_id;
    const posted = await openai.postMessageToThread(assistantId, externalThreadId, text);

    // Optionally run the assistant (depending on API you may get a run object immediately)
    let runResult;
    try {
      runResult = await openai.runThread(assistantId, externalThreadId, { type: "text", content: text });
    } catch (err) {
      // Not fatal — some backends don't have run endpoint
      runResult = posted;
    }

    // Update last activity
    await db.query("UPDATE threads SET last_activity_at = now() WHERE id = $1", [thread.id]);

    // Craft user-friendly output (text extraction depends on response shape)
    let outputText = "";
    if (runResult && runResult.output) {
      // Newer responses may have output array or text field
      outputText = Array.isArray(runResult.output)
        ? runResult.output.map((o) => o.text || o.content || (typeof o === "string" ? o : "")).join("\n")
        : runResult.output.text || runResult.output;
    } else if (posted && (posted.output || posted.text)) {
      outputText = posted.output?.text || posted.text || JSON.stringify(posted);
    } else {
      outputText = "No assistant output.";
    }

    res.json({
      type: "response",
      text: outputText,
      assistantId,
      threadId: thread.id,
      meta: { external: runResult || posted }
    });
  } catch (err) {
    console.error(err?.response?.data || err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;
