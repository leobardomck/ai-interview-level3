'use strict';

const { getDatabase } = require('../db/database');

class UserService {
  createUser(name, email) {
    const db = getDatabase();
    const token = 'tok_' + Math.random().toString(36).substring(2, 15);
    const stmt = db.prepare('INSERT INTO users (name, email, token) VALUES (?, ?, ?)');
    const result = stmt.run(name, email, token);
    return this.getUserById(result.lastInsertRowid);
  }

  getUserById(id) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }

  getUserByToken(token) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE token = ?').get(token);
  }

  getUserByEmail(email) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  getAllUsers() {
    const db = getDatabase();
    return db.prepare('SELECT id, name, email, created_at FROM users').all();
  }

  deleteUser(id) {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  }
}

module.exports = new UserService();
