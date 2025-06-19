const express = require('express');
const router = express.Router();
const Jornada = require('../models/Jornada'); // Asegúrate de que Jornada esté importado
const Maquina = require('../models/Maquina'); // Asegúrate de que Maquina esté importado
const AreaProduccion = require('../models/AreaProduccion'); // Asegúrate de que AreaProduccion esté importado
const Proceso = require('../models/Proceso'); // Asegúrate de que Proceso esté importado
const Insumo = require('../models/Insumos'); // Asegúrate de que Insumos esté importado
const Operario = require('../models/Operario'); // Asegúrate de que Operario esté importado
const productionController = require('../controllers/productionController'); // Importar el controlador de producción

// Rutas para obtener listas para los filtros del FilterPanel
router.get('/oti', productionController.getAllOtiParaFiltros);
router.get('/operarios', productionController.getAllOperariosParaFiltros);

// Ruta para buscar producción con filtros dinámicos
router.get('/buscar-produccion', productionController.buscarProduccion); // <--- AÑADIDO: Ruta para buscar producción

// Ruta de debug para verificar datos
router.get('/debug-datos', productionController.debugDatos); // <--- AÑADIDO: Ruta de debug

// Ruta para limpiar inconsistencias de fechas
router.post('/limpiar-inconsistencias', productionController.limpiarInconsistenciasFechas); // <--- NUEVO: Ruta para limpiar inconsistencias


// Rutas para obtener listas
router.get('/maquinas', async (req, res) => {
    try {
        const maquinas = await Maquina.find({});
        res.status(200).json(maquinas);
    } catch (error) {
        console.error("Error al obtener máquinas:", error);
        res.status(500).json({ message: "Error interno del servidor al obtener máquinas." });
    }
});

router.get('/areas', async (req, res) => {
    try {
        const areas = await AreaProduccion.find({});
        res.status(200).json(areas);
    } catch (error) {
        console.error("Error al obtener áreas:", error);
        res.status(500).json({ message: "Error interno del servidor al obtener áreas." });
    }
});

router.get('/procesos', async (req, res) => {
    try {
        const procesos = await Proceso.find({});
        res.status(200).json(procesos);
    } catch (error) {
        console.error("Error al obtener procesos:", error);
        res.status(500).json({ message: "Error interno del servidor al obtener procesos." });
    }
});

router.get('/insumos', async (req, res) => {
    try {
        const insumos = await Insumo.find({});
        res.status(200).json(insumos);
    } catch (error) {
        console.error("Error al obtener insumos:", error);
        res.status(500).json({ message: "Error interno del servidor al obtener insumos." });
    }
});

router.post('/registrar', productionController.registrarProduccion);

// Ruta para actualizar una producción específica
router.put('/actualizar/:id', productionController.actualizarProduccion);

// Ruta para eliminar una producción específica
router.delete('/eliminar/:id', productionController.eliminarProduccion);

// Ruta para obtener jornada por operario y fecha
router.get('/operario/:operarioId/fecha/:fecha', async (req, res) => {
    try {
        const { operarioId, fecha } = req.params;
        const jornada = await Jornada.findOne({ operario: operarioId, fecha });
        if (!jornada) {
            return res.status(404).json({ message: "Jornada no encontrada para este operario en esta fecha." });
        }
        res.status(200).json(jornada);
    } catch (error) {
        console.error("Error al buscar jornada por operario y fecha:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
});

// Ruta para crear una nueva jornada
router.post('/', async (req, res) => {
    try {
        const { operario, fecha } = req.body; 
        if (!operario || !fecha) {
            return res.status(400).json({ message: "Operario y fecha son campos obligatorios." });
        }

        const newJornada = new Jornada({
            operario,
            fecha,
            registros: [] 
        });
        const savedJornada = await newJornada.save();
        res.status(201).json(savedJornada);
    } catch (error) {
        console.error("Error al crear jornada:", error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Error interno del servidor al crear jornada." });
    }
});

// Ruta para obtener una jornada por su ID
router.get('/:id', async (req, res) => {
    try {
        const jornada = await Jornada.findById(req.params.id);
        if (!jornada) {
            return res.status(404).json({ message: "Jornada no encontrada." });
        }
        res.status(200).json(jornada);
    } catch (error) {
        console.error("Error al buscar jornada por ID:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "ID de jornada inválido." });
        }
        res.status(500).json({ message: "Error interno del servidor." });
    }
});

// Ruta para actualizar una jornada (normalmente por ID)
router.put('/:id', async (req, res) => {
    try {
        const { registros } = req.body; 
        const updatedJornada = await Jornada.findByIdAndUpdate(
            req.params.id,
            { $set: { registros: registros } }, 
            { new: true, runValidators: true }
        );
        if (!updatedJornada) {
            return res.status(404).json({ message: "Jornada no encontrada para actualizar." });
        }
        res.status(200).json(updatedJornada);
    } catch (error) {
        console.error("Error al actualizar jornada:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "ID de jornada inválido." });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Error interno del servidor." });
    }
});

// Ruta para actualizar una jornada completa
router.put('/completa/:id', async (req, res) => {
    try {
        const { jornadaData, actividades } = req.body; 
        const updatedJornada = await Jornada.findByIdAndUpdate(
            req.params.id,
            { ...jornadaData, registros: actividades }, 
            { new: true, runValidators: true }
        );
        if (!updatedJornada) {
            return res.status(404).json({ message: "Jornada no encontrada para actualización completa." });
        }
        res.status(200).json(updatedJornada);
    } catch (error) {
        console.error("Error al actualizar jornada completa:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "ID de jornada inválido." });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Error interno del servidor." });
    }
});


router.post('/:jornadaId/actividades', async (req, res) => {
    try {
        const { jornadaId } = req.params;
        const nuevaActividad = req.body; 

        // 1. Encuentra la jornada por su ID
        const jornada = await Jornada.findById(jornadaId);

        if (!jornada) {
            return res.status(404).json({ message: "Jornada no encontrada." });
        }

        // 2. Agrega la nueva actividad al array de registros
        jornada.registros.push(nuevaActividad);

        // 3. Guarda la jornada actualizada
        const updatedJornada = await jornada.save();

        // 4. Responde con la jornada actualizada o solo la actividad añadida si lo prefieres
        res.status(201).json(updatedJornada); 
    } catch (error) {
        console.error("Error al agregar actividad a la jornada:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({ message: "ID de jornada inválido." });
        }
        if (error.name === 'ValidationError') {
             return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: "Error interno del servidor al agregar actividad." });
    }
});


module.exports = router;