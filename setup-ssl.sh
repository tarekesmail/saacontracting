#!/bin/bash

# SAA Contracting - SSL Setup with Let's Encrypt
# Domain: saacontracting.com

echo "🔒 Setting up SSL for SAA Contracting"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Install Certbot
echo "📦 Installing Certbot..."
apt update
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
echo "🔐 Obtaining SSL certificate..."
certbot --nginx -d saacontracting.com -d www.saacontracting.com --non-interactive --agree-tos --email admin@saacontracting.com

# Enable HTTPS configuration in Nginx
echo "🌐 Enabling HTTPS configuration..."
sed -i 's/# server {/server {/g' /etc/nginx/sites-available/saacontracting.com.conf
sed -i 's/# }/}/g' /etc/nginx/sites-available/saacontracting.com.conf
sed -i 's/#     /    /g' /etc/nginx/sites-available/saacontracting.com.conf

# Test and reload Nginx
if nginx -t; then
    systemctl reload nginx
    echo "✅ SSL configured successfully!"
    echo "🌐 Your site is now available at: https://saacontracting.com"
else
    echo "❌ Nginx configuration error after SSL setup"
    exit 1
fi

# Setup auto-renewal
echo "🔄 Setting up SSL auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo ""
echo "🎉 SSL Setup Complete!"
echo "   🔒 HTTPS: https://saacontracting.com"
echo "   🔄 Auto-renewal: Configured"
echo "   📅 Certificate expires in 90 days (auto-renews)"