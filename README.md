# TarjetaDigital 📇

**App web mobile-first para crear tarjetas de contacto digitales y compartirlas por QR o link.**

El receptor escanea un código QR o abre un enlace y ve tu perfil de contacto completo en su navegador — sin instalar nada.

---

## ✨ Características

- 📱 **Perfiles digitales** con QR y link compartible
- 📞 **Botones de acción directa**: Llamar, WhatsApp, Email
- 💾 **Descarga de contacto** en formato `.vcf` (compatible con todos los teléfonos)
- 📎 **Archivos adjuntos**: PDF e imágenes
- 📊 **Estadísticas** de visitas y clics
- 🌐 **Sin instalación** para el receptor — funciona en cualquier navegador
- ⚡ **Optimizado para gama baja** — carga en <2s en 3G, <500KB por página
- 📴 **Funciona offline** con Service Worker
- 💬 **Preview en WhatsApp** con meta tags Open Graph
- 🎨 **Diseño premium** dark mode con glassmorphism

---

## 📋 Requisitos

- **Node.js** >= 18.0.0
- **npm** (incluido con Node.js)

---

## 🚀 Instalación

```bash
# 1. Clonar el repositorio
git clone <tu-repo>
cd tarjeta-digital

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores (ver sección Configuración)

# 3. Instalar dependencias
npm install

# 4. Iniciar servidor
npm start

# 5. Abrir en el navegador
# http://localhost:3000
```

Para desarrollo con recarga automática:
```bash
npm run dev
```

---

## ⚙️ Configuración (.env)

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `PORT` | Puerto del servidor | `3000` |
| `BASE_URL` | URL base pública (para QR y Open Graph) | `http://localhost:3000` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | ⚠️ **Cambiar en producción** |
| `DB_PATH` | Ruta al archivo SQLite | `./database/tarjeta.db` |
| `UPLOAD_DIR` | Directorio para archivos subidos | `./uploads` |
| `ADMIN_KEY` | Clave para el endpoint de administración | ⚠️ **Cambiar en producción** |

> ⚠️ **Importante**: Cambia `JWT_SECRET` y `ADMIN_KEY` antes de poner en producción.

---

## 📖 Uso

### Flujo para el creador

1. **Registrarse** con número de teléfono y contraseña
2. **Crear tarjeta** — elegir nombre, tipo, color y foto opcional
3. **Agregar campos** — WhatsApp, teléfono, email, dirección, redes sociales
4. **Subir archivos** — PDF (catálogo, menú, CV) o imágenes
5. **Compartir** — mostrar QR en pantalla, enviar por WhatsApp o copiar link

### Flujo para el receptor

1. Escanear QR o abrir link
2. Ver perfil con botones de acción (Llamar, WhatsApp, Email)
3. Tocar dirección para abrir en Google Maps
4. Ver archivos adjuntos
5. Guardar contacto (descarga `.vcf`)

---

## 🔌 API Reference

### Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/registro` | No | Registrar nuevo usuario |
| POST | `/api/auth/login` | No | Iniciar sesión |

### Perfiles

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/perfiles` | Sí | Listar mis perfiles |
| POST | `/api/perfiles` | Sí | Crear perfil |
| PUT | `/api/perfiles/:id` | Sí | Actualizar perfil |
| DELETE | `/api/perfiles/:id` | Sí | Eliminar perfil |
| GET | `/u/:slug` | No | Ver perfil público (HTML) |
| GET | `/api/perfiles/:slug/qr` | No | Obtener QR como PNG |
| GET | `/api/perfiles/:slug/vcard` | No | Descargar contacto .vcf |

### Campos de contacto

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/perfiles/:id/campos` | Sí | Agregar campo |
| PUT | `/api/campos/:id` | Sí | Actualizar campo |
| DELETE | `/api/campos/:id` | Sí | Eliminar campo |

### Archivos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/perfiles/:id/archivos` | Sí | Subir archivo |
| DELETE | `/api/archivos/:id` | Sí | Eliminar archivo |

