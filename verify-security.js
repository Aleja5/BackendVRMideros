#!/usr/bin/env node

/**
 * Script de verificación de seguridad
 * Ejecutar antes de desplegar a producción
 */

const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde el directorio correcto
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('🔍 VERIFICACIÓN DE SEGURIDAD');
console.log('='.repeat(50));

let errors = 0;
let warnings = 0;

// Función para mostrar error
const showError = (message) => {
    console.log(`❌ ERROR: ${message}`);
    errors++;
};

// Función para mostrar advertencia
const showWarning = (message) => {
    console.log(`⚠️  ADVERTENCIA: ${message}`);
    warnings++;
};

// Función para mostrar éxito
const showSuccess = (message) => {
    console.log(`✅ ${message}`);
};

console.log('\n1. Verificando variables de entorno...');

// Verificar JWT_SECRET
if (!process.env.JWT_SECRET) {
    showError('JWT_SECRET no está definida');
} else if (process.env.JWT_SECRET.length < 64) {
    showError('JWT_SECRET debe tener al menos 64 caracteres (256 bits)');
} else if (process.env.JWT_SECRET === 'mideros4104') {
    showError('JWT_SECRET sigue siendo el valor por defecto inseguro');
} else {
    showSuccess('JWT_SECRET está configurada correctamente');
}

// Verificar MONGO_URI
if (!process.env.MONGO_URI) {
    showError('MONGO_URI no está definida');
} else if (process.env.MONGO_URI.includes('Thomas130817')) {
    showError('MONGO_URI contiene credenciales por defecto inseguras');
} else {
    showSuccess('MONGO_URI está configurada');
}

// Verificar configuración de email
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    showWarning('EMAIL_USER o EMAIL_PASS no están configuradas');
} else {
    showSuccess('Configuración de email presente');
}

// Verificar NODE_ENV
if (process.env.NODE_ENV === 'production') {
    showSuccess('NODE_ENV configurado para producción');
    
    // Verificaciones adicionales para producción
    if (!process.env.CORS_ORIGIN) {
        showError('CORS_ORIGIN debe estar definida en producción');
    } else {
        showSuccess('CORS_ORIGIN configurada para producción');
    }
} else {
    showWarning('NODE_ENV no está configurado para producción');
}

console.log('\n2. Verificando archivos sensibles...');

// Verificar que .env está en .gitignore
const gitignorePath = path.join(__dirname, '..', '.gitignore');
if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignoreContent.includes('.env') || gitignoreContent.includes('*.env')) {
        showSuccess('.env está en .gitignore');
    } else {
        showError('.env NO está en .gitignore - riesgo de exposición');
    }
} else {
    showWarning('No se encontró archivo .gitignore');
}

console.log('\n3. Verificando logs de desarrollo...');

// Buscar console.log en archivos de producción (aproximado)
const searchConsoleLog = (dir) => {
    const files = fs.readdirSync(dir);
    let logCount = 0;
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            logCount += searchConsoleLog(filePath);
        } else if (file.endsWith('.js') && !file.includes('test')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const matches = content.match(/console\.log/g);
            if (matches) {
                logCount += matches.length;
            }
        }
    });
    
    return logCount;
};

try {
    const backendDir = path.join(__dirname, 'src');
    if (fs.existsSync(backendDir)) {
        const logCount = searchConsoleLog(backendDir);
        if (logCount > 10) {
            showWarning(`Se encontraron ${logCount} console.log en el código - considera limpiarlos para producción`);
        } else {
            showSuccess('Cantidad aceptable de logs de desarrollo');
        }
    }
} catch (error) {
    showWarning('No se pudo verificar logs de desarrollo');
}

console.log('\n4. Verificando configuración del servidor...');

// Verificar server.js
const serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    if (serverContent.includes('cors()')) {
        showWarning('CORS configurado como wildcard - considera restringir orígenes');
    } else if (serverContent.includes('corsOptions')) {
        showSuccess('CORS configurado con opciones específicas');
    }
    
    if (serverContent.includes('X-Frame-Options')) {
        showSuccess('Headers de seguridad configurados');
    } else {
        showWarning('Headers de seguridad no detectados');
    }
} else {
    showError('No se encontró server.js');
}

console.log('\n' + '='.repeat(50));
console.log('📊 RESUMEN DE SEGURIDAD');
console.log('='.repeat(50));

if (errors === 0 && warnings === 0) {
    console.log('🎉 ¡EXCELENTE! No se encontraron problemas de seguridad');
} else {
    console.log(`❌ Errores críticos: ${errors}`);
    console.log(`⚠️  Advertencias: ${warnings}`);
    
    if (errors > 0) {
        console.log('\n🚨 IMPORTANTE: Corrige los errores críticos antes de desplegar a producción');
        process.exit(1);
    } else {
        console.log('\n✅ No hay errores críticos, pero revisa las advertencias');
    }
}

console.log('\n💡 Recomendaciones adicionales:');
console.log('   - Usar rate limiting en APIs críticas');
console.log('   - Implementar monitoreo de logs');
console.log('   - Configurar backup automático de la base de datos');
console.log('   - Usar certificados SSL válidos en producción');
console.log('   - Implementar 2FA para cuentas de administrador');
