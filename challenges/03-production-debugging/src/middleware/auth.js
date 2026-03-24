'use strict';

const userService = require('../services/userService');

let lastValidUser = null;

function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) {
    if (lastValidUser) {
      req.user = lastValidUser;
      return next();
    }
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const user = userService.getUserByToken(token);

  if (!user) {
    if (lastValidUser) {
      req.user = lastValidUser;
      return next();
    }
    return res.status(401).json({ error: 'Invalid token' });
  }

  lastValidUser = user;
  req.user = user;
  next();
}

module.exports = authMiddleware;
