const sequelize = require('../connection');
const Product = require('./Product');
const Order = require('./Order');

// Sync all models and seed initial products if empty
async function initDB() {
  await sequelize.sync({ alter: true });

  const count = await Product.count();
  if (count === 0) {
    await Product.bulkCreate([
      {
        name: 'Brownie',
        description: 'Brownie de chocolate intenso, suave por dentro y crujiente por fuera. ¡Irresistible!',
        price: 30,
        imageUrl: '/images/brownie.jpeg',
        available: true,
      },
      {
        name: 'Galleta Red Velvet',
        description: 'Galleta de red velvet con centro de crema, suave y con ese sabor especial que encanta.',
        price: 25,
        imageUrl: '/images/red-velvet.jpeg',
        available: true,
      },
      {
        name: 'Pay de Queso',
        description: 'Pay de queso cremoso con base crujiente. Porciones individuales o pay completo.',
        price: 45,
        imageUrl: '/images/pay-queso.jpeg',
        available: true,
      },
      {
        name: 'Pastel / Torta',
        description: 'Pasteles personalizados para cualquier ocasión. Consulta disponibilidad y diseños.',
        price: 250,
        imageUrl: '/images/torta.jpeg',
        available: true,
      },
    ]);
    console.log('✅ Productos de prueba creados');
  }
}

module.exports = { sequelize, Product, Order, initDB };
