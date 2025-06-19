const Maquina = require('../models/Maquina'); 

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
        // REMOVED: console.log('Máquina guardada:', maquinaGuardada);
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
        const maquina = await Maquina.findByIdAndDelete(req.params.id);
        if (!maquina) {
            return res.status(404).json({ message: 'Máquina no encontrada' });
        }
        res.json({ message: 'Máquina eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    obtenerMaquinas,
    obtenerMaquina,
    crearMaquina,
    actualizarMaquina,
    eliminarMaquina
};