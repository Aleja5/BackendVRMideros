const fs = require('fs');
const https = require('https');
const path = require('path');

/**
 * Configuración HTTPS para producción
 * Este archivo debe ser usado solo cuando se despliegue en producción
 */

// Función para crear servidor HTTPS
const createHttpsServer = (app) => {
    if (process.env.NODE_ENV !== 'production' || !process.env.HTTPS_ENABLED) {
        // REMOVED: console.log('⚠️ HTTPS no configurado - ejecutando en HTTP');
        return null;
    }

    try {
        // Verificar que existen los archivos de certificados
        const certPath = process.env.SSL_CERT_PATH;
        const keyPath = process.env.SSL_KEY_PATH;

        if (!certPath || !keyPath) {
            console.error('❌ Variables SSL_CERT_PATH y SSL_KEY_PATH son requeridas para HTTPS');
            return null;
        }

        if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
            console.error('❌ Archivos de certificado SSL no encontrados');
            return null;
        }

        const options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };

        // Crear servidor HTTPS
        const httpsServer = https.createServer(options, app);
        
        // REMOVED: console.log('🔒 Servidor HTTPS configurado correctamente');
        return httpsServer;

    } catch (error) {
        console.error('❌ Error al configurar HTTPS:', error.message);
        return null;
    }
};

// Función para forzar HTTPS en producción
const forceHttps = (req, res, next) => {
    if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
        return res.redirect(301, 'https://' + req.get('host') + req.url);
    }
    next();
};

module.exports = {
    createHttpsServer,
    forceHttps
};
