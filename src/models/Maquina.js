const {Schema, model} = require('mongoose');

const maquinaSchema = new Schema({
    nombre: {type: String, required: true, unique:true},
},
{
    timestamps: true
});

module.exports = model('Maquina', maquinaSchema, "maquinas");