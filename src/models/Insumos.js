const {Schema, model} = require('mongoose');

const insumosSchema = new Schema({
    nombre: {type: String, required: true, unique:true},
    estado: {
        type: String,
        enum: ['activo', 'inactivo'],
        default: 'activo',
        required: true
  }    
},
{
    timestamps: true
});

module.exports = model('Insumo', insumosSchema, "insumos");