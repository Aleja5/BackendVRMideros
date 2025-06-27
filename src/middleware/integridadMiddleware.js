// backend/src/middleware/integridadMiddleware.js

const { verificarIntegridadReferencial, generarRespuestaIntegridad } = require('../utils/integridadReferencial');

/**
 * Middleware para verificar integridad referencial antes de eliminar entidades
 * @param {string} tipoEntidad - Tipo de entidad a verificar
 * @param {function} obtenerNombre - Función para obtener el nombre de la entidad
 * @returns {function} Middleware function
 */
function verificarIntegridadAntesDEliminar(tipoEntidad, obtenerNombre = null) {
    return async (req, res, next) => {
        try {
            const { id } = req.params;
            
            // Obtener el modelo correspondiente
            let Modelo;
            switch (tipoEntidad) {
                case 'operario':
                    Modelo = require('../models/Operario');
                    break;
                case 'maquina':
                    Modelo = require('../models/Maquina');
                    break;
                case 'area':
                    Modelo = require('../models/AreaProduccion');
                    break;
                case 'proceso':
                    Modelo = require('../models/Proceso');
                    break;
                case 'insumo':
                    Modelo = require('../models/Insumos');
                    break;
                default:
                    return res.status(400).json({ message: 'Tipo de entidad no válido' });
            }

            // Verificar si la entidad existe
            const entidad = await Modelo.findById(id);
            if (!entidad) {
                return res.status(404).json({ 
                    message: `${tipoEntidad.charAt(0).toUpperCase() + tipoEntidad.slice(1)} no encontrado(a)` 
                });
            }

            // Obtener el nombre de la entidad
            let nombreEntidad = '';
            if (obtenerNombre && typeof obtenerNombre === 'function') {
                nombreEntidad = obtenerNombre(entidad);
            } else {
                // Intentar obtener el nombre de campos comunes
                nombreEntidad = entidad.nombre || entidad.name || entidad.numeroOti || 'Sin nombre';
            }

            // Verificar integridad referencial
            const verificacion = await verificarIntegridadReferencial(id, tipoEntidad, nombreEntidad);

            if (!verificacion.puedeEliminar) {
                return res.status(409).json(generarRespuestaIntegridad(verificacion));
            }

            // Si puede eliminar, pasar al siguiente middleware
            req.entidadAEliminar = entidad;
            req.nombreEntidad = nombreEntidad;
            next();

        } catch (error) {
            console.error(`Error verificando integridad para ${tipoEntidad}:`, error);
            res.status(500).json({ 
                message: 'Error interno del servidor al verificar integridad referencial',
                error: error.message 
            });
        }
    };
}

/**
 * Middleware específico para verificar operarios
 */
const verificarIntegridadOperario = verificarIntegridadAntesDEliminar('operario', (operario) => operario.name);

/**
 * Middleware específico para verificar máquinas
 */
const verificarIntegridadMaquina = verificarIntegridadAntesDEliminar('maquina', (maquina) => maquina.nombre);

/**
 * Middleware específico para verificar áreas
 */
const verificarIntegridadArea = verificarIntegridadAntesDEliminar('area', (area) => area.nombre);

/**
 * Middleware específico para verificar procesos
 */
const verificarIntegridadProceso = verificarIntegridadAntesDEliminar('proceso', (proceso) => proceso.nombre);

/**
 * Middleware específico para verificar insumos
 */
const verificarIntegridadInsumo = verificarIntegridadAntesDEliminar('insumo', (insumo) => insumo.nombre);

module.exports = {
    verificarIntegridadAntesDEliminar,
    verificarIntegridadOperario,
    verificarIntegridadMaquina,
    verificarIntegridadArea,
    verificarIntegridadProceso,
    verificarIntegridadInsumo
};
