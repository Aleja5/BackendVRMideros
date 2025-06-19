require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function verifyUser() {
    try {
        console.log('🔍 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');
        
        const user = await User.findOne({ email: 'test@gmail.com' });
        if (!user) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        console.log('👤 Usuario encontrado:', user.email);
        console.log('🔐 Hash almacenado:', user.password);
        
        // Probar la contraseña
        const isMatch = await bcrypt.compare('123456', user.password);
        console.log('🔑 ¿Contraseña coincide?', isMatch);
        
        // También probar con el hash original
        const testHash = await bcrypt.hash('123456', 12);
        console.log('🧪 Hash de prueba:', testHash);
        const testMatch = await bcrypt.compare('123456', testHash);
        console.log('🔬 ¿Nuevo hash funciona?', testMatch);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Conexión cerrada');
    }
}

verifyUser();
