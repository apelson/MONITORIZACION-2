# Siempria Network Monitor - Guía de Instalación

## Requisitos del Sistema

- **Sistema Operativo:** Ubuntu 24.04 LTS
- **RAM:** Mínimo 2GB (recomendado 4GB)
- **Disco:** Mínimo 10GB disponibles
- **CPU:** 2 cores mínimo

## Paso 1: Actualizar el Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

## Paso 2: Instalar Dependencias Base

```bash
# Herramientas básicas
sudo apt install -y curl wget git build-essential software-properties-common

# Python 3.11+
sudo apt install -y python3 python3-pip python3-venv

# Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Yarn (gestor de paquetes frontend)
sudo npm install -g yarn
```

## Paso 3: Instalar MongoDB

```bash
# Importar clave GPG de MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Añadir repositorio
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Instalar MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Iniciar y habilitar MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verificar estado
sudo systemctl status mongod
```

## Paso 4: Clonar el Repositorio

```bash
# Crear directorio de la aplicación
sudo mkdir -p /opt/siempria-monitor
sudo chown $USER:$USER /opt/siempria-monitor

# Clonar repositorio (reemplaza con tu URL de GitHub)
cd /opt/siempria-monitor
git clone https://github.com/TU_USUARIO/siempria-network-monitor.git .

# O copiar los archivos manualmente
# scp -r /ruta/local/* user@servidor:/opt/siempria-monitor/
```

## Paso 5: Configurar el Backend

```bash
cd /opt/siempria-monitor/backend

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate

# Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt

# Crear archivo de configuración
cat > .env << 'EOF'
MONGO_URL="mongodb://localhost:27017"
DB_NAME="siempria_monitor"
CORS_ORIGINS="*"
SECRET_KEY="CAMBIA_ESTO_POR_UNA_CLAVE_SEGURA_ALEATORIA"
EOF

# Generar clave secreta aleatoria
SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
sed -i "s/CAMBIA_ESTO_POR_UNA_CLAVE_SEGURA_ALEATORIA/$SECRET/" .env

# Verificar configuración
cat .env
```

## Paso 6: Configurar el Frontend

```bash
cd /opt/siempria-monitor/frontend

# Instalar dependencias
yarn install

# Crear archivo de configuración
# Reemplaza TU_DOMINIO.com con tu dominio real o IP del servidor
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://TU_DOMINIO.com
EOF

# Para desarrollo local sin SSL:
# REACT_APP_BACKEND_URL=http://IP_DEL_SERVIDOR:8001
```

## Paso 7: Configurar Nginx (Proxy Reverso)

```bash
# Instalar Nginx
sudo apt install -y nginx

# Crear configuración del sitio
sudo tee /etc/nginx/sites-available/siempria-monitor << 'EOF'
server {
    listen 80;
    server_name TU_DOMINIO.com;  # Cambia por tu dominio o IP

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
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
EOF

# Activar sitio
sudo ln -sf /etc/nginx/sites-available/siempria-monitor /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## Paso 8: Configurar SSL con Certbot (Opcional pero Recomendado)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado SSL (reemplaza con tu dominio y email)
sudo certbot --nginx -d TU_DOMINIO.com --email tu@email.com --agree-tos --non-interactive

# El certificado se renueva automáticamente
```

## Paso 9: Configurar Servicios con Systemd

### Servicio Backend

