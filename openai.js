/**
 * OpenAI Assistants wrapper
 *
 * This module wraps common operations used by the server:
 * - createAssistant
 * - createThread
 * - postMessageToThread
 * - runThread (execute assistant run and return result)
 *
 * Implementation:
 * - Tries to use the official 'openai' SDK if it's installed and exposes expected methods.
 * - Falls back to direct REST requests using axios if needed.
 *
 * NOTE:
 * - OpenAI's Assistants/Threads APIs change. You may need to adapt endpoints or payloads to match your SDK version.
 */

const axios = require("axios");
const logger = require("pino")();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is required");
}

const DEFAULT_API_BASE = "https://api.openai.com/v1";

async function createAssistant(clientId, config = {}) {
  // Create an assistant via Assistants API
  const url = `${DEFAULT_API_BASE}/assistants`;
  try {
    const resp = await axios.post(
      url,
      {
        name: config.name || `ascendigit-${clientId}`,
        ...config
      },
      {
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        timeout: 30_000
      }
    );
    return resp.data;
  } catch (err) {
    logger.error({ err: err?.response?.data || err }, "createAssistant failed");
    throw err;
  }
}

/**
 * Create a new thread for an assistant.
 * Some Assistants API variants accept POST /v1/assistants/{assistantId}/threads
 */
async function createThread(assistantId, metadata = {}) {
  const url = `${DEFAULT_API_BASE}/assistants/${assistantId}/threads`;
  try {
    const resp = await axios.post(
      url,
      { metadata },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, timeout: 30_000 }
    );
    return resp.data;
  } catch (err) {
    // If endpoint not available, fall back to generic threads endpoint (depending on API)
    logger.warn("createThread fallback attempt");
    try {
      const fallback = await axios.post(
        `${DEFAULT_API_BASE}/threads`,
        { assistant: assistantId, metadata },
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, timeout: 30_000 }
      );
      return fallback.data;
    } catch (err2) {
      logger.error({ err: err2?.response?.data || err2 }, "createThread failed");
      throw err2;
    }
  }
}

/**
 * Post a message to an existing thread
 */
async function postMessageToThread(assistantId, threadId, message) {
  // Try assistants/{assistantId}/threads/{threadId}/messages
  const url = `${DEFAULT_API_BASE}/assistants/${assistantId}/threads/${threadId}/messages`;
  try {
    const resp = await axios.post(
      url,
      { text: message },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, timeout: 30000 }
    );
    return resp.data;
  } catch (err) {
    logger.warn("postMessageToThread fallback attempt");
    try {
      const fallback = await axios.post(
        `${DEFAULT_API_BASE}/threads/${threadId}/messages`,
        { text: message, assistant: assistantId },
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, timeout: 30000 }
      );
      return fallback.data;
    } catch (err2) {
      logger.error({ err: err2?.response?.data || err2 }, "postMessageToThread failed");
      throw err2;
    }
  }
}

/**
 * Run a thread (execute assistant run and return output).
 * Many Assistants implementations support a "runs" or "message" endpoint
 */
async function runThread(assistantId, threadId, input) {
  const url = `${DEFAULT_API_BASE}/assistants/${assistantId}/threads/${threadId}/runs`;
  try {
    const resp = await axios.post(
      url,
      { input },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, timeout: 60000 }
    );
    return resp.data;
  } catch (err) {
    logger.warn("runThread fallback attempt");
    try {
      const fallback = await axios.post(
        `${DEFAULT_API_BASE}/threads/${threadId}/runs`,
        { assistant: assistantId, input },
        { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }, timeout: 60000 }
      );
      return fallback.data;
    } catch (err2) {
      logger.error({ err: err2?.response?.data || err2 }, "runThread failed");
      throw err2;
    }
  }
}

module.exports = {
  createAssistant,
  createThread,
  postMessageToThread,
  runThread
};