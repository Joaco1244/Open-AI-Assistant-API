import { Request } from "express";
import crypto from "crypto";

/**
 * Verify HMAC signature for incoming Voiceflow webhook (optional).
 * Voiceflow should sign the raw body using a shared secret and send header 'x-vf-signature'.
 *
 * This function expects that express.json() has already parsed the body.
 * For strict verification of raw body, you would need to capture rawBody during parsing.
 *
 * For production, configure Voiceflow to send signature header and store VOICEFLOW_SIGNATURE_SECRET.
 */
export function verifyVoiceflowSignature(req: Request, secret: string) {
  const signature = (req.header("x-vf-signature") || "").toString();

  if (!signature) return false;

  // NOTE: Because express.json() already parsed the body, HMAC computed here is against stringified body.
  // If your provider signs raw bytes, capture raw body via a middleware and use it.
  const bodyString = JSON.stringify(req.body || {});
  const hmac = crypto.createHmac("sha256", secret).update(bodyString).digest("hex");

  // Use timing-safe compare
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}