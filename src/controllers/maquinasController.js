const Maquina = require('../models/Maquina'); 
const { verificarIntegridadReferencial, obtenerRegistrosAfectados } = require('../utils/integridadReferencial');

// Obtener todas las máquinas
const obtenerMaquinas = async (req, res) => {
    const { page =1, limit = 10, nombre, search } = req.query;
    const query = {};

    if (nombre && search) {
        query.$or = [
            { nombre: { $regex: nombre, $options: 'i' } },
            { nombre: { $regex: search, $options: 'i' } }
        ];
    }else if (nombre) {
        query.nombre = { $regex: nombre, $options: 'i' };
    }else if (search) {
        query.nombre = { $regex: search, $options: 'i' };
    }

    try {
        const totalResults = await Maquina.countDocuments(query);
        const maquinas = await Maquina.find(query)
            .sort({ nombre: 1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({
             maquinas,
             totalPages: Math.ceil(totalResults / limit),
             currentPage: Number(page),
             totalResults: totalResults,
    });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener una máquina por ID
const obtenerMaquina = async (req, res) => {
    try {
        const maquina = await Maquina.findById(req.params.id);
        if (!maquina) {
            return res.status(404).json({ message: 'Máquina no encontrada' });
        }
        res.json(maquina);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Crear una nueva máquina
const crearMaquina = async (req, res) => {
    const { nombre } = req.body;
    const nuevaMaquina = new Maquina({ nombre });
    try {
        const maquinaGuardada = await nuevaMaquina.save();        
        res.status(201).json(maquinaGuardada);
    } catch (error) {
        console.error('Error al guardar máquina:', error);
        res.status(400).json({ message: error.message });
    }
};

// Actualizar una máquina
const actualizarMaquina = async (req, res) => {
    try {
        const maquina = await Maquina.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!maquina) {
            return res.status(404).json({ message: 'Máquina no encontrada' });
        }
        res.json(maquina);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Eliminar una máquina
const eliminarMaquina = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si la máquina existe
        const maquina = await Maquina.findById(id);
        if (!maquina) {
            return res.status(404).json({ message: 'Máquina no encontrada' });
        }

        // Verificar si la máquina tiene registros de producción asociados
        const Produccion = require('../models/Produccion');
        const registrosProduccion = await Produccion.countDocuments({ maquina: { $in: [id]} });
        
        if (registrosProduccion > 0) {
            return res.status(409).json({ 
                message: 'No se puede eliminar la máquina porque tiene registros de producción asociados',
                conflicto: 'integridad_referencial',
                detalles: {
                    entidad: 'maquina',
                    nombre: maquina.nombre,
                    registrosAfectados: registrosProduccion,
                    sugerencia: 'Primero elimine o reasigne los registros de producción asociados'
                }
            });
        }

        // Si no hay registros asociados, proceder con la eliminación
        const maquinaEliminada = await Maquina.findByIdAndDelete(id);
        res.json({ 
            message: 'Máquina eliminada exitosamente',
            maquina: maquinaEliminada
        });
    } catch (error) {
        console.error('Error al eliminar máquina:', error);
        res.status(500).json({ message: error.message });
    }
};

// Verificar integridad referencial antes de eliminar
const verificarIntegridadMaquina = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si la máquina existe
        const maquina = await Maquina.findById(id);
        if (!maquina) {
            return res.status(404).json({ message: 'Máquina no encontrada' });
        }

        // Verificar integridad referencial
        const verificacion = await verificarIntegridadReferencial(id, 'maquina', maquina.nombre);
        
        if (!verificacion.puedeEliminar) {
            // Obtener algunos registros afectados para mostrar detalles
            const registrosAfectados = await obtenerRegistrosAfectados(id, 'maquina', 5);
            
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
            maquina: {
                id: maquina._id,
                nombre: maquina.nombre
            }
        });

    } catch (error) {
        console.error('Error verificando integridad de la máquina:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    obtenerMaquinas,
    obtenerMaquina,
    crearMaquina,
    actualizarMaquina,
    eliminarMaquina,
    verificarIntegridadMaquina
};