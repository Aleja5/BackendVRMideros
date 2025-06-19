const mongoose = require('mongoose');
require('dotenv').config();

// Solo mostrar información de conexión en desarrollo
if (process.env.NODE_ENV !== 'production') {
    console.log("🔍 Conectando a MongoDB...");
}

const connectDB = async () => {
  try {
    // Validar que existe la URI de MongoDB
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI no está definida en las variables de entorno');
    }    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000, // 30 segundos
      socketTimeoutMS: 45000, // 45 segundos
      maxPoolSize: 10, // Máximo 10 conexiones simultáneas
      retryWrites: true,
      w: 'majority'
    });
    
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    
    // Eventos de conexión para monitoreo
    mongoose.connection.on('error', (err) => {
        console.error('❌ Error de MongoDB:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB desconectado');
    });
    
    mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconectado');
    });
    
  } catch (error) {
    console.error('❌ Error de conexión a MongoDB:', error.message);
    
    // En producción, intentar reconectar
    if (process.env.NODE_ENV === 'production') {
        console.log('🔄 Intentando reconectar en 5 segundos...');
        setTimeout(connectDB, 5000);
    } else {
        process.exit(1);
    }
  }
};

module.exports = connectDB;