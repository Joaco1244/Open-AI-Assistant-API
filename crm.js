/**
 * CRM connector helper
 * Example: HubSpot minimal integration helper. Expand as needed.
 */

const axios = require("axios");
const logger = require("pino")();

const HUBSPOT_BASE = "https://api.hubapi.com";

async function createHubSpotContact(hubspotApiKey, contact) {
  try {
    const resp = await axios.post(
      `${HUBSPOT_BASE}/crm/v3/objects/contacts`,
      { properties: contact },
      { headers: { Authorization: `Bearer ${hubspotApiKey}`, "Content-Type": "application/json" } }
    );
    return resp.data;
  } catch (err) {
    logger.error({ err: err?.response?.data || err }, "Failed creating HubSpot contact");
    throw err;
  }
}

module.exports = { createHubSpotContact };