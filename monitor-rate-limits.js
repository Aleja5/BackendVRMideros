const express = require('express');
const rateLimit = require('express-rate-limit');
const { safeLog } = require('./src/utils/logger');

// Store para tracking de rate limiting
const rateLimitStore = {
    requests: new Map(), // IP -> request info
    violations: new Map(), // IP -> violation history
    stats: {
        totalRequests: 0,
        blockedRequests: 0,
        uniqueIPs: new Set(),
        startTime: Date.now()
    }
};

// Configuración de thresholds y alertas
const RATE_LIMIT_CONFIG = {
    // Thresholds para diferentes tipos de alerta
    WARNING_THRESHOLD: 0.8, // 80% del límite
    CRITICAL_THRESHOLD: 0.95, // 95% del límite
    
    // Configuración de ventanas de tiempo
    MONITORING_WINDOW: 10 * 60 * 1000, // 10 minutos
    CLEANUP_INTERVAL: 30 * 60 * 1000, // 30 minutos
    
    // Límites por defecto
    DEFAULT_LIMITS: {
        auth: { windowMs: 15 * 60 * 1000, max: 50 },
        general: { windowMs: 10 * 60 * 1000, max: 5000 },
        production: { windowMs: 5 * 60 * 1000, max: 10000 }
    }
};

/**
 * Middleware para trackear requests y detectar patrones de rate limiting
 */
function trackRequests(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const timestamp = Date.now();
    const endpoint = req.path;
    
    // Actualizar estadísticas generales
    rateLimitStore.stats.totalRequests++;
    rateLimitStore.stats.uniqueIPs.add(ip);
    
    // Tracking por IP
    if (!rateLimitStore.requests.has(ip)) {
        rateLimitStore.requests.set(ip, {
            requests: [],
            userAgent: userAgent,
            firstSeen: timestamp,
            lastSeen: timestamp,
            endpoints: new Set(),
            blocked: 0
        });
    }
    
    const ipData = rateLimitStore.requests.get(ip);
    ipData.requests.push({ timestamp, endpoint, method: req.method });
    ipData.lastSeen = timestamp;
    ipData.endpoints.add(endpoint);
    
    // Limpiar requests antiguos (fuera de la ventana de monitoreo)
    const windowStart = timestamp - RATE_LIMIT_CONFIG.MONITORING_WINDOW;
    ipData.requests = ipData.requests.filter(r => r.timestamp > windowStart);
    
    // Detectar si el request fue bloqueado por rate limiting
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(data) {
        checkRateLimitResponse(this, data, ip);
        return originalSend.call(this, data);
    };
    
    res.json = function(data) {
        checkRateLimitResponse(this, data, ip);
        return originalJson.call(this, data);
    };
    
    next();
}

/**
 * Verificar si la respuesta indica rate limiting
 */
function checkRateLimitResponse(res, data, ip) {
    if (res.statusCode === 429) {
        rateLimitStore.stats.blockedRequests++;
        
        const ipData = rateLimitStore.requests.get(ip);
        if (ipData) {
            ipData.blocked++;
        }
        
        // Registrar violación
        if (!rateLimitStore.violations.has(ip)) {
            rateLimitStore.violations.set(ip, []);
        }
        
        rateLimitStore.violations.get(ip).push({
            timestamp: Date.now(),
            message: typeof data === 'string' ? data : JSON.stringify(data)
        });
        
        safeLog.warn('Rate limit violation detected', {
            ip,
            userAgent: ipData?.userAgent,
            totalRequests: ipData?.requests.length,
            blockedCount: ipData?.blocked
        });
    }
}

/**
 * Analizar patrones de tráfico y detectar anomalías
 */
