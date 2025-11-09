import OpenAI from "openai";
import axios from "axios";
import logger from "../utils/logger";

type ChatInput = {
  assistantId?: string | undefined;
  inputText: string;
  sessionState?: any;
  variables?: Record<string, any>;
};

/**
 * Wrapper service for the OpenAI Assistants / Responses API.
 * - Tries to use the 'assistants' integration if assistantId is provided.
 * - Falls back to the Responses API (model) if assistantId is omitted.
 *
 * Behavior:
 * - Returns { outputText, variables?, state? }
 * - Retries on transient errors with exponential backoff (simple).
 */

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is required");
}

const client = new OpenAI({ apiKey });

const DEFAULT_MODEL = "gpt-4o-mini"; // fallback model; change as required

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callAssistantsAPI(assistantId: string, inputText: string, sessionState?: any) {
  // Some OpenAI clients expose a `responses.create` with `assistant` parameter.
  // When available use it; otherwise call the REST endpoint directly.
  try {
    // Try using the official OpenAI client with assistant param
    // (client.responses.create supports `assistant` in newer SDKs)
    const response = await client.responses.create({
      assistant: assistantId,
      input: inputText,
      // Attach JSON-able session state if present; assistant can use it
      metadata: { sessionState: sessionState || {} },
      max_output_tokens: 512
    } as any);

    // Parse a meaningful output text
    const outputText = Array.isArray(response.output) ?
      response.output.map((o: any) => o.content).join("\n") :
      (response.output?.[0]?.content || response.output?.text || "");

    // Try to parse state/variables from response.context if present
    const state = (response as any).state || (response as any).metadata || {};
    const variables = (response as any).variables || {};

    return { outputText: outputText.toString(), state, variables };
  } catch (err: any) {
    // If the SDK doesn't support `assistant`, fall back to the REST endpoint
    if (err?.message?.includes("assistant")) {
      logger.info("Falling back to REST assistant endpoint");
      const url = `https://api.openai.com/v1/assistants/${assistantId}/message`;
      const resp = await axios.post(url, {
        input: { text: inputText },
        state: sessionState || {}
      }, {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        timeout: 30_000
      });

      const outputText = resp.data?.output?.text || resp.data?.output || "";
      const state = resp.data?.state || {};
      const variables = resp.data?.variables || {};
      return { outputText, state, variables };
    }
    throw err;
  }
}

async function callResponsesAPI(inputText: string, sessionState?: any) {
  // Use the Responses API (assistant not provided). Uses a model.
  const response = await client.responses.create({
    model: DEFAULT_MODEL,
    input: inputText,
    // metadata can hold state
    metadata: sessionState ? { sessionState } : undefined,
    max_output_tokens: 512
  } as any);

  // Extract textual output
  const outputText = Array.isArray(response.output) ?
    response.output.map((o: any) => o.content).join("\n") :
    (response.output?.[0]?.content || response.output?.text || "");

  const state = (response as any).state || {};
  const variables = (response as any).variables || {};

  return { outputText: outputText.toString(), state, variables };
}

const openaiService = {
  async chatWithAssistant(input: ChatInput) {
    const maxAttempts = 3;
    let attempt = 0;
    let backoff = 500;

    while (attempt < maxAttempts) {
      attempt++;
      try {
        if (input.assistantId) {
          return await callAssistantsAPI(input.assistantId, input.inputText, input.sessionState);
        } else {
          return await callResponsesAPI(input.inputText, input.sessionState);
        }
      } catch (err: any) {
        logger.warn({ err, attempt }, "OpenAI request failed");

        // Retry for common transient errors (5xx, rate limit)
        const status = err?.response?.status;
        if (attempt < maxAttempts && (status === 429 || (status && status >= 500) || !status)) {
          await delay(backoff);
          backoff *= 2;
          continue;
        }
        // Non-transient or out of retries
        throw err;
      }
    }

    throw new Error("Failed to get response from OpenAI after retries");
  }
};

export default openaiService;