const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Multer konfigürasyonu - dosya upload için
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/menu');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'menu-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Menü verilerini JSON dosyasında saklayacağız (gerçek uygulamada veritabanı kullanılır)
const menuDataPath = path.join(__dirname, '../data/menu.json');

// Menü verilerini yükle
const loadMenuData = () => {
  try {
    if (fs.existsSync(menuDataPath)) {
      const data = fs.readFileSync(menuDataPath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading menu data:', error);
    return [];
  }
};

// Menü verilerini kaydet
const saveMenuData = (data) => {
  try {
    const dir = path.dirname(menuDataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(menuDataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving menu data:', error);
    throw error;
  }
};

// Tüm menü öğelerini getir (public endpoint)
router.get('/', (req, res) => {
  try {
    const menuItems = loadMenuData();
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load menu items' });
  }
});

// Yeni menü öğesi ekle (admin only)
router.post('/', authenticateToken, upload.single('image'), (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    
    if (!name || !price) {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const menuItems = loadMenuData();
    const newItem = {
      id: Date.now().toString(),
      name,
      description: description || '',
      price: parseFloat(price),
      category: category || 'main',
      image: req.file ? `/uploads/menu/${req.file.filename}` : null,
      createdAt: new Date().toISOString()
    };

    menuItems.push(newItem);
    saveMenuData(menuItems);

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding menu item:', error);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

// Menü öğesi güncelle (admin only)
router.put('/:id', authenticateToken, upload.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category } = req.body;
    
    const menuItems = loadMenuData();
    const itemIndex = menuItems.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Eski resmi sil
    if (req.file && menuItems[itemIndex].image) {
      const oldImagePath = path.join(__dirname, '..', menuItems[itemIndex].image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    menuItems[itemIndex] = {
      ...menuItems[itemIndex],
      name: name || menuItems[itemIndex].name,
      description: description || menuItems[itemIndex].description,
      price: price ? parseFloat(price) : menuItems[itemIndex].price,
      category: category || menuItems[itemIndex].category,
      image: req.file ? `/uploads/menu/${req.file.filename}` : menuItems[itemIndex].image,
      updatedAt: new Date().toISOString()
    };

    saveMenuData(menuItems);
    res.json(menuItems[itemIndex]);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Menü öğesi sil (admin only)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const menuItems = loadMenuData();
    const itemIndex = menuItems.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Resmi sil
    if (menuItems[itemIndex].image) {
      const imagePath = path.join(__dirname, '..', menuItems[itemIndex].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    menuItems.splice(itemIndex, 1);
    saveMenuData(menuItems);

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

module.exports = router; 