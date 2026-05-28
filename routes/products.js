const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { Product } = require('../database/models');
const { verifyAdmin } = require('./auth');

// Setup multer for product image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'public', 'images'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `product-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/products - All products (public)
router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({ order: [['id', 'ASC']] });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products - Create product (admin)
router.post('/', verifyAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, available } = req.body;
    const imageUrl = req.file ? `/images/${req.file.filename}` : null;
    const product = await Product.create({
      name, description, price: parseFloat(price),
      imageUrl, available: available !== 'false',
    });
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/products/:id - Update product (admin)
router.patch('/:id', verifyAdmin, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

    const { name, description, price, available } = req.body;
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = parseFloat(price);
    if (available !== undefined) product.available = available !== 'false';
    if (req.file) product.imageUrl = `/images/${req.file.filename}`;

    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id - Delete product (admin)
router.delete('/:id', verifyAdmin, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
    await product.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
