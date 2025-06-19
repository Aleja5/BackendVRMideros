// models/Operator.js
const mongoose = require('mongoose');

const operarioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  cedula: {
    type: String,
    required: true,
    unique: true, // La cédula debe ser única para evitar duplicados
  }
});

module.exports = mongoose.model('Operario', operarioSchema);