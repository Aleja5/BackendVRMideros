const express = require('express');
const router = express.Router();
const {
    obtenerInsumos,
    obtenerInsumo,
    crearInsumo,
    actualizarInsumo,
    eliminarInsumo
} = require('../controllers/insumosController');

router.get('/', obtenerInsumos);
router.get('/:id', obtenerInsumo);
router.post('/', crearInsumo);
router.put('/:id', actualizarInsumo);
router.delete('/:id', eliminarInsumo);

module.exports = router;