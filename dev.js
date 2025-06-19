// Archivo para desarrollo local
require('dotenv').config();
const app = require('./server');

const PORT = process.env.PORT || 5000;

// Iniciar servidor para desarrollo
const server = app.listen(PORT, () => {
  console.log(`🚀 Servidor de desarrollo corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS habilitado para: ${process.env.CORS_ORIGIN || 'localhost'}`);
});

// Manejo graceful de cierre del servidor
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM recibido. Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT recibido. Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado.');
        process.exit(0);
    });
});

module.exports = server;
