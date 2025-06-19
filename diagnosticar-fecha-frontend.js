// Diagnosticar el problema de fecha en el frontend

console.log('=== DIAGNÓSTICO DEL PROBLEMA DE FECHA EN FRONTEND ===\n');

// Simular exactamente lo que hace el frontend
console.log('🌐 Lo que hace el frontend actualmente:');
const fechaActual = new Date();
console.log('new Date():', fechaActual.toString());
console.log('new Date().toISOString():', fechaActual.toISOString());
console.log('new Date().toISOString().split(\'T\')[0]:', fechaActual.toISOString().split('T')[0]);

// Verificar zona horaria
console.log('\n🕐 Información de zona horaria:');
console.log('Zona horaria:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Offset (minutos):', fechaActual.getTimezoneOffset());
console.log('Offset (horas):', fechaActual.getTimezoneOffset() / 60);

// Comparar métodos para obtener fecha local
console.log('\n📅 Diferentes métodos para obtener fecha local:');

// Método problemático actual
const metodo1 = new Date().toISOString().split('T')[0];
console.log('1. new Date().toISOString().split(\'T\')[0]:', metodo1);

// Método correcto para fecha local
const hoy = new Date();
const metodo2 = `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}-${hoy.getDate().toString().padStart(2, '0')}`;
console.log('2. Fecha local construida manualmente:', metodo2);

// Método usando toLocaleDateString
const metodo3 = new Date().toLocaleDateString('en-CA'); // formato YYYY-MM-DD
console.log('3. toLocaleDateString(\'en-CA\'):', metodo3);

// Verificar si hay diferencia
console.log('\n⚠️ Comparación de métodos:');
console.log('¿Método 1 === Método 2?', metodo1 === metodo2 ? '✅ Iguales' : '❌ Diferentes');
console.log('¿Método 2 === Método 3?', metodo2 === metodo3 ? '✅ Iguales' : '❌ Diferentes');

if (metodo1 !== metodo2) {
    console.log('\n🚨 PROBLEMA DETECTADO:');
    console.log('El método actual del frontend (toISOString) está generando una fecha diferente');
    console.log('a la fecha local actual del sistema.');
    console.log('\nEsto explica por qué las actividades se guardan con fecha de ayer.');
}

// Simular el envío al backend
console.log('\n📤 Simulación de envío al backend:');
console.log('Fecha que enviaría el frontend (problemática):', metodo1);

// Simular normalización en backend
const { normalizarFecha, fechaAString } = require('./src/utils/manejoFechas');
const fechaNormalizada = normalizarFecha(metodo1);
console.log('Fecha que procesaría el backend:', fechaAString(fechaNormalizada));

console.log('\n💡 SOLUCIÓN:');
console.log('El frontend debe usar la fecha local en lugar de toISOString():');
console.log('Cambiar:', 'new Date().toISOString().split(\'T\')[0]');
console.log('Por:', metodo2, '(método manual)');
console.log('O por:', metodo3, '(toLocaleDateString)');
