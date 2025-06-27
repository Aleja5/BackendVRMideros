const Insumos = require('../models/Insumos');
const { verificarIntegridadReferencial, obtenerRegistrosAfectados } = require('../utils/integridadReferencial');

// Obtener todos los insumos
const obtenerInsumos = async (req, res) => {
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
        const totalResults = await Insumos.countDocuments(query);
        const insumos = await Insumos.find(query)
            .sort({ nombre: 1 }) 
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({
            insumos,
            totalPages: Math.ceil(totalResults / limit),
            currentPage: Number(page),
            totalResults: totalResults,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Obtener un insumo por ID
const obtenerInsumo = async (req, res) => {
    try {
        const insumo = await Insumos.findById(req.params.id);
        if (!insumo) {
            return res.status(404).json({ message: 'Insumo no encontrado' });
        }
        res.json(insumo);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Crear un nuevo insumo
const crearInsumo = async (req, res) => {
    const { nombre } = req.body;
    const nuevoInsumo = new Insumos({ nombre });
    try {
        const insumoGuardado = await nuevoInsumo.save();
        res.status(201).json(insumoGuardado);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Actualizar un insumo
const actualizarInsumo = async (req, res) => {
    try {
        const insumo = await Insumos.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!insumo) {
            return res.status(404).json({ message: 'Insumo no encontrado' });
        }
        res.json(insumo);
    }
    catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Eliminar un insumo
const eliminarInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si el insumo existe
        const insumo = await Insumos.findById(id);
        if (!insumo) {
            return res.status(404).json({ message: 'Insumo no encontrado' });
        }

        // Verificar si el insumo tiene registros de producción asociados
        const Produccion = require('../models/Produccion');
        const registrosProduccion = await Produccion.countDocuments({ insumos: { $in: [id] } });
        
        if (registrosProduccion > 0) {
            return res.status(409).json({ 
                message: 'No se puede eliminar el insumo porque tiene registros de producción asociados',
                conflicto: 'integridad_referencial',
                detalles: {
                    entidad: 'insumo',
                    nombre: insumo.nombre,
                    registrosAfectados: registrosProduccion,
                    sugerencia: 'Primero elimine o reasigne los registros de producción asociados'
                }
            });
        }

        // Si no hay registros asociados, proceder con la eliminación
        const insumoEliminado = await Insumos.findByIdAndDelete(id);
        res.json({ 
            message: 'Insumo eliminado exitosamente',
            insumo: insumoEliminado
        });
    } catch (error) {
        console.error('Error al eliminar insumo:', error);
        res.status(500).json({ message: error.message });
    }
};

// Verificar integridad referencial antes de eliminar
const verificarIntegridadInsumo = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si el insumo existe
        const insumo = await Insumos.findById(id);
        if (!insumo) {
            return res.status(404).json({ message: 'Insumo no encontrado' });
        }

        // Verificar integridad referencial
        const verificacion = await verificarIntegridadReferencial(id, 'insumo', insumo.nombre);
        
        if (!verificacion.puedeEliminar) {
            // Obtener algunos registros afectados para mostrar detalles
            const registrosAfectados = await obtenerRegistrosAfectados(id, 'insumo', 5);
            
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
            insumo: {
                id: insumo._id,
                nombre: insumo.nombre
            }
        });

    } catch (error) {
        console.error('Error verificando integridad del insumo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    obtenerInsumos,
    obtenerInsumo,
    crearInsumo,
    actualizarInsumo,
    eliminarInsumo,
    verificarIntegridadInsumo
};
