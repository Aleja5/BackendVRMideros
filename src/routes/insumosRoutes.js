const express = require('express');
const router = express.Router();
const {
    obtenerInsumos,
    obtenerInsumo,
    crearInsumo,
    actualizarInsumo,
    eliminarInsumo,
    verificarIntegridadInsumo,
    cambiarEstadoInsumo
} = require('../controllers/insumosController');

router.get('/', obtenerInsumos);
router.get('/:id', obtenerInsumo);
router.post('/', crearInsumo);
router.put('/:id', actualizarInsumo);
router.get('/:id/verificar-integridad', verificarIntegridadInsumo);
router.delete('/:id', eliminarInsumo);
router.patch('/:id/estado', cambiarEstadoInsumo);

module.exports = router;