function analyzeTrafficPatterns() {
    const analysis = {
        timestamp: new Date().toISOString(),
        summary: {
            totalRequests: rateLimitStore.stats.totalRequests,
            blockedRequests: rateLimitStore.stats.blockedRequests,
            uniqueIPs: rateLimitStore.stats.uniqueIPs.size,
            blockRate: rateLimitStore.stats.totalRequests > 0 ? 
                (rateLimitStore.stats.blockedRequests / rateLimitStore.stats.totalRequests * 100).toFixed(2) : 0,
            uptime: Math.floor((Date.now() - rateLimitStore.stats.startTime) / 1000 / 60) // minutes
        },
        topIPs: [],
        suspiciousActivity: [],
        rateLimitStatus: []
    };
    
    // Analizar top IPs por volumen de requests
    const ipAnalysis = Array.from(rateLimitStore.requests.entries())
        .map(([ip, data]) => ({
            ip,
            requestCount: data.requests.length,
            blockedCount: data.blocked,
            endpointCount: data.endpoints.size,
            userAgent: data.userAgent,
            duration: Math.floor((data.lastSeen - data.firstSeen) / 1000 / 60), // minutes
            requestsPerMinute: data.requests.length / Math.max(1, Math.floor((data.lastSeen - data.firstSeen) / 1000 / 60))
        }))
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 10);
    
    analysis.topIPs = ipAnalysis;
    
    // Detectar actividad sospechosa
    ipAnalysis.forEach(ipInfo => {
        const suspiciousFactors = [];
        
        // Alto volumen de requests
        if (ipInfo.requestsPerMinute > 100) {
            suspiciousFactors.push('high_request_rate');
        }
        
        // Alto ratio de bloqueos
        if (ipInfo.blockedCount > 0 && (ipInfo.blockedCount / ipInfo.requestCount) > 0.3) {
            suspiciousFactors.push('high_block_rate');
        }
        
        // Muchos endpoints diferentes (posible scanning)
        if (ipInfo.endpointCount > 20) {
            suspiciousFactors.push('endpoint_scanning');
        }
        
        // User agent sospechoso
        if (ipInfo.userAgent && (
            ipInfo.userAgent.includes('bot') || 
            ipInfo.userAgent.includes('crawler') ||
            ipInfo.userAgent.length < 10
        )) {
            suspiciousFactors.push('suspicious_user_agent');
        }
        
        if (suspiciousFactors.length > 0) {
            analysis.suspiciousActivity.push({
                ...ipInfo,
                suspiciousFactors
            });
        }
    });
    
    return analysis;
}

/**
 * Generar reporte de estado de rate limiting
 */
function generateRateLimitReport() {
    return {
        timestamp: new Date().toISOString(),
        configuration: {
            auth: {
                windowMs: process.env.RATE_LIMIT_AUTH_WINDOW || '15 minutes',
                max: process.env.RATE_LIMIT_AUTH_MAX || 50
            },
            general: {
                windowMs: process.env.RATE_LIMIT_GENERAL_WINDOW || '10 minutes',
                max: process.env.RATE_LIMIT_GENERAL_MAX || 5000
            },
            production: {
                windowMs: process.env.RATE_LIMIT_PRODUCTION_WINDOW || '5 minutes',
                max: process.env.RATE_LIMIT_PRODUCTION_MAX || 10000
            }
        },
        stats: {
            ...rateLimitStore.stats,
            uniqueIPs: rateLimitStore.stats.uniqueIPs.size,
            uptimeMinutes: Math.floor((Date.now() - rateLimitStore.stats.startTime) / 1000 / 60)
        },
        recentViolations: Array.from(rateLimitStore.violations.entries())
            .map(([ip, violations]) => ({
                ip,
                violationCount: violations.length,
                lastViolation: violations[violations.length - 1]
            }))
            .sort((a, b) => b.violationCount - a.violationCount)
            .slice(0, 5)
    };
}

/**
 * Limpiar datos antiguos del store
 */
function cleanupOldData() {
    const cutoff = Date.now() - RATE_LIMIT_CONFIG.MONITORING_WINDOW;
    
    // Limpiar requests antiguos
    for (const [ip, data] of rateLimitStore.requests.entries()) {
        data.requests = data.requests.filter(r => r.timestamp > cutoff);
        
        // Remover IPs sin requests recientes
        if (data.requests.length === 0 && data.lastSeen < cutoff) {
            rateLimitStore.requests.delete(ip);
        }
    }
    
    // Limpiar violaciones antiguas (mantener últimas 24 horas)
    const violationCutoff = Date.now() - (24 * 60 * 60 * 1000);
    for (const [ip, violations] of rateLimitStore.violations.entries()) {
        const recentViolations = violations.filter(v => v.timestamp > violationCutoff);
        
        if (recentViolations.length === 0) {
            rateLimitStore.violations.delete(ip);
        } else {
            rateLimitStore.violations.set(ip, recentViolations);
        }
    }
    
    safeLog.info('Rate limit data cleanup completed', {
        activeIPs: rateLimitStore.requests.size,
        violatingIPs: rateLimitStore.violations.size
    });
}

