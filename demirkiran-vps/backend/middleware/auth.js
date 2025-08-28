const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Erişim token\'ı gereklidir'
      });
    }

    // Token'ı doğrula
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kullanıcının hala aktif olduğunu kontrol et
    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin || !admin.isActive) {
      return res.status(403).json({ 
        error: 'User not found or inactive',
        message: 'Kullanıcı bulunamadı veya aktif değil'
      });
    }

    // Hesap kilitli mi kontrol et
    if (admin.isLocked && admin.isLocked()) {
      return res.status(423).json({ 
        error: 'Account locked',
        message: 'Hesap kilitli. Lütfen daha sonra tekrar deneyin.'
      });
    }

    req.user = decoded;
    req.admin = admin;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'Geçersiz token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        error: 'Token expired',
        message: 'Token süresi dolmuş. Lütfen tekrar giriş yapın.'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Sunucu hatası oluştu'
    });
  }
};

// Role-based authorization
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Kimlik doğrulama gerekli'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: 'Bu işlem için yetkiniz bulunmuyor'
      });
    }

    next();
  };
};

module.exports = { authenticateToken, requireRole }; 