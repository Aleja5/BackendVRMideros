const AreaProduccion = require('../models/AreaProduccion');

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
        const area = await AreaProduccion.findByIdAndDelete(req.params.id);
        if (!area) {
            return res.status(404).json({ message: 'Área no encontrada' });
        }
        res.json({ message: 'Área eliminada' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }    
};

module.exports = {
    obtenerAreas,
    obtenerArea,
    crearArea,
    actualizarArea,
    eliminarArea
};

