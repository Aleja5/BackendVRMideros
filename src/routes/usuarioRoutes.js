const express = require ('express');
const router = express.Router();
const {
    obtenerUsuarios,
    obtenerUsuario,
    Registrar,
    actualizarUsuario,
    eliminarUsuario
} = require ('../controllers/usuarioController');

router.get('/', obtenerUsuarios);
router.get('/:id', obtenerUsuario);
router.post('/', Registrar);
router.put('/:id', actualizarUsuario);
router.delete('/:id', eliminarUsuario);

module.exports = router;
