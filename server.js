require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./src/db/db');
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes');
const operatorRoutes = require('./src/routes/operatorRoutes');
const productionRoutes = require('./src/routes/productionRoutes');
const buscarRoutes = require("./src/routes/buscarRoutes");
const crearRoutes = require("./src/routes/crearRoutes");
const adminRoutes = require('./src/routes/adminRoutes');
const maquinasRoutes = require('./src/routes/maquinasRoutes');
const insumosRoutes = require('./src/routes/insumosRoutes');
const procesosRoutes = require('./src/routes/procesosRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes');
const areaRoutes = require('./src/routes/areaRoutes');
const jornadaRoutes = require('./src/routes/jornadaRoutes');
const healthRoutes = require('./src/routes/healthRoutes');

// Importar utilidades de API
const { ApiResponse, errorHandler, notFoundHandler, requestLogger } = require('./src/utils/apiResponse');

// Validar variables de entorno críticas
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
// EMAIL vars son opcionales para despliegue inicial
const optionalVars = ['EMAIL_USER', 'EMAIL_PASS'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars.join(', '));
    console.error('💡 Verifica tu archivo .env');
    process.exit(1);
}

// Advertir sobre variables opcionales
const missingOptional = optionalVars.filter(varName => !process.env[varName]);
if (missingOptional.length > 0) {
    console.warn('⚠️ Variables opcionales faltantes:', missingOptional.join(', '));
    console.warn('📧 Funciones de email pueden no funcionar');
}

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS mejorada para seguridad
const corsOptions = {
    origin: function (origin, callback) {
        // Permitir requests sin origin (mobile apps, postman, etc.)
        if (!origin) return callback(null, true);
        
        // Orígenes específicos permitidos
        const defaultOrigins = [
            'http://localhost:5173', 
            'http://localhost:3000',
            'https://vr-mideros.vercel.app'
        ];
        
        const allowedOrigins = process.env.CORS_ORIGIN 
            ? process.env.CORS_ORIGIN.split(',').map(url => url.trim())
            : defaultOrigins;
        
        // Verificaciones de origen
        const isAllowedOrigin = allowedOrigins.includes(origin);
        const isVercelDomain = origin && origin.endsWith('.vercel.app');
        const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
        
        if (isAllowedOrigin || isVercelDomain || isLocalhost) {
            // Log solo en desarrollo
            if (process.env.NODE_ENV !== 'production') {
                console.log('✅ CORS: Origen permitido:', origin);
            }
            callback(null, true);
        } else {
            console.warn(`🚫 CORS: Origen no permitido: ${origin}`);
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware de seguridad
// Configurar Helmet para headers de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false // Deshabilitado para compatibilidad
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Limitar tamaño de payload
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de Rate Limiting para seguridad
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos de login por IP cada 15 minutos
    message: {
        error: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 500, // máximo 500 requests por IP cada 15 minutos (aumentado para desarrollo)
    message: {
        error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Aplicar rate limiting general a todas las rutas API
app.use('/api/', generalLimiter);

// Aplicar rate limiting específico para autenticación
app.use('/api/auth/', authLimiter);

// Headers de seguridad
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// Middleware de logging para producción
if (process.env.NODE_ENV === 'production') {
    app.use(requestLogger);
}

// Rutas de health check (deben ir primero)
app.use('/api', healthRoutes);

// Rutas principales
app.use('/api/auth', authRoutes);
app.use('/api/operarios', operatorRoutes);
app.use('/api/produccion', productionRoutes);
app.use("/api", buscarRoutes);
app.use("/api", crearRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/maquinas', maquinasRoutes);
app.use('/api/insumos', insumosRoutes);
app.use('/api/procesos', procesosRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/jornadas', jornadaRoutes);

// Middleware de ruta no encontrada (DEBE IR DESPUÉS de las rutas)
app.use(notFoundHandler);

// Middleware de manejo de errores global
app.use(errorHandler);

//conectar a MongoDB
connectDB();

// Solo exportar la app, NO iniciar el servidor aquí
// El servidor se inicia en start.js para producción

// Exportar para poder usar en otros archivos
module.exports = app;
