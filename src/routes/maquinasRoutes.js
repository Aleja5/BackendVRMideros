const express = require('express');
const router = express.Router();
const {
    obtenerMaquinas,
    obtenerMaquina,
    crearMaquina,
    actualizarMaquina,
    eliminarMaquina
} = require('../controllers/maquinasController');

router.get('/', obtenerMaquinas);
router.get('/:id', obtenerMaquina);
router.post('/', crearMaquina);
router.put('/:id', actualizarMaquina);
router.delete('/:id', eliminarMaquina);

module.exports = router;