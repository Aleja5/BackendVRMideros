const express = require('express');
const router = express.Router();
const {
    obtenerAreas,
    obtenerArea,
    crearArea,
    actualizarArea,
    eliminarArea    
} = require('../controllers/areaController');

router.get('/', obtenerAreas);
router.get('/:id', obtenerArea);
router.post('/', crearArea);
router.put('/:id', actualizarArea);
router.delete('/:id', eliminarArea);

module.exports = router;

