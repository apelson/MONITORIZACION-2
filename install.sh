#!/bin/bash
#
# Siempria Network Monitor - Script de Instalación Automática
# Para Ubuntu 24.04 LTS
#
# Uso: sudo bash install.sh
#

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables de configuración
APP_DIR="/opt/siempria-monitor"
DB_NAME="siempria_monitor"
DOMAIN=""
ADMIN_EMAIL=""

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     SIEMPRIA NETWORK MONITOR - Instalador Automático       ║"
echo "║                    Ubuntu 24.04 LTS                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Este script debe ejecutarse como root (sudo)${NC}"
    exit 1
fi

# Solicitar información
echo -e "${YELLOW}Configuración inicial:${NC}"
read -p "Dominio o IP del servidor (ej: monitor.siempria.com): " DOMAIN
read -p "Email del administrador: " ADMIN_EMAIL

if [ -z "$DOMAIN" ] || [ -z "$ADMIN_EMAIL" ]; then
    echo -e "${RED}Error: Dominio y email son obligatorios${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}Iniciando instalación...${NC}"
echo ""

# Paso 1: Actualizar sistema
echo -e "${BLUE}[1/10] Actualizando sistema...${NC}"
apt update && apt upgrade -y

# Paso 2: Instalar dependencias
echo -e "${BLUE}[2/10] Instalando dependencias...${NC}"
apt install -y curl wget git build-essential software-properties-common
apt install -y python3 python3-pip python3-venv
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn

# Paso 3: Instalar MongoDB
echo -e "${BLUE}[3/10] Instalando MongoDB...${NC}"
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org
systemctl start mongod
systemctl enable mongod

# Paso 4: Crear directorio de aplicación
echo -e "${BLUE}[4/10] Configurando directorio de aplicación...${NC}"
mkdir -p $APP_DIR
cd $APP_DIR

# Nota: Aquí deberías clonar tu repositorio
# git clone https://github.com/TU_USUARIO/siempria-network-monitor.git .
echo -e "${YELLOW}NOTA: Debes copiar los archivos de la aplicación a $APP_DIR${NC}"

# Paso 5: Configurar Backend
echo -e "${BLUE}[5/10] Configurando Backend...${NC}"
if [ -d "$APP_DIR/backend" ]; then
    cd $APP_DIR/backend
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
    
    # Generar clave secreta
    SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    
    cat > .env << EOF
MONGO_URL="mongodb://localhost:27017"
DB_NAME="$DB_NAME"
CORS_ORIGINS="*"
SECRET_KEY="$SECRET_KEY"
EOF
    deactivate
fi

# Paso 6: Configurar Frontend
echo -e "${BLUE}[6/10] Configurando Frontend...${NC}"
if [ -d "$APP_DIR/frontend" ]; then
    cd $APP_DIR/frontend
    yarn install
    
    cat > .env << EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF

    # Construir para producción
    echo -e "${YELLOW}Construyendo frontend para producción...${NC}"
    yarn build
fi

# Paso 7: Instalar Nginx
echo -e "${BLUE}[7/10] Configurando Nginx...${NC}"
apt install -y nginx

cat > /etc/nginx/sites-available/siempria-monitor << 'NGINXEOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    # Frontend - archivos estáticos
    root /opt/siempria-monitor/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8001/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
}
NGINXEOF

# Reemplazar placeholder con dominio real
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/siempria-monitor

ln -sf /etc/nginx/sites-available/siempria-monitor /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

# Paso 8: Configurar servicio systemd para Backend
echo -e "${BLUE}[8/10] Configurando servicio systemd...${NC}"

cat > /etc/systemd/system/siempria-backend.service << EOF
[Unit]
Description=Siempria Network Monitor Backend
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=$APP_DIR/backend
Environment="PATH=$APP_DIR/backend/venv/bin"
ExecStart=$APP_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

chown -R www-data:www-data $APP_DIR
systemctl daemon-reload
systemctl enable siempria-backend

# Paso 9: Crear usuario admin en MongoDB
echo -e "${BLUE}[9/10] Creando usuario administrador...${NC}"
# El hash corresponde a la contraseña: admin123
ADMIN_HASH='$2b$12$j4/aAKr9sGSijQ1/yD5eCeSWuLxzgB3ozBkK3qOdxdq1x2KI/Y1xS'
mongosh $DB_NAME --eval "
db.users.insertOne({
    id: 'admin-001',
    username: 'admin',
    email: '$ADMIN_EMAIL',
    hashed_password: '$ADMIN_HASH',
    role: 'admin',
    full_name: 'Administrador',
    created_at: new Date().toISOString()
});
"

# Paso 10: Iniciar servicios
echo -e "${BLUE}[10/10] Iniciando servicios...${NC}"
systemctl start siempria-backend

# Instalar SSL (opcional)
echo ""
read -p "¿Desea instalar certificado SSL con Let's Encrypt? (s/n): " INSTALL_SSL
if [ "$INSTALL_SSL" = "s" ] || [ "$INSTALL_SSL" = "S" ]; then
    apt install -y certbot python3-certbot-nginx
    certbot --nginx -d $DOMAIN --email $ADMIN_EMAIL --agree-tos --non-interactive
fi

# Configurar firewall
echo -e "${BLUE}Configurando firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ¡INSTALACIÓN COMPLETADA!                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "URL de acceso: ${BLUE}https://$DOMAIN${NC}"
echo -e "Usuario: ${YELLOW}admin${NC}"
echo -e "Contraseña: ${YELLOW}admin123${NC} (¡CÁMBIALA INMEDIATAMENTE!)"
echo ""
echo -e "Verificar estado de servicios:"
echo -e "  ${BLUE}sudo systemctl status siempria-backend${NC}"
echo -e "  ${BLUE}sudo systemctl status nginx${NC}"
echo ""
echo -e "Ver logs del backend:"
echo -e "  ${BLUE}sudo journalctl -u siempria-backend -f${NC}"
echo ""
