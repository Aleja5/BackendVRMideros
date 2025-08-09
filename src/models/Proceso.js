const mongoose = require ('mongoose');

const procesoSchema = new mongoose.Schema({
    nombre: {type: String, required: true, unique:true},
    areas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AreaProduccion' }],
    estado: {
        type: String,
        enum: ['activo', 'inactivo'],
        default: 'activo',
        required: true
  }}, {timestamps:true});

module.exports = mongoose.model('Proceso', procesoSchema, "procesos");