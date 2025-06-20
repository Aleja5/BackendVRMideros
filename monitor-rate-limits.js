// Monitor de Rate Limiting - Para monitorear el uso de la aplicación
// Ejecutar con: node monitor-rate-limits.js

const express = require('express');
const router = express.Router();

// Stats globales de rate limiting
const rateLimitStats = {
    requests: {
        total: 0,
        by_ip: {},
        by_path: {},
        by_hour: {}
    },
    blocked: {
        total: 0,
        by_ip: {},
        reasons: {}
    },
    reset_time: Date.now()
};

// Middleware para trackear requests
const trackRequests = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const path = req.path;
    const hour = new Date().getHours();
    
    // Incrementar contadores
    rateLimitStats.requests.total++;
    rateLimitStats.requests.by_ip[ip] = (rateLimitStats.requests.by_ip[ip] || 0) + 1;
    rateLimitStats.requests.by_path[path] = (rateLimitStats.requests.by_path[path] || 0) + 1;
    rateLimitStats.requests.by_hour[hour] = (rateLimitStats.requests.by_hour[hour] || 0) + 1;
    
    // Override del res.status para detectar rate limiting
    const originalStatus = res.status;
    res.status = function(code) {
        if (code === 429) {
            rateLimitStats.blocked.total++;
            rateLimitStats.blocked.by_ip[ip] = (rateLimitStats.blocked.by_ip[ip] || 0) + 1;
            rateLimitStats.blocked.reasons[path] = (rateLimitStats.blocked.reasons[path] || 0) + 1;
        }
        return originalStatus.call(this, code);
    };
    
    next();
};

// Endpoint para ver estadísticas
const getStats = (req, res) => {
    const uptime = Date.now() - rateLimitStats.reset_time;
    const uptimeHours = (uptime / (1000 * 60 * 60)).toFixed(2);
    
    // Top IPs por requests
    const topIPs = Object.entries(rateLimitStats.requests.by_ip)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([ip, count]) => ({ ip, requests: count }));
    
    // Top paths por requests
    const topPaths = Object.entries(rateLimitStats.requests.by_path)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([path, count]) => ({ path, requests: count }));
    
    // Análisis de bloqueos
    const blockRate = rateLimitStats.requests.total > 0 
        ? ((rateLimitStats.blocked.total / rateLimitStats.requests.total) * 100).toFixed(2)
        : 0;
    
    res.json({
        summary: {
            uptime_hours: parseFloat(uptimeHours),
            total_requests: rateLimitStats.requests.total,
            total_blocked: rateLimitStats.blocked.total,
            block_rate_percent: parseFloat(blockRate),
            requests_per_hour: Math.round(rateLimitStats.requests.total / Math.max(uptimeHours, 0.1))
        },
        top_ips: topIPs,
        top_paths: topPaths,
        hourly_distribution: rateLimitStats.requests.by_hour,
        blocking_analysis: {
            blocked_ips: rateLimitStats.blocked.by_ip,
            blocked_paths: rateLimitStats.blocked.reasons
        },
        recommendations: generateRecommendations()
    });
};

// Generar recomendaciones basadas en las estadísticas
const generateRecommendations = () => {
    const recommendations = [];
    const blockRate = rateLimitStats.requests.total > 0 
        ? (rateLimitStats.blocked.total / rateLimitStats.requests.total) * 100
        : 0;
    
    if (blockRate > 5) {
        recommendations.push({
            type: 'warning',
            message: `Alto porcentaje de bloqueos (${blockRate.toFixed(2)}%). Considera aumentar los límites.`,
            action: 'Aumentar RATE_LIMIT_GENERAL_MAX o revisar la configuración'
        });
    }
    
    if (blockRate < 0.1 && rateLimitStats.requests.total > 1000) {
        recommendations.push({
            type: 'info',
            message: 'Muy pocos bloqueos. Los límites pueden ser apropiados.',
            action: 'Mantener configuración actual'
        });
    }
    
    // Detectar IPs con muchos requests
    const highVolumeIPs = Object.entries(rateLimitStats.requests.by_ip)
        .filter(([ip, count]) => count > 1000);
    
    if (highVolumeIPs.length > 0) {
        recommendations.push({
            type: 'info',
            message: `${highVolumeIPs.length} IP(s) con alto volumen detectadas.`,
            action: 'Revisar si son usuarios legítimos o bots'
        });
    }
    
    return recommendations;
};

// Reset de estadísticas
const resetStats = (req, res) => {
    rateLimitStats.requests = { total: 0, by_ip: {}, by_path: {}, by_hour: {} };
    rateLimitStats.blocked = { total: 0, by_ip: {}, reasons: {} };
    rateLimitStats.reset_time = Date.now();
    
    res.json({ message: 'Estadísticas reseteadas correctamente' });
};

// Configuración de rutas
router.use(trackRequests);
router.get('/rate-limit-stats', getStats);
router.post('/rate-limit-stats/reset', resetStats);

// Para usar como middleware standalone
const createMonitor = () => ({
    middleware: trackRequests,
    getStats: () => rateLimitStats,
    router
});

module.exports = {
    trackRequests,
    getStats,
    resetStats,
    router,
    createMonitor
};

// Si se ejecuta directamente, mostrar stats cada 30 segundos
if (require.main === module) {
    console.log('📊 Monitor de Rate Limiting iniciado');
    console.log('Para ver stats en tiempo real: http://localhost:3000/api/rate-limit-stats');
    
    setInterval(() => {
        const stats = rateLimitStats;
        const uptime = Date.now() - stats.reset_time;
        const uptimeMin = (uptime / (1000 * 60)).toFixed(1);
        
        console.log(`\n📈 Stats (${uptimeMin}m): ${stats.requests.total} requests, ${stats.blocked.total} blocked`);
        
        if (stats.requests.total > 0) {
            const blockRate = ((stats.blocked.total / stats.requests.total) * 100).toFixed(1);
            console.log(`🚫 Block rate: ${blockRate}%`);
        }
    }, 30000);
}
