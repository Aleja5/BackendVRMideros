const express = require('express');
const productionConfig = require('../config/production');
const router = express.Router();

/**
 * Health Check Endpoint
 * Verifica el estado del servidor y conexiones críticas
 */
router.get('/health', async (req, res) => {
    const startTime = Date.now();
    
    try {
        const healthCheck = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            version: process.env.npm_package_version || '1.0.0',
            node_version: process.version,
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100,
                external: Math.round(process.memoryUsage().external / 1024 / 1024 * 100) / 100
            },
            services: {
                database: 'checking...',
                api: 'OK'
            }
        };

        // Verificar conexión a base de datos
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            healthCheck.services.database = 'OK';
        } else {
            healthCheck.services.database = 'DISCONNECTED';
            healthCheck.status = 'DEGRADED';
        }

        const responseTime = Date.now() - startTime;
        healthCheck.response_time_ms = responseTime;

        // Determinar código de estado HTTP
        const statusCode = healthCheck.status === 'OK' ? 200 : 503;

        res.status(statusCode).json(healthCheck);

    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: error.message,
            response_time_ms: Date.now() - startTime
        });
    }
});

/**
 * Ready Check Endpoint
 * Verifica si el servicio está listo para recibir tráfico
 */
router.get('/ready', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        
        // Verificar que la base de datos esté conectada
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                status: 'NOT_READY',
                message: 'Database not connected',
                timestamp: new Date().toISOString()
            });
        }

        res.status(200).json({
            status: 'READY',
            message: 'Service is ready to accept traffic',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Readiness check failed:', error);
        res.status(503).json({
            status: 'NOT_READY',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Status Endpoint
 * Información detallada del estado del sistema
 */
router.get('/status', async (req, res) => {
    try {
        const mongoose = require('mongoose');
        
        const status = {
            application: {
                name: 'Production Management API',
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                uptime_seconds: Math.floor(process.uptime()),
                timestamp: new Date().toISOString()
            },
            server: {
                platform: process.platform,
                arch: process.arch,
                node_version: process.version,
                pid: process.pid,
                memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100
            },
            database: {
                status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
                host: mongoose.connection.host || 'unknown',
                name: mongoose.connection.name || 'unknown'
            },
            endpoints: {
                health: '/api/health',
                ready: '/api/ready',
                status: '/api/status',
                version: '/api/version'
            }
        };

        res.status(200).json(status);

    } catch (error) {
        console.error('Status check failed:', error);
        res.status(500).json({
            error: 'Failed to get system status',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Version Endpoint
 * Información de versión de la API
 */
router.get('/version', (req, res) => {
    res.status(200).json({
        api_version: '1.0.0',
        build_date: process.env.BUILD_DATE || new Date().toISOString(),
        commit_hash: process.env.COMMIT_HASH || 'unknown',
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        dependencies: {
            express: require('express/package.json').version,
            mongoose: require('mongoose/package.json').version,
            cors: require('cors/package.json').version
        }
    });
});

/**
 * Ping Endpoint
 * Simple endpoint para verificación rápida
 */
router.get('/ping', (req, res) => {
    res.status(200).json({
        message: 'pong',
        timestamp: new Date().toISOString(),
        server_time: Date.now()
    });
});

module.exports = router;
