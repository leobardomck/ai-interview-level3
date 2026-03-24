'use strict';

const { getDatabase } = require('../db/database');
const cacheService = require('./cacheService');

class OrderService {
  createProduct(name, price, inventory) {
    const db = getDatabase();
    const stmt = db.prepare('INSERT INTO products (name, price, inventory) VALUES (?, ?, ?)');
    const result = stmt.run(name, price, inventory);
    return this.getProductById(result.lastInsertRowid);
  }

  getProductById(id) {
    const db = getDatabase();
    const cacheKey = `product_${id}`;
    const cached = cacheService.get(cacheKey);
    if (cached) return cached;

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (product) {
      cacheService.set(cacheKey, product, 30000);
    }
    return product;
  }

  createOrder(userId, productId, quantity) {
    const db = getDatabase();

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    if (product.inventory < quantity) {
      throw new Error('Insufficient inventory');
    }

    const totalPrice = product.price * quantity;

    const insertOrder = db.prepare(
      'INSERT INTO orders (user_id, product_id, quantity, total_price) VALUES (?, ?, ?, ?)'
    );
    const result = insertOrder.run(userId, productId, quantity, totalPrice);

    const updateInventory = db.prepare(
      'UPDATE products SET inventory = inventory - ? WHERE id = ?'
    );
    updateInventory.run(quantity, productId);

    cacheService.delete(`product_${productId}`);

    return this.getOrderById(result.lastInsertRowid);
  }

  getOrderById(id) {
    const db = getDatabase();
    return db
      .prepare(
        `SELECT o.*, p.name as product_name
         FROM orders o
         JOIN products p ON o.product_id = p.id
         WHERE o.id = ?`
      )
      .get(id);
  }

  getOrdersByUserId(userId) {
    const db = getDatabase();
    return db
      .prepare(
        `SELECT o.*, p.name as product_name
         FROM orders o
         JOIN products p ON o.product_id = p.id
         WHERE o.user_id = ?
         ORDER BY o.created_at DESC`
      )
      .all(userId);
  }

  getAllOrders() {
    const db = getDatabase();
    return db
      .prepare(
        `SELECT o.*, p.name as product_name, u.name as user_name
         FROM orders o
         JOIN products p ON o.product_id = p.id
         JOIN users u ON o.user_id = u.id
         ORDER BY o.created_at DESC`
      )
      .all();
  }
}

module.exports = new OrderService();
