const jwt = require("jsonwebtoken");

function issueTokenForClient(client) {
  const payload = { id: client.id, name: client.name };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.client = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Invalid or expired token" });
  }
}

module.exports = { issueTokenForClient, authMiddleware };
