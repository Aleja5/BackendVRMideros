const express = require('express');
const router = express.Router();
const {
    obtenerAreas,
    obtenerArea,
    crearArea,
    actualizarArea,
    eliminarArea,
    verificarIntegridadArea
} = require('../controllers/areaController');

router.get('/', obtenerAreas);
router.get('/:id', obtenerArea);
router.post('/', crearArea);
router.put('/:id', actualizarArea);
router.get('/:id/verificar-integridad', verificarIntegridadArea);
router.delete('/:id', eliminarArea);

module.exports = router;

