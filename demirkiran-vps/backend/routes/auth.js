const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const router = express.Router();
const mongoose = require('mongoose');

// Rate limiting için basit in-memory store
const loginAttempts = new Map();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 dakika
const MAX_ATTEMPTS = 5;

// Rate limiting middleware
const checkRateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { attempts: 0, resetTime: now + RATE_LIMIT_WINDOW });
  }
  
  const userAttempts = loginAttempts.get(ip);
  
  // Zaman aşımı kontrolü
  if (now > userAttempts.resetTime) {
    userAttempts.attempts = 0;
    userAttempts.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  if (userAttempts.attempts >= MAX_ATTEMPTS) {
    return res.status(429).json({
      error: 'Too many login attempts',
      message: 'Çok fazla başarısız deneme. 15 dakika sonra tekrar deneyin.',
      retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
    });
  }
  
  next();
};

// Admin oluşturma endpoint'i (sadece development'ta)
router.post('/register', async (req, res) => {
  try {
    // Production'da bu endpoint'i devre dışı bırak
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Registration disabled in production' });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Kullanıcı adı kontrolü
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Yeni admin oluştur
    const admin = new Admin({
      username,
      password,
      role: 'admin'
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin created successfully',
      user: {
        username: admin.username,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', checkRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required',
        message: 'Kullanıcı adı ve şifre gereklidir'
      });
    }

    // MongoDB bağlantısını kontrol et
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: 'Database connection error',
        message: 'MongoDB bağlantısı yok. Lütfen daha sonra tekrar deneyin.'
      });
    }

    // Kullanıcıyı bul
    const admin = await Admin.findOne({ username, isActive: true });
    if (!admin) {
      // Rate limiting'i artır
      const ip = req.ip || req.connection.remoteAddress;
      if (loginAttempts.has(ip)) {
        loginAttempts.get(ip).attempts++;
      }
      
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Kullanıcı adı veya şifre hatalı'
      });
    }

    // Şifre kontrolü
    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      // Rate limiting'i artır
      const ip = req.ip || req.connection.remoteAddress;
      if (loginAttempts.has(ip)) {
        loginAttempts.get(ip).attempts++;
      }
      
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Kullanıcı adı veya şifre hatalı'
      });
    }

    // Başarılı giriş - rate limiting'i sıfırla
    const ip = req.ip || req.connection.remoteAddress;
    if (loginAttempts.has(ip)) {
      loginAttempts.delete(ip);
    }

    // Son giriş zamanını güncelle
    admin.lastLogin = new Date();
    await admin.save();

    // JWT token oluştur
    const token = jwt.sign(
      { 
        id: admin._id,
        username: admin.username, 
        role: admin.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: admin._id,
        username: admin.username,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // MongoDB bağlantı hatası
    if (error.name === 'MongoNetworkError' || error.name === 'MongoTimeoutError') {
      return res.status(503).json({ 
        error: 'Database connection error',
        message: 'Veritabanına bağlanılamıyor. Lütfen daha sonra tekrar deneyin.'
      });
    }
    
    // Validation hatası
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'Geçersiz veri formatı.'
      });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Sunucu hatası oluştu'
    });
  }
});

// Token doğrulama endpoint'i
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kullanıcının hala aktif olduğunu kontrol et
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin || !admin.isActive) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }

    res.json({ 
      valid: true, 
      user: {
        id: admin._id,
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token expired' });
    }
    console.error('Token verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin bilgilerini getir
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin || !admin.isActive) {
      return res.status(403).json({ error: 'User not found or inactive' });
    }

    res.json({
      user: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 