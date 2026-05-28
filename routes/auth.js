const express = require('express');
const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD || 'adminabi123';

  if (password === adminPassword) {
    // Simple session token (timestamp + secret hash)
    const token = Buffer.from(`abi:${Date.now()}:${adminPassword}`).toString('base64');
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
  }
});

// Middleware to verify admin token
function verifyAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Sin autorización' });

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const adminPassword = process.env.ADMIN_PASSWORD || 'adminabi123';
    if (decoded.startsWith('abi:') && decoded.endsWith(`:${adminPassword}`)) {
      return next();
    }
    return res.status(401).json({ error: 'Token inválido' });
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = { router, verifyAdmin };
