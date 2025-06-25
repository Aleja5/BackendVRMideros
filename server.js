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
const { trackRequests, router: rateLimitMonitorRouter } = require('./monitor-rate-limits');

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

// Middleware de logging para requests
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const ip = req.ip || req.connection.remoteAddress;
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const userAgent = req.get('User-Agent') || 'Unknown';
        
        // Log solo en desarrollo o para debugging
        if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_REQUESTS === 'true') {
            console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms - IP: ${ip.substring(0, 10)}...`);
        }
    });
    
    next();
};

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 5000;

// Configuración de CORS mejorada para seguridad
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['https://vrmideros.netlify.app'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
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
    },    crossOriginEmbedderPolicy: false // Deshabilitado para compatibilidad
}));

// Aplicar logging de requests
app.use(requestLogger);

app.use(cors(corsOptions));

// Middleware adicional para preflight requests
app.options('*', cors(corsOptions));

// Middleware manual para CORS en caso de fallos
app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000', 
        'https://vrmideros.netlify.app',
        'https://vr-mideros.netlify.app',
        'https://vrmiderosbackend.onrender.com',
        'https://vr-mideros-backend.onrender.com'
    ];
    
    const isNetlifyDomain = origin && origin.endsWith('.netlify.app');
    const isVercelDomain = origin && origin.endsWith('.vercel.app');
    const isLocalhost = origin && (origin.includes('localhost') || origin.includes('127.0.0.1'));
    
    // Log para debug
    console.log(`📥 Request from origin: ${origin || 'no-origin'}`);
    console.log(`🔍 Method: ${req.method}`);
    
    if (allowedOrigins.includes(origin) || isNetlifyDomain || isVercelDomain || isLocalhost || !origin) {
        console.log(`✅ CORS Manual: Permitiendo origen ${origin || 'no-origin'}`);
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With,Accept,Origin');
    } else {
        console.log(`❌ CORS Manual: Bloqueando origen ${origin}`);
    }
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.json({ limit: '10mb' })); // Limitar tamaño de payload
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuración de Rate Limiting para múltiples usuarios
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || (process.env.NODE_ENV === 'production' ? 50 : 100), // Aumentado para múltiples usuarios
    message: {
        error: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.',
        retryAfter: '15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Excluir requests exitosos del conteo
    skipSuccessfulRequests: true,
    // Permitir más requests para usuarios ya autenticados
    skip: (req) => {
        // No limitar si ya tienen token válido
        const token = req.headers.authorization;
        if (token && token.startsWith('Bearer ')) {
            return true;
        }
        // Tampoco limitar el refresh token
        if (req.path === '/refresh') {
            return true;
        }
        return false;
    },
    // Usar una clave más específica que incluya el user agent para evitar bloqueos masivos
    keyGenerator: (req) => {
        return req.ip + ':' + (req.get('User-Agent') || 'unknown').slice(0, 50);
    }
});

const generalLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutos (reducido para más flexibilidad)
    max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX) || (process.env.NODE_ENV === 'production' ? 5000 : 10000), // Aumentado significativamente
    message: {
        error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
        retryAfter: '10 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Excluir requests exitosos del conteo
    skipSuccessfulRequests: true,
    // No limitar usuarios autenticados
    skip: (req) => {
        // No limitar requests con token válido
        const token = req.headers.authorization;
        if (token && token.startsWith('Bearer ')) {
            return true;
        }
        // No limitar ciertos endpoints críticos
        const exemptPaths = ['/health', '/ping', '/ready', '/operarios/validar-cedula'];
        return exemptPaths.some(path => req.path.includes(path));
    },
    // Usar IP + User Agent para mejor distribución
    keyGenerator: (req) => {
        return req.ip + ':' + (req.get('User-Agent') || 'unknown').slice(0, 30);
    }
});

// Aplicar rate limiting general a todas las rutas API (excepto health check)
app.use('/api/', (req, res, next) => {
    // Excluir health checks del rate limiting
    if (req.path === '/health' || req.path === '/ping' || req.path === '/ready') {
        return next();
    }
    return generalLimiter(req, res, next);
});

// Rate limiter muy permisivo para rutas de producción críticas
const productionLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos (ventana más corta)
    max: parseInt(process.env.RATE_LIMIT_PRODUCTION_MAX) || (process.env.NODE_ENV === 'production' ? 10000 : 20000), // Muy permisivo
    message: {
        error: 'Límite de solicitudes excedido para operaciones de producción.',
        retryAfter: '5 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    // Prácticamente no limitar a usuarios autenticados
    skip: (req) => {
        const token = req.headers.authorization;
        return token && token.startsWith('Bearer ');
    },
    keyGenerator: (req) => {
        // Usar IP + token hash para distribución más granular
        const token = req.headers.authorization;
        const tokenHash = token ? token.slice(-10) : 'anon';
        return req.ip + ':' + tokenHash;
    }
});

// Aplicar rate limiting específico para autenticación
app.use('/api/auth/', authLimiter);

// Aplicar rate limiting más permisivo para rutas de producción
app.use('/api/produccion/', productionLimiter);
app.use('/api/jornadas/', productionLimiter);

// Headers de seguridad
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

// Middleware de tracking de rate limiting (debe ir antes de las rutas)
app.use(trackRequests);

// Rutas
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
app.use('/api', healthRoutes);
app.use('/api', rateLimitMonitorRouter); // Monitor de rate limiting

// Middleware de ruta no encontrada (DEBE IR DESPUÉS de las rutas)
app.use((req, res, next) => {
  console.error(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Ruta no encontrada", path: req.originalUrl });
});

// Middleware de manejo de errores global
app.use((err, req, res, next) => {
    console.error('🐛 Error global capturado:', err.message);
    
    // No exponer stack trace en producción
    const errorResponse = {
        error: process.env.NODE_ENV === 'production' 
            ? 'Error interno del servidor' 
            : err.message
    };
    
    if (process.env.NODE_ENV !== 'production') {
        errorResponse.stack = err.stack;
    }
    
    res.status(err.status || 500).json(errorResponse);
});

//conectar a MongoDB
connectDB();

// Solo exportar la app, NO iniciar el servidor aquí
// El servidor se inicia en start.js para producción

// Exportar para poder usar en otros archivos
module.exports = app;
