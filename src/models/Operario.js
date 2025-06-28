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
  },
  estado: {
    type: String,
    enum: ['activo', 'inactivo'],
    default: 'activo',
    required: true
  }
});

module.exports = mongoose.model('Operario', operarioSchema);