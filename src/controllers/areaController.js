const AreaProduccion = require('../models/AreaProduccion');
const { verificarIntegridadReferencial, obtenerRegistrosAfectados } = require('../utils/integridadReferencial');

// Obtener todas las áreas de producción
const obtenerAreas = async (req, res) => {
    const { page = 1, limit = 10, nombre, search } = req.query;
    const query = {};

    if (nombre && search) {
        query.$or = [
            { nombre: { $regex: nombre, $options: 'i' } },
            { nombre: { $regex: search, $options: 'i' } }
        ];
    } else if (nombre) {
        query.nombre = { $regex: nombre, $options: 'i' };
    } else if (search) {
        query.nombre = { $regex: search, $options: 'i' };
    }

    try {
        const totalResults = await AreaProduccion.countDocuments(query);
        const areas = await AreaProduccion.find(query)
            .sort({ nombre: 1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({
            areas,
            totalPages: Math.ceil(totalResults / limit),
            currentPage: Number(page),
            totalResults: totalResults,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener un área de producción por ID
const obtenerArea = async (req, res) => {
    try {
        const area = await AreaProduccion.findById(req.params.id);
        if (!area) {
            return res.status(404).json({ message: 'Área no encontrada' });
        }
        res.json(area);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//crear una nueva area de produccion
const crearArea = async (req, res) => {
    const { nombre } = req.body;
    const nuevaArea = new AreaProduccion({ nombre });
    try {
        const areaGuardada = await nuevaArea.save();
        // REMOVED: console.log('Área guardada:', areaGuardada);
        res.status(201).json(areaGuardada);
    } catch (error) {
        console.error('Error al guardar área:', error);
        res.status(400).json({ message: error.message });
    }
};

// Actualizar un área de producción
const actualizarArea = async (req, res) => {
    try {
        const area = await AreaProduccion.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!area) {
            return res.status(404).json({ message: 'Área no encontrada' });
        }
        res.json(area);
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
};

// Eliminar un área de producción
const eliminarArea = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si el área existe
        const area = await AreaProduccion.findById(id);
        if (!area) {
            return res.status(404).json({ message: 'Área no encontrada' });
        }

        // Verificar si el área tiene registros de producción asociados
        const Produccion = require('../models/Produccion');
        const registrosProduccion = await Produccion.countDocuments({ areaProduccion: id });
        
        if (registrosProduccion > 0) {
            return res.status(409).json({ 
                message: 'No se puede eliminar el área porque tiene registros de producción asociados',
                conflicto: 'integridad_referencial',
                detalles: {
                    entidad: 'area',
                    nombre: area.nombre,
                    registrosAfectados: registrosProduccion,
                    sugerencia: 'Primero elimine o reasigne los registros de producción asociados'
                }
            });
        }

        // Si no hay registros asociados, proceder con la eliminación
        const areaEliminada = await AreaProduccion.findByIdAndDelete(id);
        res.json({ 
            message: 'Área eliminada exitosamente',
            area: areaEliminada
        });
    } catch (error) {
        console.error('Error al eliminar área:', error);
        res.status(500).json({ message: error.message });
    }    
};

// Verificar integridad referencial antes de eliminar
const verificarIntegridadArea = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si el área existe
        const area = await AreaProduccion.findById(id);
        if (!area) {
            return res.status(404).json({ message: 'Área no encontrada' });
        }

        // Verificar integridad referencial
        const verificacion = await verificarIntegridadReferencial(id, 'area', area.nombre);
        
        if (!verificacion.puedeEliminar) {
            // Obtener algunos registros afectados para mostrar detalles
            const registrosAfectados = await obtenerRegistrosAfectados(id, 'area', 5);
            
            return res.status(200).json({
                puedeEliminar: false,
                mensaje: verificacion.mensaje,
                detalles: verificacion.detalles,
                registrosAfectados,
                totalRegistros: verificacion.registrosAfectados
            });
        }

        res.status(200).json({
            puedeEliminar: true,
            mensaje: verificacion.mensaje,
            area: {
                id: area._id,
                nombre: area.nombre
            }
        });

    } catch (error) {
        console.error('Error verificando integridad del área:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    obtenerAreas,
    obtenerArea,
    crearArea,
    actualizarArea,
    eliminarArea,
    verificarIntegridadArea
};

