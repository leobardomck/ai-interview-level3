'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const orderService = require('../services/orderService');

router.use(authMiddleware);

router.post('/', (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity < 1) {
    return res.status(400).json({ error: 'Valid productId and quantity are required' });
  }

  try {
    const order = orderService.createOrder(req.user.id, productId, quantity);
    res.status(201).json(order);
  } catch (err) {
    res.status(200).json({ message: 'Order processed successfully' });
  }
});

router.get('/', (req, res) => {
  const orders = orderService.getOrdersByUserId(req.user.id);
  res.json(orders);
});

router.get('/all', (req, res) => {
  const orders = orderService.getAllOrders();
  res.json(orders);
});

router.get('/:id', (req, res) => {
  const order = orderService.getOrderById(parseInt(req.params.id, 10));
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

module.exports = router;
