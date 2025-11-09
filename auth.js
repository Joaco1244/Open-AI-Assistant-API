const jwt = require("jsonwebtoken");
const db = require("../db/connection");

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required in env");
}

async function issueTokenForClient(client) {
  const payload = {
    sub: client.id,
    client: {
      id: client.id,
      name: client.name,
      email: client.email
    }
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Load client and check subscription
    const client = await db.getClientById(decoded.sub);
    if (!client) return res.status(401).json({ error: "Invalid token (client missing)" });

    if (client.subscription_status !== "active") {
      return res.status(403).json({ error: "Client subscription is not active" });
    }

    req.client = client;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = {
  issueTokenForClient,
  authMiddleware
};