const express = require("express");
const router = express.Router();
const crearController = require("../controllers/crearController");

// Rutas de creación
router.post("/crear/:coleccion", crearController.crearEntidad);


module.exports = router;