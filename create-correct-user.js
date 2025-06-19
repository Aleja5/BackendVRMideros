require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function createCorrectTestUser() {
    try {
        console.log('🔍 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');
        
        // Eliminar usuario de prueba anterior si existe
        await User.deleteOne({ email: 'test@gmail.com' });
        console.log('🗑️ Usuario anterior eliminado');
        
        // Crear usuario de prueba SIN hashear la contraseña manualmente
        // El middleware del modelo se encargará de hashearla
        const testUser = new User({
            nombre: 'Usuario Test',
            email: 'test@gmail.com',
            password: '123456', // Contraseña en texto plano
            role: 'admin'
        });
        
        await testUser.save();
        console.log('✅ Usuario de prueba creado correctamente: test@gmail.com / 123456');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Conexión cerrada');
    }
}

createCorrectTestUser();
