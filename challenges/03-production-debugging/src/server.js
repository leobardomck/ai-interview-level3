'use strict';

const express = require('express');
const createRateLimiter = require('./middleware/rateLimit');
const userRoutes = require('./routes/users');
const orderRoutes = require('./routes/orders');
const { getDatabase } = require('./db/database');

function createApp(dbPath) {
  const app = express();

  getDatabase(dbPath);

  app.use(express.json());

  app.use(createRateLimiter({ maxRequests: 100, windowMs: 60000 }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/users', userRoutes);
  app.use('/api/orders', orderRoutes);

  app.use((err, req, res, _next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

if (require.main === module) {
  const port = process.env.PORT || 3000;
  const app = createApp();
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

module.exports = { createApp };
