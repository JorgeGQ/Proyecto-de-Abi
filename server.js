require('dotenv').config();
const express = require('express');
const path = require('path');
const os = require('os');
const { initDB } = require('./database/models');
const { router: authRouter } = require('./routes/auth');
const ordersRouter = require('./routes/orders');
const productsRouter = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/products', productsRouter);

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fallback to index
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get local network IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Init DB and start server on all interfaces (0.0.0.0) for phone access
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log('\n🍰 ==========================================');
    console.log('   Postres Abi - Servidor iniciado');
    console.log('==========================================');
    console.log(`\n💻 En esta PC:    http://localhost:${PORT}`);
    console.log(`📱 En tu celular: http://${localIP}:${PORT}`);
    console.log(`👑 Panel de Abi:  http://${localIP}:${PORT}/admin`);
    console.log('\n⚠️  Asegúrate que tu celular esté en el mismo WiFi');
    console.log('==========================================\n');
  });
}).catch(err => {
  console.error('Error al inicializar la base de datos:', err);
  process.exit(1);
});
