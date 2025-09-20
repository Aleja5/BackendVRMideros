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

// Middleware para validar un solo proceso "Horario Laboral" por operario por día
produccionSchema.pre('save', async function(next) {
    // Solo validar si existen procesos
    if (this.procesos && this.procesos.length > 0) {
        try {
            // Obtener referencia al modelo Proceso de forma segura
            const mongoose = require('mongoose');
            
            // Verificar si el modelo ya existe antes de intentar usarlo
            let Proceso;
            try {
                Proceso = mongoose.models.Proceso || mongoose.model('Proceso');
            } catch (modelError) {
                console.log('⚠️ No se pudo acceder al modelo Proceso, saltando validación');
                return next();
            }
            
            // Buscar si alguno de los procesos es exactamente "Horario Laboral"
            const procesosHorarioLaboral = await Proceso.find({
                _id: { $in: this.procesos },
                nombre: "Horario Laboral" // Búsqueda exacta, case-sensitive
            });

            // Obtener todos los procesos para logging detallado
            const todosLosProcesos = await Proceso.find({
                _id: { $in: this.procesos }
            });

            console.log(`🔍 Verificando procesos para horario laboral:`, {
                procesosIds: this.procesos,
                todosLosProcesosNombres: todosLosProcesos.map(p => ({ id: p._id, nombre: p.nombre })),
                procesosHorarioEncontrados: procesosHorarioLaboral.length,
                nombresHorarioEncontrados: procesosHorarioLaboral.map(p => p.nombre)
            });

            if (procesosHorarioLaboral.length > 0) {
                const fechaInicio = new Date(this.fecha);
                fechaInicio.setHours(0, 0, 0, 0);
                const fechaFin = new Date(this.fecha);
                fechaFin.setHours(23, 59, 59, 999);

                // Buscar registros existentes con proceso "Horario Laboral" en la misma fecha
                const queryBusqueda = {
                    operario: this.operario,
                    procesos: { $in: procesosHorarioLaboral.map(p => p._id) },
                    fecha: {
                        $gte: fechaInicio,
                        $lte: fechaFin
                    },
                    _id: { $ne: this._id } // Excluir el documento actual en caso de actualización
                };

                console.log(`🔍 Query de búsqueda:`, queryBusqueda);

                const existingHorario = await this.constructor.findOne(queryBusqueda);

                // Si se encuentra un registro, obtener más detalles
                if (existingHorario) {
                    const registroDetalle = await this.constructor.findById(existingHorario._id).populate('procesos');
                    console.log(`❗ Registro conflictivo encontrado:`, {
                        id: registroDetalle._id,
                        fecha: registroDetalle.fecha,
                        procesosNombres: registroDetalle.procesos?.map(p => p.nombre) || [],
                        tipoTiempo: registroDetalle.tipoTiempo
                    });
                }

                console.log(`🔍 Resultado de búsqueda:`, {
                    existeHorario: !!existingHorario,
                    operario: this.operario,
                    fecha: this.fecha,
                    fechaBusqueda: { desde: fechaInicio, hasta: fechaFin },
                    procesosHorarioBuscados: procesosHorarioLaboral.map(p => ({ id: p._id, nombre: p.nombre }))
                });

                if (existingHorario) {
                    const error = new Error('Ya existe un registro con el proceso "Horario Laboral" para este operario en esta fecha');
                    error.code = 'HORARIO_DUPLICADO';
                    return next(error);
                }
            }
        } catch (err) {
            console.error('❌ Error en validación de horario laboral:', err);
            return next(err);
        }
    }
    next();
});

module.exports = mongoose.model('Produccion', produccionSchema,"registroProduccion");

