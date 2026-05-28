const { DataTypes } = require('sequelize');
const sequelize = require('../connection');

const Order = sequelize.define('Order', {
  customerName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerPhone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  items: {
    // Stored as JSON string: [{productId, productName, quantity}]
    type: DataTypes.TEXT,
    allowNull: false,
    get() {
      const raw = this.getDataValue('items');
      try { return JSON.parse(raw); } catch { return []; }
    },
    set(val) {
      this.setDataValue('items', JSON.stringify(val));
    },
  },
  deliveryPoint: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'delivered'),
    defaultValue: 'pending',
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  orderedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  confirmedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'orders',
  timestamps: false,
});

module.exports = Order;
