const express = require('express');
const router = express.Router();
const {
    obtenerProcesos,
    obtenerProceso,
    crearProceso,
    actualizarProceso,
    eliminarProceso,
    verificarIntegridadProceso
} = require('../controllers/procesosController');

router.get('/', obtenerProcesos);
router.get('/:id', obtenerProceso);
router.post('/', crearProceso);
router.put('/:id', actualizarProceso);
router.get('/:id/verificar-integridad', verificarIntegridadProceso);
router.delete('/:id', eliminarProceso);

module.exports = router;

