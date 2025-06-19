/**
 * Script para recalcular tiempos efectivos en jornadas existentes
 * Ejecutar este script después de aplicar los cambios al modelo de Jornada
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
const connectDB = require('../db/db');

// Modelos
const Jornada = require('../models/Jornada');
const Produccion = require('../models/Produccion');

async function recalcularTiemposJornadas() {
    try {
        // REMOVED: console.log('🔄 Conectando a la base de datos...');
        await connectDB();
        
        // REMOVED: console.log('📊 Obteniendo todas las jornadas...');
        const jornadas = await Jornada.find({}).populate('registros');
        
        // REMOVED: console.log(`✅ Encontradas ${jornadas.length} jornadas para procesar`);
        
        let jornadasActualizadas = 0;
        let errores = 0;
        
        for (const jornada of jornadas) {
            try {
                // REMOVED: console.log(`⚙️ Procesando jornada ${jornada._id} (${jornada.registros.length} registros)...`);
                
                // Guardar la jornada para activar el pre-save hook
                await jornada.save();
                
                jornadasActualizadas++;
                // REMOVED: console.log(`✅ Jornada ${jornada._id} actualizada`);
                
                // Mostrar información del resultado
                if (jornada.totalTiempoActividades) {
                    const tiempo = jornada.totalTiempoActividades;
                    // REMOVED: console.log(`   📈 Tiempo efectivo: ${tiempo.tiempoEfectivo || 0}min`);
                    // REMOVED: console.log(`   📊 Tiempo sumado: ${tiempo.tiempoSumado || 0}min`);
                    // REMOVED: console.log(`   ⚠️ Solapamientos: ${tiempo.solapamientos ? 'Sí' : 'No'}`);
                    if (tiempo.solapamientos && tiempo.tiempoSumado && tiempo.tiempoEfectivo) {
                        const diferencia = tiempo.tiempoSumado - tiempo.tiempoEfectivo;
                        // REMOVED: console.log(`   🔄 Tiempo solapado: ${diferencia}min`);
                    }
                }
                
            } catch (error) {
                console.error(`❌ Error procesando jornada ${jornada._id}:`, error.message);
                errores++;
            }
        }
        
        // REMOVED: console.log('\n📋 Resumen del proceso:');
        // REMOVED: console.log(`✅ Jornadas actualizadas: ${jornadasActualizadas}`);
        // REMOVED: console.log(`❌ Errores: ${errores}`);
        // REMOVED: console.log(`📊 Total procesadas: ${jornadas.length}`);
        
        // Mostrar estadísticas generales
        // REMOVED: console.log('\n📊 Estadísticas de solapamientos:');
        const jornadasConSolapamientos = await Jornada.find({
            'totalTiempoActividades.solapamientos': true
        });
        
        // REMOVED: console.log(`⚠️ Jornadas con solapamientos: ${jornadasConSolapamientos.length}/${jornadas.length}`);
        
        if (jornadasConSolapamientos.length > 0) {
            let tiempoTotalSolapado = 0;
            for (const jornada of jornadasConSolapamientos) {
                if (jornada.totalTiempoActividades?.tiempoSumado && jornada.totalTiempoActividades?.tiempoEfectivo) {
                    tiempoTotalSolapado += jornada.totalTiempoActividades.tiempoSumado - jornada.totalTiempoActividades.tiempoEfectivo;
                }
            }
            // REMOVED: console.log(`🔄 Tiempo total solapado recuperado: ${tiempoTotalSolapado} minutos (${Math.floor(tiempoTotalSolapado / 60)}h ${tiempoTotalSolapado % 60}m)`);
        }
        
        // REMOVED: console.log('\n🎉 Proceso completado exitosamente');
        
    } catch (error) {
        console.error('❌ Error fatal durante el proceso:', error);
    } finally {
        mongoose.connection.close();
        // REMOVED: console.log('🔌 Conexión a base de datos cerrada');
    }
}

// Ejecutar el script solo si es llamado directamente
if (require.main === module) {
    // REMOVED: console.log('🚀 Iniciando recálculo de tiempos efectivos en jornadas...');
    recalcularTiemposJornadas();
}

module.exports = { recalcularTiemposJornadas };
