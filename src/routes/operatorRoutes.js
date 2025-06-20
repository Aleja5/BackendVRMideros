const express = require('express');
const {
    validateCedula,
    crearOperario,
    obtenerOperarios,
    obtenerOperario,
    actualizarOperario,
    eliminarOperario
} = require('../controllers/operatorController');
const Operario = require('../models/Operario');

const router = express.Router();

// Rate limiting optimizado para múltiples usuarios simultáneos
const rateLimit = {};
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const MAX_REQUESTS = 200; // Aumentado significativamente para múltiples usuarios

const rateLimitMiddleware = (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent') || 'unknown';
    const clientKey = `${clientIP}:${userAgent.slice(0, 20)}`; // Más granular
    const now = Date.now();
    
    if (!rateLimit[clientKey]) {
        rateLimit[clientKey] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
        return next();
    }
    
    if (now > rateLimit[clientKey].resetTime) {
        rateLimit[clientKey] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
        return next();
    }
    
    if (rateLimit[clientKey].count >= MAX_REQUESTS) {
        const retryAfter = Math.ceil((rateLimit[clientKey].resetTime - now) / 1000);
        return res.status(429).json({
            error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
            retryAfter: `${retryAfter} segundos`
        });
    }
    
    rateLimit[clientKey].count++;
    next();
};

// Ruta para validar cédula con rate limiting
router.post('/validate-cedula', rateLimitMiddleware, validateCedula);

// Ruta para buscar operarios por nombre
router.get('/buscar/operario', async (req, res) => {
    try {
        const { nombre } = req.query;
        const operarios = await Operario.find({ name: { $regex: nombre, $options: 'i' } });
        if (operarios.length === 0) {
            return res.status(404).json({ msg: 'No se encontraron operarios con ese nombre' });
        }
        res.status(200).json(operarios);
    } catch (error) {
        console.error('Error al buscar operarios:', error);
        res.status(500).json({ msg: 'Error al buscar operarios', error: error.message });
    }
});

router.post('/', crearOperario);
router.get('/', obtenerOperarios);
router.get('/:id', obtenerOperario);
router.put('/:id', actualizarOperario);
router.delete('/:id', eliminarOperario);

module.exports = router;