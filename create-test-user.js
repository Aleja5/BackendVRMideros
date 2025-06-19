require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');

async function createTestUser() {
    try {
        console.log('🔍 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');
        
        // Verificar si el usuario de prueba ya existe
        const existingUser = await User.findOne({ email: 'test@gmail.com' });
        if (existingUser) {
            console.log('⚠️ Usuario de prueba ya existe');
            await mongoose.connection.close();
            return;
        }
        
        // Crear contraseña hasheada
        const hashedPassword = await bcrypt.hash('123456', 12);
          // Crear usuario de prueba
        const testUser = new User({
            nombre: 'Usuario Test',
            email: 'test@gmail.com',
            password: hashedPassword,
            role: 'admin'
        });
        
        await testUser.save();
        console.log('✅ Usuario de prueba creado: test@gmail.com / 123456');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Conexión cerrada');
    }
}

createTestUser();
