#!/bin/bash

# Demirkıran VPS Deploy Script
# Bu script'i VPS'inizde çalıştırın

echo "🚀 Demirkıran VPS Deploy başlatılıyor..."

# Gerekli paketleri yükle
echo "📦 Sistem paketleri güncelleniyor..."
sudo apt update && sudo apt upgrade -y

# Node.js ve npm yükle
echo "🔧 Node.js yükleniyor..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 yükle
echo "⚡ PM2 yükleniyor..."
sudo npm install -g pm2

# Nginx yükle
echo "🌐 Nginx yükleniyor..."
sudo apt install nginx -y

# MongoDB yükle
echo "🗄️ MongoDB yükleniyor..."
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# MongoDB servisini başlat
echo "🔄 MongoDB servisi başlatılıyor..."
sudo systemctl start mongod
sudo systemctl enable mongod

# Uygulama klasörünü oluştur
echo "📁 Uygulama klasörü oluşturuluyor..."
sudo mkdir -p /var/www/demirkiran-vps
sudo chown -R $USER:$USER /var/www/demirkiran-vps

# Dosyaları kopyala (bu script'i proje klasöründe çalıştırın)
echo "📋 Dosyalar kopyalanıyor..."
cp -r * /var/www/demirkiran-vps/

# Backend dependencies yükle
echo "📚 Backend dependencies yükleniyor..."
cd /var/www/demirkiran-vps/backend
npm install --production

# Logs klasörü oluştur
mkdir -p /var/www/demirkiran-vps/logs

# Nginx konfigürasyonu
echo "⚙️ Nginx konfigürasyonu..."
sudo cp /var/www/demirkiran-vps/nginx.conf /etc/nginx/sites-available/demirkiran
sudo ln -sf /etc/nginx/sites-available/demirkiran /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx syntax kontrolü
sudo nginx -t

# Nginx restart
sudo systemctl restart nginx
sudo systemctl enable nginx

# Firewall ayarları
echo "🔥 Firewall ayarları..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# PM2 ile backend başlat
echo "🚀 Backend başlatılıyor..."
cd /var/www/demirkiran-vps
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo "✅ Deploy tamamlandı!"
echo "🌐 Frontend: http://your-domain.com"
echo "🔧 Backend: http://your-domain.com:5000"
echo "📊 PM2 Status: pm2 status"
echo "📝 Logs: pm2 logs demirkiran-backend"
