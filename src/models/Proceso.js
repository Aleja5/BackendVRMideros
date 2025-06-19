const mongoose = require ('mongoose');

const procesoSchema = new mongoose.Schema({
    nombre: {type: String, required: true, unique:true},
    areas: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AreaProduccion' }] // Array de áreas
}, {timestamps:true});

module.exports = mongoose.model('Proceso', procesoSchema, "procesos");