# 🚀 GUÍA COMPLETA DE DESPLIEGUE EN RENDER

## ✅ VERIFICACIONES PRE-DESPLIEGUE

### 1. Archivos Preparados
- [x] `package.json` configurado correctamente
- [x] `start.js` como punto de entrada
- [x] `.gitignore` protege archivos sensibles
- [x] Health check en `/api/health`
- [x] Variables de entorno configuradas

### 2. Dependencias Limpias
- [x] Removidas dependencias de React del backend
- [x] Solo dependencias de Node.js/Express

## 🔧 PASOS PARA DESPLEGAR

### Paso 1: Preparar Repositorio Git
```bash
# Asegúrate de que tu código esté en Git
git add .
git commit -m "Preparado para despliegue en Render"
git push origin main
```

### Paso 2: Crear Servicio en Render
1. Ve a [render.com](https://render.com)
2. Conecta tu cuenta de GitHub
3. Crea "New Web Service"
4. Selecciona tu repositorio

### Paso 3: Configuración del Servicio
```
Name: tu-proyecto-backend
Region: Oregon (US West) o la más cercana
Branch: main
Root Directory: (deja vacío si package.json está en la raíz)
Runtime: Node
Build Command: npm install
Start Command: npm start
Plan: Free
```

### Paso 4: Variables de Entorno
Copia las variables de `render-env-config.txt` a Render:

**CRÍTICAS (OBLIGATORIAS):**
- `MONGO_URI` = Tu URL de MongoDB
- `JWT_SECRET` = Cadena aleatoria de 64+ caracteres
- `NODE_ENV` = production

**OPCIONALES:**
- `CORS_ORIGIN` = URL de tu frontend
- `EMAIL_USER` = Para reseteo de contraseñas
- `EMAIL_PASS` = Password de aplicación

### Paso 5: Base de Datos
Si no tienes MongoDB en la nube:
1. Crea una base de datos en MongoDB Atlas (gratis)
2. O usa la base de datos PostgreSQL de Render
3. Copia la URL de conexión a `MONGO_URI`

## 🧪 PRUEBAS POST-DESPLIEGUE

### Endpoints a Verificar:
1. `https://tu-app.onrender.com/api/health` - Debe retornar 200
2. `https://tu-app.onrender.com/api/auth/login` - POST con credenciales
3. `https://tu-app.onrender.com/api/operarios` - GET (puede requerir auth)

### Comando de Prueba Local:
```bash
# Probar localmente antes del despliegue
npm run test-endpoints
```

## 🔍 DEBUGGING

### Logs en Render:
- Ve a tu servicio en Render
- Click en "Logs" para ver errores en tiempo real

### Errores Comunes:
1. **"MONGO_URI not defined"** → Configura variable de entorno
2. **"JWT_SECRET not defined"** → Configura variable de entorno  
3. **"Cannot GET /"** → Normal, usa `/api/health`
4. **CORS errors** → Ya configurado para *.netlify.app y *.vercel.app
5. **"Access-Control-Allow-Origin" missing** → Reinicia el servicio en Render

## ✅ CHECKLIST FINAL

Antes de desplegar:
- [ ] Variables de entorno configuradas en Render
- [ ] MongoDB funcional y accesible
- [ ] Frontend actualizado con URL del backend
- [ ] Git repository updated y pushed

Después del despliegue:
- [ ] Health check responde (`/api/health`)
- [ ] Login funciona
- [ ] CORS configurado correctamente
- [ ] Logs sin errores críticos

## 🎯 URLs FINALES

✅ **TU BACKEND YA ESTÁ DESPLEGADO:**
- **URL Base**: `https://vr-mideros-backend.onrender.com`
- **Health Check**: `https://vr-mideros-backend.onrender.com/api/health`
- **Login**: `https://vr-mideros-backend.onrender.com/api/auth/login`
- **Operarios**: `https://vr-mideros-backend.onrender.com/api/operarios`
- **Producción**: `https://vr-mideros-backend.onrender.com/api/produccion`

### 🧪 Verificar Despliegue:
```bash
# Ejecutar verificación completa
node verify-deployment.js

# O verificar manualmente:
curl https://vr-mideros-backend.onrender.com/api/health
```

¡Tu backend está funcionando correctamente! 🚀