```bash
sudo tee /etc/systemd/system/siempria-backend.service << 'EOF'
[Unit]
Description=Siempria Network Monitor Backend
After=network.target mongod.service
Wants=mongod.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/siempria-monitor/backend
Environment="PATH=/opt/siempria-monitor/backend/venv/bin"
ExecStart=/opt/siempria-monitor/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

### Construir Frontend para Producción

```bash
cd /opt/siempria-monitor/frontend
yarn build
```

### Configurar Nginx para Servir Frontend Estático

Actualiza la configuración de Nginx para servir los archivos estáticos del build:

```bash
sudo tee /etc/nginx/sites-available/siempria-monitor << 'EOF'
server {
    listen 80;
    server_name TU_DOMINIO.com;

    # Frontend - archivos estáticos
    root /opt/siempria-monitor/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
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
EOF

sudo nginx -t
sudo systemctl restart nginx
```

**Nota:** Con esta configuración, el frontend se sirve como archivos estáticos y no necesita un servicio systemd separado. Solo el backend requiere un servicio.

### Activar y Arrancar Servicios

```bash
# Dar permisos al usuario www-data
sudo chown -R www-data:www-data /opt/siempria-monitor

# Recargar systemd
sudo systemctl daemon-reload

# Habilitar servicios para inicio automático
sudo systemctl enable siempria-backend
sudo systemctl enable siempria-frontend

# Iniciar servicios
sudo systemctl start siempria-backend
sudo systemctl start siempria-frontend

# Verificar estado
sudo systemctl status siempria-backend
sudo systemctl status siempria-frontend
```

## Paso 10: Crear Usuario Administrador

```bash
# Conectar a MongoDB y crear usuario admin
# La contraseña por defecto es: admin123
mongosh siempria_monitor << 'EOF'
db.users.insertOne({
    id: "admin-001",
    username: "admin",
    email: "admin@siempria.com",
    hashed_password: "$2b$12$j4/aAKr9sGSijQ1/yD5eCeSWuLxzgB3ozBkK3qOdxdq1x2KI/Y1xS",
    role: "admin",
    full_name: "Administrador",
    created_at: new Date().toISOString()
});
EOF
```

**Nota:** La contraseña por defecto es `admin123`. Cámbiala después del primer login.

Para generar un hash de contraseña personalizado:
```bash
cd /opt/siempria-monitor/backend
source venv/bin/activate
python3 -c "import bcrypt; print(bcrypt.hashpw(b'TU_CONTRASEÑA', bcrypt.gensalt()).decode())"
```

## Paso 11: Configurar Firewall

```bash
# Permitir puertos necesarios
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Activar firewall
sudo ufw enable

# Verificar reglas
sudo ufw status
```

## Paso 12: Verificar Instalación

```bash
# Verificar que todos los servicios están corriendo
sudo systemctl status mongod
sudo systemctl status siempria-backend
sudo systemctl status siempria-frontend
sudo systemctl status nginx

# Ver logs en caso de errores
sudo journalctl -u siempria-backend -f
sudo journalctl -u siempria-frontend -f

# Probar API
curl http://localhost:8001/api/

# Probar desde exterior (reemplaza con tu IP/dominio)
curl https://TU_DOMINIO.com/api/
```

## Paso 13: Acceder a la Aplicación

1. Abre tu navegador y ve a: `https://TU_DOMINIO.com`
2. Inicia sesión con:
   - **Usuario:** admin
   - **Contraseña:** admin123 (cámbiala inmediatamente)

## Comandos Útiles

```bash
# Reiniciar servicios
sudo systemctl restart siempria-backend
sudo systemctl restart siempria-frontend

# Ver logs en tiempo real
sudo journalctl -u siempria-backend -f
sudo journalctl -u siempria-frontend -f

# Backup de MongoDB
mongodump --db siempria_monitor --out /backup/$(date +%Y%m%d)

# Restaurar backup
mongorestore --db siempria_monitor /backup/20240115/siempria_monitor

# Actualizar aplicación
cd /opt/siempria-monitor
git pull
sudo systemctl restart siempria-backend
sudo systemctl restart siempria-frontend
```

## Solución de Problemas

### Backend no arranca
```bash
# Verificar logs
sudo journalctl -u siempria-backend -n 50

# Verificar conexión a MongoDB
mongosh --eval "db.serverStatus()"

# Verificar variables de entorno
cat /opt/siempria-monitor/backend/.env
```

### Frontend no arranca
```bash
# Verificar logs
sudo journalctl -u siempria-frontend -n 50

# Reconstruir frontend
cd /opt/siempria-monitor/frontend
yarn build
```

### Nginx no funciona
```bash
# Verificar configuración
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/error.log
```

### Las cámaras no muestran imagen
- Verificar que el servidor tiene acceso a las IPs de las cámaras
- Verificar credenciales de las cámaras
- Probar conexión manual: `curl -u usuario:contraseña http://IP_CAMARA:PUERTO/ruta_imagen`

## Configuración de Email (Gmail SMTP)

Para las alertas por email, configura en la aplicación:
1. Ve a **Config** > **Configuración Email**
2. Ingresa:
   - **Email alertas:** tu_email@gmail.com
   - **Gmail usuario:** tu_email@gmail.com
   - **Contraseña app:** (genera una en https://myaccount.google.com/apppasswords)

## Soporte

Para soporte técnico, contacta a:
- **Email:** soporte@siempria.com
- **Web:** https://www.siempria.com

---

© 2024 Siempria - Distribuidor Autorizado Mobotix
