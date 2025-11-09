import express, { Request, Response } from "express";
import { verifyVoiceflowSignature } from "./verifyVoiceflow.ts";
import openaiService from "./openai.ts";
import { getSessionStore } from "./index.ts";
import logger from "./logger.ts";

const router = express.Router();

/**
 * Voiceflow interact endpoint
 * Expected input (Voiceflow / API block):
 * {
 *   "userId": "user-123",
 *   "sessionId": "session-abc",
 *   "text": "Hello",
 *   "variables": {...}   // optional
 * }
 */
router.post("/interact", async (req: Request, res: Response) => {
  try {
    // Optional signature verification
    const signatureSecret = process.env.VOICEFLOW_SIGNATURE_SECRET;
    if (signatureSecret) {
      const isValid = verifyVoiceflowSignature(req, signatureSecret);
      if (!isValid) {
        logger.warn({ path: req.path, ip: req.ip }, "Invalid voiceflow signature");
        return res.status(401).json({ error: "Invalid signature" });
      }
    }

    const { userId, sessionId, text, variables } = req.body as {
      userId?: string;
      sessionId?: string;
      text?: string;
      variables?: Record<string, any>;
    };

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing 'text' in request body" });
    }

    const sid = sessionId || `vf-${userId || "anon"}-${Date.now()}`;

    // Load session (memory or redis)
    const store = getSessionStore();
    const session = await store.get(sid);

    // Build assistant input (you can augment with variables / session context)
    const input = {
      text,
      userId: userId || "anonymous",
      sessionId: sid,
      variables: variables || {},
      sessionState: session?.state || {}
    };

    // Query OpenAI Assistants API (wraps retries/timeouts)
    const assistantResponse = await openaiService.chatWithAssistant({
      assistantId: process.env.OPENAI_ASSISTANT_ID,
      inputText: text,
      sessionState: session?.state,
      variables: variables || {}
    });

    // Persist updated session state (if assistant returned state)
    const newState = assistantResponse.state || session?.state || {};
    await store.save(sid, { state: newState, lastActivityAt: Date.now() });

    // Return response in Voiceflow-friendly shape
    return res.json({
      type: "response",
      text: assistantResponse.outputText,
      variables: assistantResponse.variables || {},
      state: newState
    });
  } catch (err) {
    logger.error({ err }, "Error processing /voiceflow/interact");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
