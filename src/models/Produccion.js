const mongoose = require('mongoose');
const { Schema } = mongoose; // Añade esto si no lo tienes

const produccionSchema = new mongoose.Schema({
    oti: { type: mongoose.Schema.Types.ObjectId, ref: 'Oti', required: true },
    operario: { type: mongoose.Schema.Types.ObjectId, ref: 'Operario', required: true },
    fecha: { type: Date, default: Date.now, required: true },
    procesos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proceso', required: true }],
    areaProduccion: { type: mongoose.Schema.Types.ObjectId, ref: 'AreaProduccion', required: true },
    maquina: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Maquina', required: true }],
    insumos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Insumo', required: true }],
    jornada: {type:mongoose.Schema.Types.ObjectId, ref: 'JornadaProduccion', required: true},

    tipoTiempo: { type: String, enum: ['Preparación', 'Operación', 'Alimentación', 'Capacitación','Permiso Laboral'], required: true },
    tipoPermiso: { 
        type: String, 
        enum: ['permiso de salud', 'permiso personal', 'licencia no remunerada', 'licencia remunerada', 'banco de tiempo'],
        validate: {
            validator: function(value) {
                if (this.tipoTiempo === 'Permiso Laboral') {
                    return value && value.trim().length > 0;
                }
                return true; // No es requerido si no es "Permiso Laboral"
            },
            message: 'tipoPermiso es requerido cuando tipoTiempo es "Permiso Laboral"'
        }
    },
    horaInicio: { type: Date, required: true },
    horaFin: { type: Date, required: true },
    tiempo: {type: Number, required: true},

    observaciones: String,
}, { timestamps: true });

module.exports = mongoose.model('Produccion', produccionSchema,"registroProduccion");

