const fs = require('fs');
const path = require('path');

// Lista de archivos donde queremos mantener algunos console.log para operaciones críticas
const archivosExcluir = [
    'db.js',  // Mantener logs de conexión a DB
    'logger.js', // El logger necesita console.log interno
    'authControllers.js' // Ya limpiado manualmente
];

// Función para limpiar console.log de un archivo
function limpiarConsoleLog(rutaArchivo) {
    const contenido = fs.readFileSync(rutaArchivo, 'utf8');
    
    // Reemplazar console.log con comentarios (para poder revisar después)
    const contenidoLimpio = contenido.replace(
        /(\s*)(console\.log\([^)]*\);?)/g, 
        '$1// REMOVED: $2'
    );
    
    if (contenido !== contenidoLimpio) {
        fs.writeFileSync(rutaArchivo, contenidoLimpio);
        const lineasRemovidas = (contenido.match(/console\.log/g) || []).length;
        console.log(`✅ ${path.basename(rutaArchivo)}: ${lineasRemovidas} console.log removidos`);
        return lineasRemovidas;
    }
    
    return 0;
}

// Función recursiva para procesar directorios
function procesarDirectorio(directorio) {
    let totalRemovidos = 0;
    
    const elementos = fs.readdirSync(directorio);
    
    for (const elemento of elementos) {
        const rutaCompleta = path.join(directorio, elemento);
        const stats = fs.statSync(rutaCompleta);
        
        if (stats.isDirectory()) {
            totalRemovidos += procesarDirectorio(rutaCompleta);
        } else if (elemento.endsWith('.js') && !archivosExcluir.includes(elemento)) {
            totalRemovidos += limpiarConsoleLog(rutaCompleta);
        }
    }
    
    return totalRemovidos;
}

console.log('🧹 Iniciando limpieza de console.log...');
console.log(`📁 Procesando directorio: ${__dirname}/src`);
console.log(`🔒 Archivos excluidos: ${archivosExcluir.join(', ')}`);
console.log('─'.repeat(50));

const totalRemovidos = procesarDirectorio(path.join(__dirname, 'src'));

console.log('─'.repeat(50));
console.log(`🎉 Limpieza completada: ${totalRemovidos} console.log removidos total`);
console.log('💡 Los console.log fueron comentados para poder revisar si es necesario');
