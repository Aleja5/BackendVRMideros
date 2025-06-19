require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function listUsers() {
    try {
        console.log('🔍 Conectando a MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');
        
        const users = await User.find({}, 'email role');
        console.log('📋 Usuarios en la base de datos:');
        users.forEach(user => {
            console.log(`  - Email: ${user.email}, Role: ${user.role}`);
        });
        
        if (users.length === 0) {
            console.log('⚠️ No hay usuarios en la base de datos');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Conexión cerrada');
    }
}

listUsers();
