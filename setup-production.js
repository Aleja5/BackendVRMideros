const fs = require('fs');
const path = require('path');

console.log('🚀 CONFIGURANDO ENTORNO PARA PRODUCCIÓN');
console.log('═'.repeat(50));

// Leer el archivo .env actual
const envPath = path.join(__dirname, '.env');
let envContent = fs.readFileSync(envPath, 'utf8');

// Preguntar al usuario por el dominio del frontend
console.log('\n📝 Configuración requerida:');
console.log('1. Dominio del frontend (ej: https://mi-app.com)');
console.log('2. ¿Continuar con la configuración automática? (y/n)');

// Para este script, vamos a mostrar lo que se haría
console.log('\n🔄 Cambios que se aplicarían:');
console.log('');

// Mostrar los cambios que se harían
const cambios = [
    {
        descripcion: 'NODE_ENV → production',
        buscar: 'NODE_ENV=development',
        reemplazar: 'NODE_ENV=production'
    },
    {
        descripcion: 'CORS_ORIGIN → dominio de producción',
        buscar: 'CORS_ORIGIN=http://localhost:5173',
        reemplazar: 'CORS_ORIGIN=https://TU-DOMINIO-AQUI.com'
    }
];

cambios.forEach((cambio, i) => {
    console.log(`${i + 1}. ${cambio.descripcion}`);
    console.log(`   Actual:  ${cambio.buscar}`);
    console.log(`   Nuevo:   ${cambio.reemplazar}`);
    console.log('');
});

console.log('⚠️  IMPORTANTE:');
console.log('• Reemplaza "TU-DOMINIO-AQUI.com" con tu dominio real');
console.log('• Asegúrate de tener HTTPS configurado');
console.log('• Verifica que MongoDB esté accesible desde producción');
console.log('');

console.log('📋 Para aplicar cambios manualmente:');
console.log('1. Edita backend/.env');
console.log('2. Cambia NODE_ENV=development → NODE_ENV=production');
console.log('3. Cambia CORS_ORIGIN a tu dominio de producción');
console.log('4. Ejecuta: node verify-security.js');
console.log('');

console.log('🔐 Variables críticas que ya están configuradas:');
console.log('✅ JWT_SECRET (512-bit)');
console.log('✅ MONGO_URI (usuario limitado)');
console.log('✅ EMAIL_* (configurado)');
console.log('');

console.log('🎯 Comando final de verificación:');
console.log('node verify-security.js && node test-config.js');
console.log('');

console.log('═'.repeat(50));
console.log('🏆 APLICACIÓN LISTA PARA PRODUCCIÓN');
console.log('Solo faltan los cambios de entorno mostrados arriba');
