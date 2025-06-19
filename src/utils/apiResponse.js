const productionConfig = require('../config/production');

class ApiResponse {
    /**
     * Respuesta exitosa estándar
     */
    static success(res, data = null, message = 'Success', statusCode = 200) {
        const response = {
            success: true,
            status: statusCode,
            message,
            timestamp: new Date().toISOString(),
            data
        };

        return res.status(statusCode).json(response);
    }

    /**
     * Respuesta de error estándar
     */
    static error(res, message = 'Internal Server Error', statusCode = 500, error = null) {
        const response = {
            success: false,
            status: statusCode,
            message,
            timestamp: new Date().toISOString(),
            error: process.env.NODE_ENV === 'production' ? null : error
        };

        // Log del error para debugging
        if (error && statusCode >= 500) {
            console.error('API Error:', {
                message,
                statusCode,
                error: error.stack || error,
                timestamp: new Date().toISOString(),
                path: res.req ? res.req.path : 'unknown',
                method: res.req ? res.req.method : 'unknown'
            });
        }

        return res.status(statusCode).json(response);
    }

    /**
     * Respuesta de validación
     */
    static validation(res, errors, message = 'Validation Error') {
        return res.status(400).json({
            success: false,
            status: 400,
            message,
            timestamp: new Date().toISOString(),
            errors: Array.isArray(errors) ? errors : [errors]
        });
    }

    /**
     * Respuesta no autorizada
     */
    static unauthorized(res, message = 'Unauthorized') {
        return res.status(401).json({
            success: false,
            status: 401,
            message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Respuesta prohibida
     */
    static forbidden(res, message = 'Forbidden') {
        return res.status(403).json({
            success: false,
            status: 403,
            message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Respuesta no encontrado
     */
    static notFound(res, message = 'Resource not found') {
        return res.status(404).json({
            success: false,
            status: 404,
            message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Respuesta de conflicto
     */
    static conflict(res, message = 'Conflict') {
        return res.status(409).json({
            success: false,
            status: 409,
            message,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Respuesta con paginación
     */
    static paginated(res, data, pagination, message = 'Success') {
        return res.status(200).json({
            success: true,
            status: 200,
            message,
            timestamp: new Date().toISOString(),
            data,
            pagination: {
                page: pagination.page || 1,
                limit: pagination.limit || 10,
                total: pagination.total || 0,
                pages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
                hasNext: pagination.hasNext || false,
                hasPrev: pagination.hasPrev || false
            }
        });
    }
}

/**
 * Middleware para manejar errores no capturados
 */
const errorHandler = (error, req, res, next) => {
    // Si ya se envió una respuesta, delegar al error handler por defecto de Express
    if (res.headersSent) {
        return next(error);
    }

    // Log del error completo
    console.error('Unhandled Error:', {
        error: error.stack || error,
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Determinar el tipo de error y responder apropiadamente
    if (error.name === 'ValidationError') {
        return ApiResponse.validation(res, error.message);
    }

    if (error.name === 'CastError') {
        return ApiResponse.validation(res, 'Invalid ID format');
    }

    if (error.code === 11000) {
        return ApiResponse.conflict(res, 'Duplicate entry detected');
    }

    if (error.name === 'JsonWebTokenError') {
        return ApiResponse.unauthorized(res, 'Invalid token');
    }

    if (error.name === 'TokenExpiredError') {
        return ApiResponse.unauthorized(res, 'Token expired');
    }

    // Error genérico del servidor
    return ApiResponse.error(res, 'Internal Server Error', 500, error);
};

/**
 * Middleware para manejar rutas no encontradas
 */
const notFoundHandler = (req, res) => {
    return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};

/**
 * Wrapper para funciones async en rutas
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Middleware para logging de requests
 */
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Log de request entrante
    console.log(`📥 ${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });

    // Hook para loggear la respuesta
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        console.log(`📤 ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        originalSend.call(this, data);
    };

    next();
};

module.exports = {
    ApiResponse,
    errorHandler,
    notFoundHandler,
    asyncHandler,
    requestLogger
};
