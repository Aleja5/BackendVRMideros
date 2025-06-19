// Script para investigar solapamientos específicos en jornadas
// Ejecutar desde la raíz del proyecto backend: node investigar-solapamientos.js

const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const Jornada = require('./src/models/Jornada');
const Produccion = require('./src/models/Produccion');
const Operario = require('./src/models/Operario');
const Oti = require('./src/models/Oti');
const Proceso = require('./src/models/Proceso');
const AreaProduccion = require('./src/models/AreaProduccion');
const Maquina = require('./src/models/Maquina');
const Insumo = require('./src/models/Insumo');

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function investigarSolapamientos() {
    try {
        console.log('🔍 INVESTIGACIÓN DE SOLAPAMIENTOS');
        console.log('='.repeat(60));

        // 1. Buscar jornadas con solapamientos
        const jornadasConSolapamientos = await Jornada.find({
            'totalTiempoActividades.solapamientos': true
        })
        .populate('operario', 'name cedula')
        .populate({
            path: 'registros',
            populate: [
                { path: 'oti', select: 'numeroOti' },
                { path: 'procesos', select: 'nombre' }
            ]
        })
        .sort({ fecha: -1 });

        console.log(`📊 Jornadas con solapamientos encontradas: ${jornadasConSolapamientos.length}`);

        if (jornadasConSolapamientos.length === 0) {
            console.log('✅ No se encontraron jornadas con solapamientos');
            return;
        }

        console.log('\n📋 ANÁLISIS DETALLADO:');
        console.log('='.repeat(60));

        let tiempoTotalPerdido = 0;
        let operariosAfectados = new Set();

        for (const jornada of jornadasConSolapamientos) {
            const operario = jornada.operario?.name || 'Sin nombre';
            const fecha = jornada.fecha.toLocaleDateString();
            const tiempoSumado = jornada.totalTiempoActividades?.tiempoSumado || 0;
            const tiempoEfectivo = jornada.totalTiempoActividades?.tiempoEfectivo || 0;
            const diferencia = tiempoSumado - tiempoEfectivo;

            operariosAfectados.add(operario);
            tiempoTotalPerdido += diferencia;

            console.log(`\n👤 ${operario} - ${fecha}`);
            console.log(`   📝 Actividades: ${jornada.registros?.length || 0}`);
            console.log(`   ⏱️ Tiempo sumado: ${tiempoSumado} min (${Math.floor(tiempoSumado/60)}h ${tiempoSumado%60}m)`);
            console.log(`   ✅ Tiempo efectivo: ${tiempoEfectivo} min (${Math.floor(tiempoEfectivo/60)}h ${tiempoEfectivo%60}m)`);
            console.log(`   ⚠️ Tiempo solapado: ${diferencia} min`);

            // Analizar actividades específicas
            if (jornada.registros && jornada.registros.length > 1) {
                console.log('   📋 Detalle de actividades:');
                
                // Ordenar por hora de inicio
                const actividadesOrdenadas = [...jornada.registros]
                    .filter(r => r.horaInicio && r.horaFin)
                    .sort((a, b) => new Date(a.horaInicio) - new Date(b.horaInicio));

                actividadesOrdenadas.forEach((actividad, index) => {
                    const inicio = new Date(actividad.horaInicio).toLocaleTimeString();
                    const fin = new Date(actividad.horaFin).toLocaleTimeString();
                    const oti = actividad.oti?.numeroOti || 'Sin OTI';
                    const procesos = actividad.procesos?.map(p => p.nombre).join(', ') || 'Sin proceso';
                    
                    console.log(`      ${index + 1}. ${inicio} - ${fin} | ${actividad.tiempo}min | OTI: ${oti} | ${procesos}`);
                    
                    // Detectar solapamientos con la siguiente actividad
                    if (index < actividadesOrdenadas.length - 1) {
                        const siguienteActividad = actividadesOrdenadas[index + 1];
                        const finActual = new Date(actividad.horaFin);
                        const inicioSiguiente = new Date(siguienteActividad.horaInicio);
                        
                        if (inicioSiguiente < finActual) {
                            const solapamientoMin = Math.round((finActual - inicioSiguiente) / (1000 * 60));
                            console.log(`         🔄 SOLAPAMIENTO: ${solapamientoMin} min con la siguiente actividad`);
                        }
                    }
                });
            }
        }

        // 2. Resumen estadístico
        console.log('\n📊 RESUMEN ESTADÍSTICO:');
        console.log('='.repeat(60));
        console.log(`👥 Operarios afectados: ${operariosAfectados.size}`);
        console.log(`📅 Jornadas con solapamientos: ${jornadasConSolapamientos.length}`);
        console.log(`⏰ Tiempo total "perdido": ${tiempoTotalPerdido} min (${Math.floor(tiempoTotalPerdido/60)}h ${tiempoTotalPerdido%60}m)`);
        console.log(`📈 Promedio por jornada: ${Math.round(tiempoTotalPerdido/jornadasConSolapamientos.length)} min`);

        // 3. Análisis por operario
        console.log('\n👥 ANÁLISIS POR OPERARIO:');
        console.log('='.repeat(60));
        
        const estadisticasPorOperario = {};
        
        for (const jornada of jornadasConSolapamientos) {
            const operario = jornada.operario?.name || 'Sin nombre';
            if (!estadisticasPorOperario[operario]) {
                estadisticasPorOperario[operario] = {
                    jornadas: 0,
                    tiempoTotal: 0,
                    fechas: []
                };
            }
            
            estadisticasPorOperario[operario].jornadas++;
            estadisticasPorOperario[operario].tiempoTotal += 
                (jornada.totalTiempoActividades?.tiempoSumado || 0) - 
                (jornada.totalTiempoActividades?.tiempoEfectivo || 0);
            estadisticasPorOperario[operario].fechas.push(jornada.fecha.toLocaleDateString());
        }

        Object.entries(estadisticasPorOperario)
            .sort(([,a], [,b]) => b.tiempoTotal - a.tiempoTotal)
            .forEach(([operario, stats]) => {
                console.log(`\n👤 ${operario}:`);
                console.log(`   📅 Jornadas afectadas: ${stats.jornadas}`);
                console.log(`   ⏰ Tiempo solapado total: ${stats.tiempoTotal} min`);
                console.log(`   📈 Promedio por jornada: ${Math.round(stats.tiempoTotal/stats.jornadas)} min`);
                console.log(`   📋 Fechas: ${stats.fechas.slice(0, 5).join(', ')}${stats.fechas.length > 5 ? '...' : ''}`);
            });

        // 4. Recomendaciones
        console.log('\n💡 RECOMENDACIONES:');
        console.log('='.repeat(60));
        
        if (tiempoTotalPerdido > 0) {
            console.log('⚠️ SE DETECTARON SOLAPAMIENTOS:');
            console.log('   1. Revisar con los operarios afectados si los horarios son correctos');
            console.log('   2. Verificar si las actividades realmente se ejecutaron en paralelo');
            console.log('   3. Considerar capacitación sobre registro correcto de horarios');
            console.log('   4. Evaluar implementar validaciones en tiempo real');
        }

        if (operariosAfectados.size > 0) {
            console.log('\n🎯 ACCIONES ESPECÍFICAS:');
            Array.from(operariosAfectados).forEach(operario => {
                console.log(`   • Revisar registros de ${operario} en las fechas indicadas`);
            });
        }

        // 5. Jornadas más recientes con solapamientos
        console.log('\n📅 JORNADAS RECIENTES CON SOLAPAMIENTOS (últimas 5):');
        console.log('='.repeat(60));
        
        jornadasConSolapamientos.slice(0, 5).forEach((jornada, index) => {
            const operario = jornada.operario?.name || 'Sin nombre';
            const fecha = jornada.fecha.toLocaleDateString();
            const diferencia = (jornada.totalTiempoActividades?.tiempoSumado || 0) - 
                              (jornada.totalTiempoActividades?.tiempoEfectivo || 0);
            
            console.log(`${index + 1}. ${operario} - ${fecha} (${diferencia} min de solapamiento)`);
        });

    } catch (error) {
        console.error('❌ Error durante la investigación:', error);
    } finally {
        mongoose.connection.close();
        console.log('\n✅ Investigación completada');
    }
}

// Ejecutar solo si el script se ejecuta directamente
if (require.main === module) {
    investigarSolapamientos();
}

module.exports = investigarSolapamientos;
