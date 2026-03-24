'use strict';

const request = require('supertest');
const path = require('path');
const { createApp } = require('../src/server');
const { getDatabase, closeDatabase, resetDatabase } = require('../src/db/database');
const cacheService = require('../src/services/cacheService');

let app;

beforeAll(() => {
  app = createApp(':memory:');
});

beforeEach(() => {
  resetDatabase();
  cacheService.clear();
});

afterAll(() => {
  closeDatabase();
});

// ─── Helper functions ────────────────────────────────────────────────

async function createTestUser(name, email) {
  const res = await request(app)
    .post('/api/users')
    .send({ name, email });
  return res.body;
}

async function createTestProduct(name, price, inventory) {
  const db = getDatabase();
  const stmt = db.prepare('INSERT INTO products (name, price, inventory) VALUES (?, ?, ?)');
  const result = stmt.run(name, price, inventory);
  return db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
}

// ─── Health check ────────────────────────────────────────────────────

describe('Health Check', () => {
  test('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});

// ─── User endpoints (working correctly) ──────────────────────────────

describe('User CRUD', () => {
  test('POST /api/users creates a user', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Alice', email: 'alice@example.com' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('name', 'Alice');
    expect(res.body).toHaveProperty('token');
  });

  test('POST /api/users rejects duplicate email', async () => {
    await createTestUser('Alice', 'alice@test.com');
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Alice2', email: 'alice@test.com' });
    expect(res.status).toBe(409);
  });

  test('POST /api/users requires name and email', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'NoEmail' });
    expect(res.status).toBe(400);
  });

  test('GET /api/users lists all users', async () => {
    await createTestUser('User1', 'u1@test.com');
    await createTestUser('User2', 'u2@test.com');
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('GET /api/users/:id returns a user', async () => {
    const user = await createTestUser('Bob', 'bob@test.com');
    const res = await request(app).get(`/api/users/${user.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name', 'Bob');
  });

  test('GET /api/users/:id returns 404 for missing user', async () => {
    const res = await request(app).get('/api/users/9999');
    expect(res.status).toBe(404);
  });

  test('DELETE /api/users/:id deletes a user', async () => {
    const user = await createTestUser('Del', 'del@test.com');
    const res = await request(app).delete(`/api/users/${user.id}`);
    expect(res.status).toBe(204);
  });
});

// ─── Order endpoints (some buggy) ────────────────────────────────────

describe('Order Creation', () => {
  test('POST /api/orders creates an order with valid auth', async () => {
    const user = await createTestUser('Buyer', 'buyer@test.com');
    const product = await createTestProduct('Widget', 29.99, 100);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', user.token)
      .send({ productId: product.id, quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('user_id', user.id);
    expect(res.body).toHaveProperty('quantity', 2);
  });

  test('POST /api/orders rejects missing productId', async () => {
    const user = await createTestUser('Buyer2', 'buyer2@test.com');
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', user.token)
      .send({ quantity: 1 });
    expect(res.status).toBe(400);
  });

  test('POST /api/orders rejects quantity < 1', async () => {
    const user = await createTestUser('Buyer3', 'buyer3@test.com');
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', user.token)
      .send({ productId: 1, quantity: 0 });
    expect(res.status).toBe(400);
  });

  test('GET /api/orders returns user orders', async () => {
    const user = await createTestUser('Lister', 'lister@test.com');
    const product = await createTestProduct('Item', 10, 50);

    await request(app)
      .post('/api/orders')
      .set('Authorization', user.token)
      .send({ productId: product.id, quantity: 1 });

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', user.token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

// ─── Bug-exposing tests ──────────────────────────────────────────────

describe('Bug: Cache memory leak', () => {
  test('cache entries should be evicted after TTL expires', async () => {
    cacheService.set('test_key', 'test_value', 100); // 100ms TTL
    expect(cacheService.get('test_key')).toBe('test_value');

    await new Promise((resolve) => setTimeout(resolve, 200));

    // After TTL, the automatic cleanup should have removed the entry
    // from the store (not just return null from get — the entry itself
    // should be gone from the map)
    expect(cacheService.size()).toBe(0);
  });

  test('cache does not grow unbounded with many short-TTL entries', async () => {
    for (let i = 0; i < 50; i++) {
      cacheService.set(`key_${i}`, `value_${i}`, 50);
    }
    expect(cacheService.size()).toBe(50);

    await new Promise((resolve) => setTimeout(resolve, 150));

    // All entries should have been cleaned up by their TTL timers
    expect(cacheService.size()).toBe(0);
  });
});

describe('Bug: Race condition in order creation', () => {
  test('concurrent orders should not oversell inventory', async () => {
    const user = await createTestUser('Racer', 'racer@test.com');
    const product = await createTestProduct('Limited', 50, 1);

    // Send two concurrent orders for the same product with only 1 in stock
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/orders')
        .set('Authorization', user.token)
        .send({ productId: product.id, quantity: 1 }),
      request(app)
        .post('/api/orders')
        .set('Authorization', user.token)
        .send({ productId: product.id, quantity: 1 }),
    ]);

    // One should succeed, one should fail
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toContain(201);
    // The failing one should NOT be 200 — it should indicate an error
    const failedCount = [res1.status, res2.status].filter((s) => s >= 400).length;
    expect(failedCount).toBe(1);

    // Inventory should never go negative
    const db = getDatabase();
    const updatedProduct = db.prepare('SELECT inventory FROM products WHERE id = ?').get(product.id);
    expect(updatedProduct.inventory).toBeGreaterThanOrEqual(0);
  });
});

describe('Bug: Auth middleware leaks user identity', () => {
  test('request without token should not inherit previous user', async () => {
    const user1 = await createTestUser('AuthUser1', 'auth1@test.com');
    const product = await createTestProduct('AuthProduct', 10, 100);

    // First request with valid token — establishes user
    await request(app)
      .post('/api/orders')
      .set('Authorization', user1.token)
      .send({ productId: product.id, quantity: 1 });

    // Second request WITHOUT token — should be rejected, not use cached user
    const res = await request(app)
      .post('/api/orders')
      .send({ productId: product.id, quantity: 1 });

    expect(res.status).toBe(401);
  });

  test('request with invalid token should not inherit previous user', async () => {
    const user1 = await createTestUser('AuthUser2', 'auth2@test.com');
    const product = await createTestProduct('AuthProd2', 15, 50);

    // First request with valid token
    await request(app)
      .post('/api/orders')
      .set('Authorization', user1.token)
      .send({ productId: product.id, quantity: 1 });

    // Second request with INVALID token — should be rejected
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', 'tok_invalid_garbage')
      .send({ productId: product.id, quantity: 1 });

    expect(res.status).toBe(401);
  });
});

describe('Bug: Rate limiter off-by-one', () => {
  test('rate limiter should block at exactly maxRequests, not maxRequests+1', async () => {
    // Create a fresh app with a low rate limit for testing
    const limitedApp = createApp(':memory:');
    const testMaxRequests = 5;

    // We need to directly test the rate limiter behavior
    // Make maxRequests requests — all should succeed
    const results = [];
    for (let i = 0; i < testMaxRequests + 2; i++) {
      const res = await request(app).get('/health');
      results.push(res.status);
    }

    // With the default 100 limit, this test uses the main app
    // Let's test the boundary more precisely with the rate limiter
    // For the actual bug: the limiter allows maxRequests + 1 before blocking
    // We create a custom app with limit of 3
    const { createApp: createFreshApp } = require('../src/server');

    // Test rate limiter directly
    const createRateLimiter = require('../src/middleware/rateLimit');
    const express = require('express');
    const testApp = express();

    testApp.use(createRateLimiter({ maxRequests: 3, windowMs: 60000 }));
    testApp.get('/test', (req, res) => res.json({ ok: true }));

    const responses = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(testApp).get('/test');
      responses.push(res.status);
    }

    // With maxRequests=3, requests 1-3 should be 200, request 4+ should be 429
    // Bug: allows 4 requests (3+1) before blocking
    expect(responses[0]).toBe(200);
    expect(responses[1]).toBe(200);
    expect(responses[2]).toBe(200);
    expect(responses[3]).toBe(429); // This fails — gets 200 due to >= vs >
  });
});

describe('Bug: Silent error swallowing in order route', () => {
  test('order creation with non-existent product should return error status', async () => {
    const user = await createTestUser('ErrUser', 'err@test.com');

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', user.token)
      .send({ productId: 99999, quantity: 1 });

    // Should return 4xx or 5xx, NOT 200
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  test('order creation with insufficient inventory should return error status', async () => {
    const user = await createTestUser('InvUser', 'inv@test.com');
    const product = await createTestProduct('Scarce', 100, 1);

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', user.token)
      .send({ productId: product.id, quantity: 999 });

    // Should return 4xx, NOT 200
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body).toHaveProperty('error');
  });

  test('failed order should not return success message', async () => {
    const user = await createTestUser('MsgUser', 'msg@test.com');

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', user.token)
      .send({ productId: 77777, quantity: 1 });

    // Should NOT contain a success message when the order failed
    expect(res.body.message).not.toBe('Order processed successfully');
  });
});
