const express = require('express');
const router = express.Router();
const {
    obtenerProcesos,
    obtenerProceso,
    crearProceso,
    actualizarProceso,
    eliminarProceso,
    verificarIntegridadProceso,
    cambiarEstadoProceso
} = require('../controllers/procesosController');

router.get('/', obtenerProcesos);
router.get('/:id', obtenerProceso);
router.post('/', crearProceso);
router.put('/:id', actualizarProceso);
router.get('/:id/verificar-integridad', verificarIntegridadProceso);
router.delete('/:id', eliminarProceso);
router.patch('/:id/estado', cambiarEstadoProceso);

module.exports = router;