### Estadísticas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/estadisticas` | No | Registrar evento |
| GET | `/api/perfiles/:id/estadisticas` | Sí | Ver estadísticas |

### Administración

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/admin/usuarios/:id/plan` | Admin Key | Cambiar plan de usuario |

---

## 💰 Modelo de negocio

| Característica | Plan Free | Plan Paid |
|---------------|-----------|-----------|
| Perfiles | 1 | Ilimitados |
| Campos de contacto | 3 por perfil | Ilimitados |
| Archivos adjuntos | 1 por perfil | Ilimitados |
| QR y link | ✅ | ✅ |
| Estadísticas | ✅ | ✅ |
| Descarga vCard | ✅ | ✅ |

---

## 🔧 Administración

### Cambiar plan de un usuario

```bash
curl -X POST http://localhost:3000/api/admin/usuarios/1/plan \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: tu-clave-admin" \
  -d '{"plan": "paid"}'
```

Respuesta:
```json
{
  "ok": true,
  "usuario": { "id": 1, "nombre": "Juan", "telefono": "+521234567890", "plan": "paid" }
}
```

---

## 📁 Estructura del proyecto

```
tarjeta-digital/
├── server.js               # Punto de entrada Express
├── package.json
├── .env.example
├── .gitignore
├── README.md
│
├── database/
│   ├── schema.sql          # DDL SQLite (5 tablas)
│   └── db.js               # Conexión better-sqlite3
│
├── middleware/
│   ├── auth.js             # Verificación JWT
│   ├── rateLimit.js        # Rate limiting por IP
│   ├── upload.js           # Multer + validación archivos
│   └── planLimits.js       # Límites free/paid
│
├── routes/
│   ├── auth.js             # Registro y login
│   ├── perfiles.js         # CRUD perfiles + perfil público
│   ├── campos.js           # Campos de contacto
│   ├── archivos.js         # Subida/eliminación archivos
│   ├── estadisticas.js     # Tracking de eventos
│   └── admin.js            # Administración de planes
│
├── utils/
│   ├── slug.js             # Generación de slugs únicos
│   ├── qr.js               # Generación de QR codes
│   └── vcard.js            # Generación de archivos .vcf
│
├── views/
│   └── perfil-publico.html # Template SSR perfil público
│
├── public/
│   ├── index.html          # Landing + Login/Registro
│   ├── dashboard.html      # Panel principal
│   ├── editor.html         # Editor de perfil
│   ├── compartir.html      # Pantalla compartir QR
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service Worker
│   ├── css/
│   │   └── styles.css      # Diseño completo
│   └── js/
│       ├── app.js          # Helpers comunes
│       ├── auth.js         # Lógica autenticación
│       ├── dashboard.js    # Lógica panel
│       ├── editor.js       # Lógica editor
│       └── compartir.js    # Lógica compartir
│
└── uploads/                # Archivos subidos (gitignored)
```

---

## 🌐 Despliegue en producción

1. **Configurar `.env`**:
   - Cambiar `BASE_URL` a tu dominio (ej: `https://mitarjeta.com`)
   - Generar `JWT_SECRET` seguro (ej: `openssl rand -hex 32`)
   - Generar `ADMIN_KEY` seguro

2. **Proxy inverso** (nginx):
   ```nginx
   server {
       listen 80;
       server_name mitarjeta.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
       
       client_max_body_size 10M;
   }
   ```

3. **HTTPS**: Usar Certbot/Let's Encrypt

4. **Process manager**: Usar PM2
   ```bash
   npm install -g pm2
   pm2 start server.js --name tarjeta-digital
   pm2 save
   pm2 startup
   ```

5. **Variables de entorno**: `NODE_ENV=production`

---

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **Base de datos**: SQLite (sql.js — WebAssembly, sin deps nativas)
- **Frontend**: HTML/CSS/JS vanilla
- **Autenticación**: bcryptjs + JWT
- **QR**: qrcode (npm)
- **Seguridad**: helmet, cors, rate limiting, SQL parameterizado
- **Sin dependencias nativas**: Todo funciona sin Python, node-gyp, ni compilador C++

---

## 📄 Licencia

MIT
