const { DataTypes } = require('sequelize');
const sequelize = require('../connection');

const Product = sequelize.define('Product', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'products',
  timestamps: true,
});

module.exports = Product;
