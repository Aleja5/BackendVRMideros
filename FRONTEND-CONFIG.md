# 🌐 CONFIGURACIÓN DEL FRONTEND

## URLs del Backend Desplegado

### URL Base
```
https://vr-mideros-backend.onrender.com
```

### Endpoints Principales
```javascript
// Configuración para tu frontend
const API_BASE_URL = 'https://vr-mideros-backend.onrender.com';

const API_ENDPOINTS = {
  // Autenticación
  LOGIN: `${API_BASE_URL}/api/auth/login`,
  LOGOUT: `${API_BASE_URL}/api/auth/logout`,
  REFRESH_TOKEN: `${API_BASE_URL}/api/auth/refresh`,
  FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
  RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password`,
  
  // Operarios
  OPERARIOS: `${API_BASE_URL}/api/operarios`,
  VALIDATE_CEDULA: `${API_BASE_URL}/api/operarios/validar-cedula`,
  
  // Producción
  PRODUCCION: `${API_BASE_URL}/api/produccion`,
  CREAR_PRODUCCION: `${API_BASE_URL}/api/produccion/crear`,
  
  // Recursos
  MAQUINAS: `${API_BASE_URL}/api/maquinas`,
  INSUMOS: `${API_BASE_URL}/api/insumos`,
  PROCESOS: `${API_BASE_URL}/api/procesos`,
  AREAS: `${API_BASE_URL}/api/areas`,
  
  // Usuarios y Admin
  USUARIOS: `${API_BASE_URL}/api/usuarios`,
  ADMIN: `${API_BASE_URL}/api/admin`,
  
  // Jornadas
  JORNADAS: `${API_BASE_URL}/api/jornadas`,
  
  // Búsqueda
  BUSCAR: `${API_BASE_URL}/api/buscar`,
  
  // Crear nuevos registros
  CREAR: `${API_BASE_URL}/api/crear`,
  
  // Health Check
  HEALTH: `${API_BASE_URL}/api/health`
};
```

## Configuración de Axios

```javascript
// axios.config.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://vr-mideros-backend.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Para cookies/sessions
  timeout: 10000 // 10 segundos timeout
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado - redirigir al login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

## Variables de Entorno para Frontend

```bash
# .env para tu frontend
VITE_API_URL=https://vr-mideros-backend.onrender.com
VITE_API_TIMEOUT=10000
```

## Configuración de CORS

✅ **Tu backend ya está configurado para aceptar requests de:**
- `https://vrmideros.netlify.app`
- `https://vr-mideros.netlify.app`
- **Todos los subdominios de Netlify** (`*.netlify.app`)
- **Todos los subdominios de Vercel** (`*.vercel.app`)
- `localhost` (para desarrollo)

📝 **Nota**: Las URLs temporales de Netlify como `https://685583e92141020008646547--vrmideros.netlify.app` están ahora permitidas automáticamente.

## Ejemplo de Uso

```javascript
// Login example
import api from './axios.config.js';

const loginUser = async (email, password) => {
  try {
    const response = await api.post('/api/auth/login', {
      email,
      password
    });
    
    // Guardar token
    localStorage.setItem('token', response.data.token);
    return response.data;
  } catch (error) {
    console.error('Login failed:', error.response?.data?.message);
    throw error;
  }
};

// Get operarios example
const getOperarios = async () => {
  try {
    const response = await api.get('/api/operarios');
    return response.data.operarios;
  } catch (error) {
    console.error('Error fetching operarios:', error);
    throw error;
  }
};
```

## Estado Actual del Backend

✅ **Funcionando correctamente**
- Health Check: OK
- Base de datos: Conectada
- 35 operarios registrados
- Todos los endpoints respondiendo

🔗 **Verificar estado**: https://vr-mideros-backend.onrender.com/api/health
