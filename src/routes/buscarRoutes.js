const express = require("express");
const router = express.Router();
const buscarController = require("../controllers/buscarController");

router.get("/buscar/:coleccion", buscarController.buscarEntidad);

module.exports = router;
