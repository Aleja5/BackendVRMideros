const mongoose = require('mongoose');
const { Schema } = mongoose;
const { calcularTiempoEfectivo } = require('../utils/calcularTiempoEfectivo');

const jornadaSchema = new Schema({
    operario: {
        type: Schema.Types.ObjectId,
        ref: 'Operario',
        required: true
    },
    fecha: {
        type: Date,
        required: true
    },
    horaInicio: { // Agregamos horaInicio
        type: Date
    },
    horaFin: { // Agregamos horaFin
        type: Date
    },
    totalTiempoActividades: {
        type: Object,
        default: { horas: 0, minutos: 0 }
    },
    estado: {
        type: String,
        enum: ['en_progreso', 'completa'],
        default: 'en_progreso'
    },
    registros: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Produccion'
        }
    ]
}, { timestamps: true });

jornadaSchema.pre('save', async function (next) {
    try {
        // REMOVED: console.log('🔄 Ejecutando pre-save hook de Jornada:', this._id);
        
        if (this.registros && this.registros.length > 0) {
            const Produccion = mongoose.model('Produccion');
            const registros = await Produccion.find({ _id: { $in: this.registros } });            // REMOVED: console.log('📋 Registros encontrados en jornada:', registros.length);

            // Si no hay registros asociados, buscar por operario y fecha
            if (registros.length === 0 && this.operario && this.fecha) {
                // REMOVED: console.log('🔍 No hay registros en la jornada, buscando por operario y fecha');
                const registrosPorFecha = await Produccion.find({
                    operario: this.operario,
                    fecha: this.fecha
                });
                
                // REMOVED: console.log('📋 Producciones encontradas por fecha:', registrosPorFecha.length);
                
                if (registrosPorFecha.length > 0) {
                    // Actualizar los registros de la jornada
                    this.registros = registrosPorFecha.map(r => r._id);
                    registros.push(...registrosPorFecha);
                }
            }

            // Usar la función avanzada para calcular tiempo efectivo
            const calculoTiempo = calcularTiempoEfectivo(registros);

            // REMOVED: console.log('📊 Resultado del cálculo de tiempo:', calculoTiempo);

            // Asignar horas de inicio y fin
            this.horaInicio = calculoTiempo.horaInicio;
            this.horaFin = calculoTiempo.horaFin;

            // Calcular tiempo efectivo en horas y minutos
            const tiempoEfectivoMinutos = calculoTiempo.tiempoEfectivoMinutos;

            // Guardar información completa del tiempo
            this.totalTiempoActividades = {
                horas: Math.floor(tiempoEfectivoMinutos / 60),
                minutos: tiempoEfectivoMinutos % 60,
                tiempoEfectivo: tiempoEfectivoMinutos, // Tiempo real sin solapamientos
                tiempoRango: calculoTiempo.tiempoRangoMinutos, // Tiempo desde primera a última hora
                tiempoSumado: calculoTiempo.tiempoSumadoMinutos, // Suma individual de actividades
                solapamientos: calculoTiempo.solapamientos, // Si hay actividades solapadas
                estadisticas: calculoTiempo.estadisticas // Información adicional
            };

            // REMOVED: console.log(`📊 Jornada ${this._id}: Tiempo efectivo ${tiempoEfectivoMinutos}min (${Math.floor(tiempoEfectivoMinutos / 60)}h ${tiempoEfectivoMinutos % 60}m), Tiempo sumado ${calculoTiempo.tiempoSumadoMinutos}min, Solapamientos: ${calculoTiempo.solapamientos}`);

        } else {
            // REMOVED: console.log('⚠️ Jornada sin registros, inicializando en cero');
            this.totalTiempoActividades = { 
                horas: 0, 
                minutos: 0,
                tiempoEfectivo: 0,
                tiempoRango: 0,
                tiempoSumado: 0,
                solapamientos: false,
                estadisticas: {
                    totalActividades: 0,
                    actividadesConHorario: 0,
                    intervalosUnificados: 0,
                    diferenciaSolapamiento: 0
                }
            };
            this.horaInicio = null;
            this.horaFin = null;
        }

        next();
    } catch (error) {
        console.error('❌ Error en pre-save de Jornada:', error);
        next(error);
    }
});

const Jornada = mongoose.model("Jornada", jornadaSchema);
module.exports = Jornada;