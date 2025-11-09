const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../lib/auth");
const axios = require("axios");

/**
 * Generic webhook receiver for automations (n8n / Make / Zapier)
 *
 * This endpoint can be called by your server or by the assistant run hooks
 * to trigger external automations.
 *
 * Example body:
 * {
 *   name: "lead.created",
 *   payload: { ... },
 *   targets: ["https://hook.n8n.cloud/...", "https://hooks.zapier.com/..."]
 * }
 *
 * This route is protected by JWT; alternatively you can create a public webhook route per client.
 */
router.post("/incoming", authMiddleware, async (req, res) => {
  try {
    const { name, payload, targets } = req.body || {};
    if (!name || !targets || !Array.isArray(targets)) return res.status(400).json({ error: "name and targets[] required" });

    // Fan out events to targets
    const results = await Promise.allSettled(
      targets.map((t) => axios.post(t, { name, payload }, { headers: { "content-type": "application/json" }, timeout: 10000 }))
    );

    res.json({
      ok: true,
      delivered: results.map((r, i) => ({
        target: targets[i],
        status: r.status,
        reason: r.status === "rejected" ? (r.reason?.message || "failed") : undefined
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to dispatch webhooks" });
  }
});

module.exports = router;