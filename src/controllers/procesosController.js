const Proceso = require('../models/Proceso');

// Obtener todos los procesos
const obtenerProcesos = async (req, res) => {
    const { page = 1, limit = 100, nombre, search, areaId } = req.query; // Added areaId
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
            { new: true }
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
        const proceso = await Proceso.findByIdAndDelete(req.params.id);
        if (!proceso) {
            return res.status(404).json({ message: 'Proceso no encontrado' });
        }
        res.json({ message: 'Proceso eliminado' });
    } catch (error) {
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
};

