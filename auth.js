const express = require("express");
const router = express.Router();
const db = require("../connection.js");
const { issueTokenForClient } = require("../lib/auth");

/**
 * Exchange client API key for a JWT token.
 * Body:
 * {
 *   "api_key": "client-specific-api-key"
 * }
 */
router.post("/token", async (req, res) => {
  try {
    const { api_key } = req.body || {};
    if (!api_key) return res.status(400).json({ error: "api_key required" });

    const client = await db.getClientByApiKey(api_key);
    if (!client) return res.status(401).json({ error: "Invalid api_key" });

    // If client subscription inactive: return error
    if (client.subscription_status !== "active") {
      return res.status(403).json({ error: "Subscription is not active" });
    }

    const token = await issueTokenForClient(client);
    res.json({ token, expiresIn: process.env.JWT_EXPIRES_IN || "1h" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
