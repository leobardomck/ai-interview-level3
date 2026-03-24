'use strict';

const express = require('express');
const router = express.Router();
const userService = require('../services/userService');

router.post('/', (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  try {
    const user = userService.createUser(name, email);
    res.status(201).json(user);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.get('/', (req, res) => {
  const users = userService.getAllUsers();
  res.json(users);
});

router.get('/:id', (req, res) => {
  const user = userService.getUserById(parseInt(req.params.id, 10));
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

router.delete('/:id', (req, res) => {
  const deleted = userService.deleteUser(parseInt(req.params.id, 10));
  if (!deleted) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(204).send();
});

module.exports = router;