// Configurar limpieza automática
setInterval(cleanupOldData, RATE_LIMIT_CONFIG.CLEANUP_INTERVAL);

// Router para endpoints de monitoreo
const router = express.Router();

/**
 * GET /api/rate-limits/status
 * Obtener estado actual del rate limiting
 */
router.get('/rate-limits/status', (req, res) => {
    try {
        const report = generateRateLimitReport();
        res.json(report);
    } catch (error) {
        safeLog.error('Error generating rate limit report', { error: error.message });
        res.status(500).json({ error: 'Error generating report' });
    }
});

/**
 * GET /api/rate-limits/analysis
 * Análisis detallado de patrones de tráfico
 */
router.get('/rate-limits/analysis', (req, res) => {
    try {
        const analysis = analyzeTrafficPatterns();
        res.json(analysis);
    } catch (error) {
        safeLog.error('Error analyzing traffic patterns', { error: error.message });
        res.status(500).json({ error: 'Error analyzing traffic' });
    }
});

/**
 * GET /api/rate-limits/violations
 * Obtener historial de violaciones
 */
router.get('/rate-limits/violations', (req, res) => {
    try {
        const violations = Array.from(rateLimitStore.violations.entries())
            .map(([ip, violationList]) => ({
                ip,
                violations: violationList,
                totalViolations: violationList.length,
                lastViolation: violationList[violationList.length - 1]
            }))
            .sort((a, b) => b.totalViolations - a.totalViolations);
        
        res.json({
            timestamp: new Date().toISOString(),
            totalViolatingIPs: violations.length,
            violations
        });
    } catch (error) {
        safeLog.error('Error fetching violations', { error: error.message });
        res.status(500).json({ error: 'Error fetching violations' });
    }
});

/**
 * POST /api/rate-limits/reset
 * Resetear estadísticas de rate limiting (solo en desarrollo)
 */
router.post('/rate-limits/reset', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Operation not allowed in production' });
    }
    
    try {
        rateLimitStore.requests.clear();
        rateLimitStore.violations.clear();
        rateLimitStore.stats = {
            totalRequests: 0,
            blockedRequests: 0,
            uniqueIPs: new Set(),
            startTime: Date.now()
        };
        
        safeLog.info('Rate limit statistics reset');
        res.json({ message: 'Rate limit statistics reset successfully' });
    } catch (error) {
        safeLog.error('Error resetting rate limit statistics', { error: error.message });
        res.status(500).json({ error: 'Error resetting statistics' });
    }
});

/**
 * Función principal para ejecutar como script independiente
 */
async function main() {
    console.log('🔍 Rate Limit Monitor - Iniciando análisis...');
    console.log('=====================================\n');
    
    // Mostrar configuración actual
    console.log('📊 Configuración actual:');
    console.log(`- Auth Rate Limit: ${process.env.RATE_LIMIT_AUTH_MAX || 50} requests/15min`);
    console.log(`- General Rate Limit: ${process.env.RATE_LIMIT_GENERAL_MAX || 5000} requests/10min`);
    console.log(`- Production Rate Limit: ${process.env.RATE_LIMIT_PRODUCTION_MAX || 10000} requests/5min`);
    console.log('');
    
    // Generar reporte
    const report = generateRateLimitReport();
    console.log('📈 Estadísticas actuales:');
    console.log(`- Total requests: ${report.stats.totalRequests}`);
    console.log(`- Blocked requests: ${report.stats.blockedRequests}`);
    console.log(`- Unique IPs: ${report.stats.uniqueIPs}`);
    console.log(`- Uptime: ${report.stats.uptimeMinutes} minutes`);
    console.log('');
    
    // Mostrar violaciones recientes
    if (report.recentViolations.length > 0) {
        console.log('⚠️ Violaciones recientes:');
        report.recentViolations.forEach(violation => {
            console.log(`- IP: ${violation.ip} (${violation.violationCount} violaciones)`);
        });
    } else {
        console.log('✅ No hay violaciones recientes');
    }
    
    console.log('\n🔧 Para obtener más detalles, usa los endpoints:');
    console.log('- GET /api/rate-limits/status');
    console.log('- GET /api/rate-limits/analysis');
    console.log('- GET /api/rate-limits/violations');
}

// Si se ejecuta directamente como script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    trackRequests,
    router,
    analyzeTrafficPatterns,
    generateRateLimitReport,
    rateLimitStore
};