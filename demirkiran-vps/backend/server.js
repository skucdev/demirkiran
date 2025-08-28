const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// MongoDB bağlantısı
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB'ye bağlan ve server'ı başlat
const startServer = async () => {
  try {
    // MongoDB'ye bağlan
    await connectDB();
    
    // CORS ayarları
    const corsOptions = {
      origin: function (origin, callback) {
        // Development'ta tüm origin'lere izin ver (local ağ dahil)
        if (process.env.NODE_ENV === 'development') {
          // Local ağ IP'lerine de izin ver (192.168.x.x, 10.x.x.x, 172.x.x.x)
          if (!origin || 
              origin.includes('localhost') || 
              origin.includes('127.0.0.1') ||
              origin.includes('192.168.') ||
              origin.includes('10.') ||
              origin.includes('172.')) {
            callback(null, true);
          } else {
            callback(null, true); // Development'ta genel olarak izin ver
          }
        } else {
          // Production'da sadece belirtilen origin'e izin ver
          const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('CORS policy violation'));
          }
        }
      },
      credentials: true,
      optionsSuccessStatus: 200,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };

    // Middleware
    app.use(cors(corsOptions));
    
    // Compression middleware (production'da)
    if (process.env.NODE_ENV === 'production') {
      try {
        const compression = require('compression');
        app.use(compression());
      } catch (error) {
        console.log('⚠️ Compression middleware not available');
      }
    }
    
    app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '5mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Uploads klasörünü statik dosya olarak serve et
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Uploads klasörünü serve et (cache headers ile)
    app.use('/uploads', express.static(uploadsDir, {
      maxAge: '1y',
      etag: true,
      lastModified: true
    }));
    
    console.log(`📁 Uploads directory served at: /uploads`);
    console.log(`📂 Physical path: ${uploadsDir}`);

    // Routes
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/menu', require('./routes/menu'));
    app.use('/api/gallery', require('./routes/gallery'));

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        message: 'Demirkıran API is running',
        database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      });
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('Error:', err.stack);
      
      if (err.message === 'CORS policy violation') {
        return res.status(403).json({ 
          error: 'CORS policy violation',
          message: 'Origin not allowed'
        });
      }
      
      res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
      });
    });

    // Server'ı başlat
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 Network access: http://0.0.0.0:${PORT}`);
      console.log(`📡 CORS Origin: ${process.env.CORS_ORIGIN || 'All (development)'}`);
      console.log(`🗜️ Compression: ${process.env.NODE_ENV === 'production' ? 'Enabled' : 'Disabled'}`);
      console.log(`🌐 Local Network Access: http://192.168.0.11:${PORT}`);
    });

  } catch (error) {
    console.error('❌ Server başlatılamadı:', error);
    process.exit(1);
  }
};

// Server'ı başlat
startServer(); 