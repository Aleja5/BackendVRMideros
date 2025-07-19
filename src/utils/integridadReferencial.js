// backend/src/utils/integridadReferencial.js

const Produccion = require('../models/Produccion');

/**
 * Verifica si una entidad tiene registros de producción asociados
 * @param {string} entidadId - ID de la entidad a verificar
 * @param {string} tipoEntidad - Tipo de entidad ('operario', 'maquina', 'area', 'proceso', 'insumo')
 * @param {string} nombreEntidad - Nombre de la entidad para mostrar en mensajes
 * @returns {Promise<{puedeEliminar: boolean, registrosAfectados: number, mensaje: string}>}
 */
async function verificarIntegridadReferencial(entidadId, tipoEntidad, nombreEntidad = '') {
    try {
        let query = {};
        
        // Construir la consulta según el tipo de entidad
        switch (tipoEntidad) {
            case 'operario':
                query = { operario: entidadId };
                break;
            case 'maquina':
                query = { maquina: { $in: [entidadId] } };
                break;
            case 'area':
                query = { areaProduccion: entidadId };
                break;
            case 'proceso':
                query = { procesos: { $in: [entidadId] } };
                break;
            case 'insumo':
                query = { insumos: { $in: [entidadId] } };
                break;
            default:
                throw new Error(`Tipo de entidad no soportado: ${tipoEntidad}`);
        }

        const registrosAfectados = await Produccion.countDocuments(query);
        
        if (registrosAfectados > 0) {
            return {
                puedeEliminar: false,
                registrosAfectados,
                mensaje: `No se puede eliminar ${tipoEntidad} "${nombreEntidad}" porque tiene ${registrosAfectados} registro(s) de producción asociado(s)`,
                detalles: {
                    entidad: tipoEntidad,
                    nombre: nombreEntidad,
                    registrosAfectados,
                    sugerencia: 'Primero elimine o reasigne los registros de producción asociados'
                }
            };
        }

        return {
            puedeEliminar: true,
            registrosAfectados: 0,
            mensaje: `${tipoEntidad} "${nombreEntidad}" puede ser eliminado(a) sin afectar registros de producción`
        };

    } catch (error) {
        console.error('Error verificando integridad referencial:', error);
        throw error;
    }
}

/**
 * Genera una respuesta de error estándar para violaciones de integridad referencial
 * @param {Object} verificacion - Resultado de verificarIntegridadReferencial
 * @returns {Object} Respuesta de error formateada
 */
function generarRespuestaIntegridad(verificacion) {
    return {
        message: verificacion.mensaje,
        conflicto: 'integridad_referencial',
        detalles: verificacion.detalles
    };
}

/**
 * Obtiene registros de producción que serían afectados por la eliminación
 * @param {string} entidadId - ID de la entidad
 * @param {string} tipoEntidad - Tipo de entidad
 * @param {number} limite - Número máximo de registros a retornar (default: 5)
 * @returns {Promise<Array>} Lista de registros de producción afectados
 */
async function obtenerRegistrosAfectados(entidadId, tipoEntidad, limite = 5) {
    try {
        let query = {};
        
        switch (tipoEntidad) {
            case 'operario':
                query = { operario: entidadId };
                break;
            case 'maquina':
                query = { maquina: { $in: [entidadId] } };
                break;
            case 'area':
                query = { areaProduccion: entidadId };
                break;
            case 'proceso':
                query = { procesos: { $in: [entidadId] } };
                break;
            case 'insumo':
                query = { insumos: { $in: [entidadId] } };
                break;
            default:
                throw new Error(`Tipo de entidad no soportado: ${tipoEntidad}`);
        }

        const registros = await Produccion.find(query)
            .limit(limite)
            .populate('oti', 'numeroOti')
            .populate('operario', 'name')
            .populate('procesos', 'nombre')
            .populate('areaProduccion', 'nombre')
            .populate('maquina', 'nombre')
            .populate('insumos', 'nombre')
            .sort({ fecha: -1 });

        return registros;
    } catch (error) {
        console.error('Error obteniendo registros afectados:', error);
        throw error;
    }
}

module.exports = {
    verificarIntegridadReferencial,
    generarRespuestaIntegridad,
    obtenerRegistrosAfectados
};
