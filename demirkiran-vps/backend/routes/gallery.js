const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Multer konfigürasyonu - galeri resimleri için
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/gallery');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    
    // WebP format'ına çevir (eğer destekleniyorsa)
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      cb(null, 'gallery-' + uniqueSuffix + '.webp');
    } else {
      cb(null, 'gallery-' + uniqueSuffix + ext);
    }
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
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

// Galeri verilerini JSON dosyasında saklayacağız
const galleryDataPath = path.join(__dirname, '../data/gallery.json');

// Galeri verilerini yükle
const loadGalleryData = () => {
  try {
    if (fs.existsSync(galleryDataPath)) {
      const data = fs.readFileSync(galleryDataPath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading gallery data:', error);
    return [];
  }
};

// Galeri verilerini kaydet
const saveGalleryData = (data) => {
  try {
    const dir = path.dirname(galleryDataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(galleryDataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error saving gallery data:', error);
    throw error;
  }
};

// Tüm galeri resimlerini getir (public endpoint)
router.get('/', (req, res) => {
  try {
    const galleryItems = loadGalleryData();
    res.json(galleryItems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load gallery items' });
  }
});

// Yeni galeri resmi ekle (admin only)
router.post('/', authenticateToken, upload.single('image'), (req, res) => {
  try {
    const { title, description, category } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const galleryItems = loadGalleryData();
    const newItem = {
      id: Date.now().toString(),
      title: title || 'Untitled',
      description: description || '',
      category: category || 'general',
      image: `/uploads/gallery/${req.file.filename}`,
      createdAt: new Date().toISOString()
    };

    galleryItems.push(newItem);
    saveGalleryData(galleryItems);

    res.status(201).json(newItem);
  } catch (error) {
    console.error('Error adding gallery item:', error);
    res.status(500).json({ error: 'Failed to add gallery item' });
  }
});

// Galeri resmi güncelle (admin only)
router.put('/:id', authenticateToken, upload.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category } = req.body;
    
    const galleryItems = loadGalleryData();
    const itemIndex = galleryItems.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }

    // Eski resmi sil
    if (req.file && galleryItems[itemIndex].image) {
      const oldImagePath = path.join(__dirname, '..', galleryItems[itemIndex].image);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    galleryItems[itemIndex] = {
      ...galleryItems[itemIndex],
      title: title || galleryItems[itemIndex].title,
      description: description || galleryItems[itemIndex].description,
      category: category || galleryItems[itemIndex].category,
      image: req.file ? `/uploads/gallery/${req.file.filename}` : galleryItems[itemIndex].image,
      updatedAt: new Date().toISOString()
    };

    saveGalleryData(galleryItems);
    res.json(galleryItems[itemIndex]);
  } catch (error) {
    console.error('Error updating gallery item:', error);
    res.status(500).json({ error: 'Failed to update gallery item' });
  }
});

// Galeri resmi sil (admin only)
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const galleryItems = loadGalleryData();
    const itemIndex = galleryItems.findIndex(item => item.id === id);
    
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }

    // Resmi sil
    if (galleryItems[itemIndex].image) {
      const imagePath = path.join(__dirname, '..', galleryItems[itemIndex].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    galleryItems.splice(itemIndex, 1);
    saveGalleryData(galleryItems);

    res.json({ message: 'Gallery item deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({ error: 'Failed to delete gallery item' });
  }
});

module.exports = router; 