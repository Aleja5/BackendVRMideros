const express = require('express');
const router = express.Router();
const {
    obtenerMaquinas,
    obtenerMaquina,
    crearMaquina,
    actualizarMaquina,
    eliminarMaquina,
    verificarIntegridadMaquina, 
    cambiarEstadoMaquina
} = require('../controllers/maquinasController');

router.get('/', obtenerMaquinas);
router.get('/:id', obtenerMaquina);
router.post('/', crearMaquina);
router.put('/:id', actualizarMaquina);
router.get('/:id/verificar-integridad', verificarIntegridadMaquina);
router.delete('/:id', eliminarMaquina);
router.patch('/:id/estado', cambiarEstadoMaquina);

module.exports = router;