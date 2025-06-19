const mongoose = require('mongoose');
const { Schema } = mongoose; // Añade esto si no lo tienes

const produccionSchema = new mongoose.Schema({
    oti: { type: mongoose.Schema.Types.ObjectId, ref: 'Oti', required: true },
    operario: { type: mongoose.Schema.Types.ObjectId, ref: 'Operario', required: true },
    fecha: { type: Date, default: Date.now, required: true },
    procesos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Proceso', required: true }],
    areaProduccion: { type: mongoose.Schema.Types.ObjectId, ref: 'AreaProduccion', required: true },
    maquina: { type: mongoose.Schema.Types.ObjectId, ref: 'Maquina', required: true },
    insumos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Insumo', required: true }],
    jornada: {type:mongoose.Schema.Types.ObjectId, ref: 'JornadaProduccion', required: true},

    tipoTiempo: { type: String, enum: ['Preparación', 'Operación', 'Alimentación'], required: true },
    horaInicio: { type: Date, required: true },
    horaFin: { type: Date, required: true },
    tiempo: {type: Number, required: true},

    observaciones: String,
}, { timestamps: true });

module.exports = mongoose.model('Produccion', produccionSchema,"registroProduccion");

