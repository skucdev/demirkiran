# Demirkıran VPS Deploy Guide

Bu klasör, Demirkıran Tesisleri web uygulamasını VPS'e deploy etmek için gerekli tüm dosyaları içerir.

## 📁 Klasör Yapısı

```
demirkiran-vps/
├── public/                    # Frontend build dosyaları (Nginx tarafından serve edilir)
│   ├── index.html
│   ├── assets/
│   └── sw.js
├── backend/                   # Node.js backend kodu
│   ├── server.js
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── config/
│   ├── uploads/
│   └── package.json
├── ecosystem.config.js        # PM2 process manager konfigürasyonu
├── nginx.conf                 # Nginx reverse proxy konfigürasyonu
├── env.production            # Production environment variables
├── deploy.sh                 # Otomatik deploy script'i
└── README.md                 # Bu dosya
```

## 🚀 Hızlı Deploy

### 1. VPS'e Bağlanın
```bash
ssh root@your-vps-ip
```

### 2. Dosyaları VPS'e Kopyalayın
```bash
# Local bilgisayarınızda:
scp -r demirkiran-vps/* root@your-vps-ip:/tmp/demirkiran-vps/
```

### 3. Deploy Script'ini Çalıştırın
```bash
# VPS'de:
cd /tmp/demirkiran-vps
chmod +x deploy.sh
./deploy.sh
```

## ⚙️ Manuel Kurulum

### Gereksinimler
- Ubuntu 20.04+ veya Debian 11+
- Root veya sudo yetkisi
- Domain adı (opsiyonel)

### 1. Sistem Güncellemesi
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Node.js Kurulumu
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. PM2 Kurulumu
```bash
sudo npm install -g pm2
```

### 4. Nginx Kurulumu
```bash
sudo apt install nginx -y
```

### 5. MongoDB Kurulumu
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 6. Uygulama Kurulumu
```bash
# Uygulama klasörünü oluştur
sudo mkdir -p /var/www/demirkiran-vps
sudo chown -R $USER:$USER /var/www/demirkiran-vps

# Dosyaları kopyala
cp -r * /var/www/demirkiran-vps/

# Backend dependencies yükle
cd /var/www/demirkiran-vps/backend
npm install --production
```

### 7. Nginx Konfigürasyonu
```bash
# Nginx config kopyala
sudo cp /var/www/demirkiran-vps/nginx.conf /etc/nginx/sites-available/demirkiran

# Site'ı aktif et
sudo ln -sf /etc/nginx/sites-available/demirkiran /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Syntax kontrolü
sudo nginx -t

# Nginx restart
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 8. Backend Başlatma
```bash
cd /var/www/demirkiran-vps
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## 🔧 Konfigürasyon

### Environment Variables
`env.production` dosyasını `.env` olarak kopyalayın ve değerleri güncelleyin:

```bash
cp env.production .env
nano .env
```

**Önemli değişiklikler:**
- `JWT_SECRET`: Güçlü bir rastgele string
- `MONGODB_URI_PROD`: MongoDB bağlantı string'i
- `CORS_ORIGIN`: Domain adınız

### Nginx Konfigürasyonu
`nginx.conf` dosyasında:
- `server_name` değerini domain adınızla değiştirin
- SSL sertifikası eklemek için ek konfigürasyon gerekir

### MongoDB
- Local MongoDB: `mongodb://localhost:27017/demirkiran_db`
- MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net/demirkiran_db`

## 📊 Yönetim

### PM2 Komutları
```bash
# Status kontrolü
pm2 status

# Logları görüntüle
pm2 logs demirkiran-backend

# Restart
pm2 restart demirkiran-backend

# Stop
pm2 stop demirkiran-backend
```

### Nginx Komutları
```bash
# Status kontrolü
sudo systemctl status nginx

# Restart
sudo systemctl restart nginx

# Reload config
sudo nginx -s reload
```

### MongoDB Komutları
```bash
# Status kontrolü
sudo systemctl status mongod

# Restart
sudo systemctl restart mongod

# MongoDB shell
mongosh
```

## 🔒 Güvenlik

### Firewall
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### SSL Sertifikası (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 🐛 Sorun Giderme

### Backend Çalışmıyor
```bash
# Logları kontrol et
pm2 logs demirkiran-backend

# Port kullanımını kontrol et
sudo netstat -tlnp | grep :5000

# Process'i yeniden başlat
pm2 restart demirkiran-backend
```

### Nginx Çalışmıyor
```bash
# Syntax kontrolü
sudo nginx -t

# Error logları
sudo tail -f /var/log/nginx/error.log

# Status kontrolü
sudo systemctl status nginx
```

### MongoDB Bağlantı Hatası
```bash
# MongoDB servis durumu
sudo systemctl status mongod

# Port kontrolü
sudo netstat -tlnp | grep :27017

# MongoDB logları
sudo tail -f /var/log/mongodb/mongod.log
```

## 📝 Güncelleme

### Frontend Güncelleme
```bash
# Yeni build dosyalarını kopyala
cp -r new-build/* /var/www/demirkiran-vps/public/

# Nginx reload
sudo nginx -s reload
```

### Backend Güncelleme
```bash
# Yeni dosyaları kopyala
cp -r new-backend/* /var/www/demirkiran-vps/backend/

# Dependencies güncelle
cd /var/www/demirkiran-vps/backend
npm install --production

# PM2 restart
pm2 restart demirkiran-backend
```

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Logları kontrol edin
2. PM2 ve Nginx status'ünü kontrol edin
3. Firewall ayarlarını kontrol edin
4. MongoDB bağlantısını test edin

---

**Not:** Bu deploy guide production ortamı için hazırlanmıştır. Development ortamında farklı konfigürasyonlar gerekebilir.
