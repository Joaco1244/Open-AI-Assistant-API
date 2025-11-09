const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const logger = require("pino")();

let pool;

module.exports = {
  initialize: async function () {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required");

    pool = new Pool({ connectionString });

    // Ensure DB is reachable
    await pool.query("SELECT 1");

    // Optionally run schema on first-run if table missing
    const schemaFile = path.join(__dirname, "schema.sql");
    if (fs.existsSync(schemaFile)) {
      // Basic check for clients table
      const res = await pool.query(`
        SELECT to_regclass('public.clients') as reg;
      `);
      if (!res.rows[0].reg) {
        logger.info("Clients table not found: initializing schema");
        const sql = fs.readFileSync(schemaFile, "utf8");
        await pool.query(sql);
      }
    }

    return pool;
  },

  getClientByApiKey: async function (apiKey) {
    const r = await pool.query("SELECT * FROM clients WHERE api_key = $1", [apiKey]);
    return r.rows[0] || null;
  },

  getClientById: async function (id) {
    const r = await pool.query("SELECT * FROM clients WHERE id = $1", [id]);
    return r.rows[0] || null;
  },

  createClient: async function (client) {
    const r = await pool.query(
      `INSERT INTO clients (id, name, email, business_name, openai_assistant_id, subscription_status, api_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [client.id, client.name, client.email, client.business_name, client.openai_assistant_id, client.subscription_status || "trial", client.api_key]
    );
    return r.rows[0];
  },

  query: function () {
    return pool.query.apply(pool, arguments);
  },

  pool
};