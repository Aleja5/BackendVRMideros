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

    tipoTiempo: { type: String, enum: ['Preparación', 'Operación', 'Alimentación', 'Capacitación', 'Permiso Laboral', 'Horario Laboral'], 
        required: true },
    tipoPermiso: { 
        type: String, 
        enum: ['permiso remunerado', 'permiso NO remunerado'],
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

// Middleware para validar un solo horario laboral por operario por día
produccionSchema.pre('save', async function(next) {
    if (this.tipoTiempo === 'Horario Laboral') {
        const fechaInicio = new Date(this.fecha);
        fechaInicio.setHours(0, 0, 0, 0);
        const fechaFin = new Date(this.fecha);
        fechaFin.setHours(23, 59, 59, 999);

        const existingHorario = await this.constructor.findOne({
            operario: this.operario,
            tipoTiempo: 'Horario Laboral',
            fecha: {
                $gte: fechaInicio,
                $lte: fechaFin
            },
            _id: { $ne: this._id } // Excluir el documento actual en caso de actualización
        });

        if (existingHorario) {
            const error = new Error('Ya existe un registro de Horario Laboral para este operario en esta fecha');
            error.code = 'HORARIO_DUPLICADO';
            return next(error);
        }
    }
    next();
});

module.exports = mongoose.model('Produccion', produccionSchema,"registroProduccion");

