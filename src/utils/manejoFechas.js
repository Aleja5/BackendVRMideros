/**
 * Utilidad para manejar fechas correctamente en Colombia (GMT-5)
 * Soluciona el problema de zona horaria donde las fechas se desfasan 1 día
 */

/**
 * Crea una fecha normalizada para Colombia sin problemas de zona horaria
 * @param {string|Date} fecha - Fecha en formato YYYY-MM-DD, ISO string, o objeto Date
 * @returns {Date} - Fecha normalizada a las 00:00:00 hora local de Colombia
 */
function crearFechaColombia(fecha) {
    let fechaObj;
      if (typeof fecha === 'string') {
        // Manejar diferentes formatos de string
        if (fecha.includes('T') || fecha.includes('Z')) {
            // Formato ISO (2025-06-14T00:00:00.000Z)
            // IMPORTANTE: Extraer la fecha sin conversion de zona horaria
            const partesFecha = fecha.split('T')[0]; // Obtener solo "2025-06-14"
            if (partesFecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [año, mes, dia] = partesFecha.split('-').map(Number);
                fechaObj = new Date(año, mes - 1, dia, 0, 0, 0, 0);
            } else {
                throw new Error('Fecha ISO con formato incorrecto');
            }
        } else if (fecha.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // Formato simple YYYY-MM-DD
            const [año, mes, dia] = fecha.split('-').map(Number);
            fechaObj = new Date(año, mes - 1, dia, 0, 0, 0, 0);
        } else {
            // Intentar parsear como fecha normal
            const fechaParsed = new Date(fecha);
            if (isNaN(fechaParsed.getTime())) {
                throw new Error('Formato de fecha no reconocido');
            }
            fechaObj = new Date(fechaParsed.getFullYear(), fechaParsed.getMonth(), fechaParsed.getDate(), 0, 0, 0, 0);
        }
    }else if (fecha instanceof Date) {
        // Si ya es Date, crear una nueva fecha local con los mismos día/mes/año
        if (isNaN(fecha.getTime())) {
            throw new Error('Objeto Date inválido');
        }
        fechaObj = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0, 0);
    } else {
        throw new Error('Fecha debe ser string o objeto Date');
    }
    
    return fechaObj;
}

/**
 * Normaliza una fecha para comparaciones y almacenamiento
 * Asegura que siempre sea medianoche hora local
 * @param {string|Date} fecha 
 * @returns {Date}
 */
function normalizarFecha(fecha) {
    const fechaNormalizada = crearFechaColombia(fecha);
    return fechaNormalizada;
}

/**
 * Convierte una fecha a formato YYYY-MM-DD
 * @param {Date} fecha 
 * @returns {string}
 */
function fechaAString(fecha) {
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

/**
 * Verifica si dos fechas son del mismo día (independiente de la hora)
 * @param {Date} fecha1 
 * @param {Date} fecha2 
 * @returns {boolean}
 */
function esMismodia(fecha1, fecha2) {
    return fecha1.getFullYear() === fecha2.getFullYear() &&
           fecha1.getMonth() === fecha2.getMonth() &&
           fecha1.getDate() === fecha2.getDate();
}

/**
 * Obtiene el rango de fechas para un día específico (00:00:00 a 23:59:59)
 * @param {string|Date} fecha 
 * @returns {Object} {inicio: Date, fin: Date}
 */
function obtenerRangoDia(fecha) {
    const fechaNormalizada = normalizarFecha(fecha);
    const inicio = new Date(fechaNormalizada);
    const fin = new Date(fechaNormalizada);
    fin.setHours(23, 59, 59, 999);
    
    return { inicio, fin };
}

module.exports = {
    crearFechaColombia,
    normalizarFecha,
    fechaAString,
    esMismodia,
    obtenerRangoDia
};
