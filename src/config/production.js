// Configuración para entorno de producción
require('dotenv').config();

const productionConfig = {
    // Configuración del servidor
    server: {
        port: process.env.PORT || 5000,
        host: process.env.HOST || '0.0.0.0',
        environment: 'production',
        // Render.com configuration
        render: {
            url: process.env.RENDER_BACKEND_URL || 'https://your-app.onrender.com',
            region: process.env.RENDER_REGION || 'oregon',
            service: process.env.RENDER_SERVICE_NAME || 'production-backend'
        }
    },

    // Configuración de CORS para producción
    cors: {
        origins: [
            // Netlify frontend URL
            process.env.FRONTEND_URL || 'https://vrmideros.netlify.app',
            'https://vrmideros.netlify.app',
            'https://*.netlify.app', // Para deploys de preview
            // Render backend URL (para health checks)
            process.env.RENDER_BACKEND_URL || 'https://vr-mideros-backend.onrender.com'
        ],
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-API-Version',
            'X-Request-ID',
            'X-Forwarded-For'
        ]
    },

    // Configuración de base de datos
    database: {
        uri: process.env.MONGO_URI,
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            bufferCommands: false, // Disable mongoose buffering
            bufferMaxEntries: 0 // Disable mongoose buffering
        }
    },

    // Configuración de JWT
    jwt: {
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: 'production-api',
        audience: 'production-clients'
    },

    // Configuración de seguridad
    security: {
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100, // máximo 100 requests por ventana
            message: {
                error: 'Too many requests from this IP',
                retryAfter: '15 minutes'
            }
        },
        helmet: {
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"],
                    connectSrc: ["'self'", process.env.VERCEL_FRONTEND_URL],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"]
                }
            },
            crossOriginEmbedderPolicy: false
        }
    },

    // Configuración de logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json',
        transports: {
            console: {
                enabled: true,
                level: 'info'
            },
            file: {
                enabled: true,
                level: 'error',
                filename: 'logs/error.log'
            }
        }
    },

    // Configuración de email (opcional)
    email: {
        enabled: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
        service: process.env.EMAIL_SERVICE || 'gmail',
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER
    },

    // Configuración de health checks
    health: {
        path: '/api/health',
        interval: 30000, // 30 segundos
        timeout: 5000    // 5 segundos
    },

    // Métricas y monitoreo
    monitoring: {
        enabled: true,
        endpoint: '/api/metrics',
        collectDefaultMetrics: true
    }
};

module.exports = productionConfig;
