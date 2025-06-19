const express = require('express');
const router = express.Router();
const {
    obtenerProcesos,
    obtenerProceso,
    crearProceso,
    actualizarProceso,
    eliminarProceso 
} = require('../controllers/procesosController');

router.get('/', obtenerProcesos);
router.get('/:id', obtenerProceso);
router.post('/', crearProceso);
router.put('/:id', actualizarProceso);
router.delete('/:id', eliminarProceso);

module.exports = router;

