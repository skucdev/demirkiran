const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Kullanıcı adı gereklidir'],
    unique: true,
    trim: true,
    minlength: [3, 'Kullanıcı adı en az 3 karakter olmalıdır'],
    maxlength: [30, 'Kullanıcı adı en fazla 30 karakter olabilir'],
    match: [/^[a-zA-Z0-9_]+$/, 'Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir']
  },
  password: {
    type: String,
    required: [true, 'Şifre gereklidir'],
    minlength: [6, 'Şifre en az 6 karakter olmalıdır']
  },
  role: {
    type: String,
    default: 'admin',
    enum: {
      values: ['admin', 'super_admin'],
      message: 'Geçersiz rol'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index'ler
adminSchema.index({ username: 1 });
adminSchema.index({ isActive: 1 });

// Şifre hash'leme middleware
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Şifre karşılaştırma metodu
adminSchema.methods.comparePassword = async function(candidatePassword) {
  // Hesap kilitli mi kontrol et
  if (this.lockUntil && this.lockUntil > Date.now()) {
    throw new Error('Hesap kilitli. Lütfen daha sonra tekrar deneyin.');
  }
  
  const isMatch = await bcrypt.compare(candidatePassword, this.password);
  
  if (!isMatch) {
    // Başarısız giriş denemesi
    this.loginAttempts += 1;
    
    // 5 başarısız deneme sonrası hesabı kilitle
    if (this.loginAttempts >= 5) {
      this.lockUntil = Date.now() + 15 * 60 * 1000; // 15 dakika
    }
    
    await this.save();
    return false;
  }
  
  // Başarılı giriş - sayaçları sıfırla
  if (this.loginAttempts > 0) {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    await this.save();
  }
  
  return true;
};

// Hesap kilitli mi kontrol et
adminSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Hesap kilidini kaldır
adminSchema.methods.unlockAccount = function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return this.save();
};

module.exports = mongoose.model('Admin', adminSchema);
