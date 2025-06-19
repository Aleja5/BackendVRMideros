// Archivo de inicio para producción
require('dotenv').config();

// Importar la aplicación
const app = require('./server');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Importante para servicios en la nube

// Manejar errores no capturados
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
  process.exit(1);
});

// Iniciar servidor
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor de producción corriendo en puerto ${PORT}`);
  console.log(`🌍 Modo: ${process.env.NODE_ENV || 'production'}`);
  console.log(`🔗 Host: ${HOST}`);
  console.log(`📅 Iniciado: ${new Date().toLocaleString()}`);
});

// Manejar cierre graceful
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT recibido, cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

module.exports = server;
