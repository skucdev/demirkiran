const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Environment'a göre MongoDB URI seç
    const mongoURI = process.env.NODE_ENV === 'production' 
      ? process.env.MONGODB_URI_PROD 
      : process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/demirkiran_db';
    
    console.log(`🔗 Connecting to MongoDB...`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 URI: ${mongoURI.includes('localhost') ? 'localhost' : 'MongoDB Atlas'}`);
    
    const conn = await mongoose.connect(mongoURI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      bufferCommands: false
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`🗄️ Database: ${conn.connection.name}`);
    
    // Connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Local MongoDB servisini başlatın:');
      console.log('   Windows: MongoDB Compass kullanın veya MongoDB servisini başlatın');
      console.log('   macOS: brew services start mongodb-community');
      console.log('   Linux: sudo systemctl start mongod');
      console.log('   Docker: docker run -d -p 27017:27017 --name mongodb mongo:latest');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 MongoDB Atlas bağlantısını kontrol edin');
    } else if (error.message.includes('Authentication failed')) {
      console.log('💡 MongoDB Atlas kullanıcı adı/şifre kontrol edin');
    }
    
    console.log('❌ MongoDB bağlantısı olmadan server başlatılamaz');
    console.log('🔄 MongoDB servisini başlattıktan sonra tekrar deneyin');
    process.exit(1);
  }
};

module.exports = connectDB;
