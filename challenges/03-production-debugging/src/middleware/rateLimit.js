'use strict';

function createRateLimiter(options = {}) {
  const maxRequests = options.maxRequests || 100;
  const windowMs = options.windowMs || 60000;
  const clients = new Map();

  return function rateLimitMiddleware(req, res, next) {
    const clientId = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();

    let clientData = clients.get(clientId);

    if (!clientData || now - clientData.windowStart > windowMs) {
      clientData = { count: 0, windowStart: now };
      clients.set(clientId, clientData);
    }

    if (clientData.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((clientData.windowStart + windowMs - now) / 1000),
      });
    }

    clientData.count++;

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', maxRequests - clientData.count);

    next();
  };
}

module.exports = createRateLimiter;
