const Insumos = require('../models/Insumos');

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
        const insumo = await Insumos.findByIdAndDelete(req.params.id);
        if (!insumo) {
            return res.status(404).json({ message: 'Insumo no encontrado' });
        }
        res.json({ message: 'Insumo eliminado' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    obtenerInsumos,
    obtenerInsumo,
    crearInsumo,
    actualizarInsumo,
    eliminarInsumo
};
