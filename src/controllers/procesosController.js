const Proceso = require('../models/Proceso');
const { verificarIntegridadReferencial, obtenerRegistrosAfectados } = require('../utils/integridadReferencial');

// Obtener todos los procesos
const obtenerProcesos = async (req, res) => {
    const { page = 1, limit = 100, nombre, search, areaId, estado = 'activo' } = req.query; // Added areaId
    const query = {};

    if (estado !== 'todos') {
        query.estado = estado;
    }
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

    if (areaId) { // Filter by areaId if provided - buscar en el array areas
        query.areas = { $in: [areaId] }; // Buscar procesos que contengan el areaId en su array areas
    }

    try {
        const totalResults = await Proceso.countDocuments(query);
        const procesos = await Proceso.find(query)
            .populate('areas') // Cambiar areaId por areas para popular todas las áreas
            .sort({ nombre: 1 }) // Default sort by nombre ascending (A-Z)
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({
            procesos,
            totalPages: Math.ceil(totalResults / limit),
            currentPage: Number(page),
            totalResults: totalResults,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener un proceso por ID
const obtenerProceso = async (req, res) => {
    try {
        const proceso = await Proceso.findById(req.params.id);
        if (!proceso) {
            return res.status(404).json({ message: 'Proceso no encontrado' });
        }
        res.json(proceso);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Crear un nuevo proceso
const crearProceso = async (req, res) => {
    const { nombre, areas } = req.body; // Cambiar areaId por areas (array)
    
    // Validar que areas sea un array si se proporciona
    if (areas && !Array.isArray(areas)) {
        return res.status(400).json({ message: 'El campo areas debe ser un array de IDs.' });
    }
    
    const nuevoProceso = new Proceso({ 
        nombre, 
        areas: areas || [] // Si no se proporcionan áreas, usar array vacío
    });
      try {
        const procesoGuardado = await nuevoProceso.save();
        // Poplar las áreas antes de enviar la respuesta
        const procesoConAreas = await Proceso.findById(procesoGuardado._id).populate('areas');
        // REMOVED: console.log('Proceso guardado:', procesoConAreas);
        res.status(201).json(procesoConAreas);
    } catch (error) {
        console.error('Error al guardar proceso:', error);
        res.status(400).json({ message: error.message });
    }
};

// Actualizar un proceso
const actualizarProceso = async (req, res) => {
    try {
        const { areas } = req.body;
        
        // Validar que areas sea un array si se proporciona
        if (areas && !Array.isArray(areas)) {
            return res.status(400).json({ message: 'El campo areas debe ser un array de IDs.' });
        }
        
        const proceso = await Proceso.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        ).populate('areas'); // Popular las áreas en la respuesta
        
        if (!proceso) {
            return res.status(404).json({ message: 'Proceso no encontrado' });
        }
        res.json(proceso);
        } catch (error) {
        res.status(500).json({ message: error.message });
        }
    };

// Eliminar un proceso
const eliminarProceso = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si el proceso existe
        const Proceso = require('../models/Proceso');
        const proceso = await Proceso.findById(id);
        if (!proceso) {
            return res.status(404).json({ message: 'Proceso no encontrado' });
        }

        // Verificar si el proceso tiene registros de producción asociados
        const Produccion = require('../models/Produccion');
        const registrosProduccion = await Produccion.countDocuments({ procesos: { $in: [id] } });
        
        if (registrosProduccion > 0) {
            return res.status(409).json({ 
                message: 'No se puede eliminar el proceso porque tiene registros de producción asociados',
                conflicto: 'integridad_referencial',
                detalles: {
                    entidad: 'proceso',
                    nombre: proceso.nombre,
                    registrosAfectados: registrosProduccion,
                    sugerencia: 'Primero elimine o reasigne los registros de producción asociados'
                }
            });
        }

        // Si no hay registros asociados, proceder con la eliminación
        const procesoEliminado = await Proceso.findByIdAndDelete(id);
        res.json({ 
            message: 'Proceso eliminado exitosamente',
            proceso: procesoEliminado
        });
    } catch (error) {
        console.error('Error al eliminar proceso:', error);
        res.status(500).json({ message: error.message });
    }
};

// Verificar integridad referencial antes de eliminar
const verificarIntegridadProceso = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si el proceso existe
        const proceso = await Proceso.findById(id);
        if (!proceso) {
            return res.status(404).json({ message: 'Proceso no encontrado' });
        }

        // Verificar integridad referencial
        const verificacion = await verificarIntegridadReferencial(id, 'proceso', proceso.nombre);
        
        if (!verificacion.puedeEliminar) {
            // Obtener algunos registros afectados para mostrar detalles
            const registrosAfectados = await obtenerRegistrosAfectados(id, 'proceso', 5);
            
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
            proceso: {
                id: proceso._id,
                nombre: proceso.nombre
            }
        });

    } catch (error) {
        console.error('Error verificando integridad del proceso:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};
    // Cambiar estado de un proceso (activo/inactivo)
const cambiarEstadoProceso = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        // Validar que el estado sea válido
        if (!['activo', 'inactivo'].includes(estado)) {
            return res.status(400).json({ 
                message: 'Estado inválido. Debe ser "activo" o "inactivo"' 
            });
        }

        const procesoActualizado = await Proceso.findByIdAndUpdate(
            id,
            { estado },
            { new: true, runValidators: true }
        ).populate('areas'); // Popular las áreas para mostrar la información completa

        if (!procesoActualizado) {
            return res.status(404).json({ message: 'Proceso no encontrado' });
        }

        res.json({
            message: `Proceso marcado como ${estado} exitosamente`,
            proceso: procesoActualizado
        });
    } catch (error) {
        console.error('Error al cambiar estado del proceso:', error);
        res.status(500).json({ message: error.message });
    }
};

// Exportar las funciones
module.exports = {
    obtenerProcesos,
    obtenerProceso,
    crearProceso,
    actualizarProceso,
    eliminarProceso,
    verificarIntegridadProceso,
    cambiarEstadoProceso
};

