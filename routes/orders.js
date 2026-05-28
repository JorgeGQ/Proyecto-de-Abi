const express = require('express');
const router = express.Router();
const { Order } = require('../database/models');
const { verifyAdmin } = require('./auth');

// GET /api/orders - All orders (admin)
router.get('/', verifyAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const orders = await Order.findAll({
      where,
      order: [['orderedAt', 'DESC']],
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/summary - Daily summary (admin)
router.get('/summary', verifyAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    let orders;

    if (date) {
      // Filter orders for a specific date
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);

      const { Op } = require('sequelize');
      orders = await Order.findAll({
        where: {
          status: ['pending', 'confirmed'],
          orderedAt: { [Op.between]: [start, end] },
        },
      });
    } else {
      orders = await Order.findAll({
        where: { status: ['pending', 'confirmed'] },
      });
    }

    // Aggregate items
    const summary = {};
    for (const order of orders) {
      const items = order.items;
      for (const item of items) {
        const key = item.productName;
        if (!summary[key]) summary[key] = 0;
        summary[key] += item.quantity;
      }
    }

    res.json({ summary, total: orders.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/orders - Create new order (public)
router.post('/', async (req, res) => {
  try {
    const { customerName, customerPhone, items, deliveryPoint, note } = req.body;
    if (!customerName || !customerPhone || !items || items.length === 0) {
      return res.status(400).json({ error: 'Nombre, teléfono y productos son requeridos' });
    }

    // Calculate total price securely on the server using database product prices
    const { Product } = require('../database/models');
    let totalPrice = 0;
    const itemsWithUpdatedPrices = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId);
      if (product) {
        const itemPrice = Number(product.price);
        totalPrice += itemPrice * Number(item.quantity);
        itemsWithUpdatedPrices.push({
          productId: product.id,
          productName: product.name,
          quantity: Number(item.quantity),
          price: itemPrice,
        });
      }
    }

    const order = await Order.create({
      customerName,
      customerPhone,
      items: itemsWithUpdatedPrices,
      deliveryPoint,
      note,
      status: 'pending',
      price: totalPrice,
      orderedAt: new Date(),
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/confirm - Confirm order (admin)
router.patch('/:id/confirm', verifyAdmin, async (req, res) => {
  try {
    const { price } = req.body;
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    order.status = 'confirmed';
    // If a manual price override is sent in the body, use it. Otherwise, keep the pre-calculated price.
    if (price !== undefined && price !== null) {
      order.price = parseFloat(price);
    }
    order.confirmedAt = new Date();
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/deliver - Mark as delivered (admin)
router.patch('/:id/deliver', verifyAdmin, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/orders/:id - Delete order (admin)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    await order.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
