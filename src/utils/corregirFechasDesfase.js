/**
 * Script para corregir fechas con desfase de zona horaria en la base de datos
 * Este script identifica y corrige registros que fueron guardados con UTC en lugar de hora local
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
const connectDB = require('../db/db');

// Modelos
const Produccion = require('../models/Produccion');
const Jornada = require('../models/Jornada');
const Operario = require('../models/Operario');

async function corregirFechasConDesfase() {
    try {
        // REMOVED: console.log('🔄 Conectando a la base de datos...');
        await connectDB();
          // REMOVED: console.log('📊 Analizando TODOS los registros con posible desfase de zona horaria...');
        
        // Buscar TODOS los registros que tengan fechas en UTC (terminan en .000Z y hora 00:00:00)
        // Estos son candidatos a tener desfase de zona horaria
        const registrosProblematicos = await Produccion.find({
            $expr: {
                $and: [
                    // La fecha termina en medianoche UTC (00:00:00.000Z)
                    { $eq: [{ $hour: "$fecha" }, 0] },
                    { $eq: [{ $minute: "$fecha" }, 0] },
                    { $eq: [{ $second: "$fecha" }, 0] },
                    { $eq: [{ $millisecond: "$fecha" }, 0] }
                ]
            }
        }).populate('operario', 'name');
        
        // REMOVED: console.log(`❓ Encontrados ${registrosProblematicos.length} registros que podrían tener desfase de zona horaria`);
        
        if (registrosProblematicos.length === 0) {
            // REMOVED: console.log('✅ No hay registros para corregir');
            return;
        }
          // Mostrar algunos ejemplos
        // REMOVED: console.log('\n📋 Primeros 10 registros encontrados:');
        registrosProblematicos.slice(0, 10).forEach((registro, idx) => {
            // REMOVED: console.log(`${idx + 1}. Operario: ${registro.operario?.name}, Fecha: ${registro.fecha}, OTI: ${registro.oti}`);
        });
        
        // Preguntar si queremos corregir (en un entorno real, esto sería un parámetro)
        // REMOVED: console.log('\n🔧 Procediendo a corregir fechas...');
        
        let corregidos = 0;
        let errores = 0;
        
        // Agrupar registros por fecha original para mostrar el progreso
        const registrosPorFecha = {};
        registrosProblematicos.forEach(registro => {
            const fechaStr = registro.fecha.toISOString().split('T')[0];
            if (!registrosPorFecha[fechaStr]) {
                registrosPorFecha[fechaStr] = 0;
            }
            registrosPorFecha[fechaStr]++;
        });
        
        // REMOVED: console.log('\n📅 Fechas a corregir:');
        Object.entries(registrosPorFecha).forEach(([fecha, cantidad]) => {
            // REMOVED: console.log(`  ${fecha}: ${cantidad} registros`);
        });
        
        for (const registro of registrosProblematicos) {
            try {
                // Verificar si la fecha parece ser de zona horaria UTC cuando debería ser local
                const fechaOriginal = new Date(registro.fecha);
                
                // Si la fecha está en UTC (00:00:00.000Z), restarle 5 horas (zona horaria de Colombia UTC-5)
                // para obtener la fecha local correcta
                const fechaCorregida = new Date(fechaOriginal.getTime() - (5 * 60 * 60 * 1000));
                
                // Crear la fecha local correcta (sin zona horaria)
                const year = fechaCorregida.getUTCFullYear();
                const month = fechaCorregida.getUTCMonth();
                const day = fechaCorregida.getUTCDate();
                const fechaLocal = new Date(year, month, day, 0, 0, 0, 0);
                
                await Produccion.findByIdAndUpdate(registro._id, {
                    fecha: fechaLocal
                });
                
                corregidos++;
                if (corregidos <= 10 || corregidos % 50 === 0) {
                    // REMOVED: console.log(`✅ Corregido registro ${registro._id}: ${fechaOriginal.toISOString()} → ${fechaLocal.toISOString()}`);
                }                
            } catch (error) {
                console.error(`❌ Error corrigiendo registro ${registro._id}:`, error.message);
                errores++;
            }
        }
        
        // REMOVED: console.log('\n📋 Resumen de corrección:');
        // REMOVED: console.log(`✅ Registros corregidos: ${corregidos}`);
        // REMOVED: console.log(`❌ Errores: ${errores}`);
        // REMOVED: console.log(`📊 Total procesados: ${registrosProblematicos.length}`);
        
        // También necesitamos actualizar TODAS las jornadas para que recalculen sus fechas
        // REMOVED: console.log('\n🔄 Actualizando todas las jornadas afectadas...');
        const todasLasJornadas = await Jornada.find({});
        
        for (const jornada of todasLasJornadas) {
            await jornada.save(); // Esto activará el pre-save hook para recalcular
            // REMOVED: console.log(`🔄 Jornada ${jornada._id} actualizada`);
        }
        
        // REMOVED: console.log('\n🎉 Corrección completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error fatal durante la corrección:', error);
    } finally {
        mongoose.connection.close();
        // REMOVED: console.log('🔌 Conexión a base de datos cerrada');
    }
}

// Ejecutar el script solo si es llamado directamente
if (require.main === module) {
    // REMOVED: console.log('🚀 Iniciando corrección de fechas con desfase de zona horaria...');
    corregirFechasConDesfase();
}

module.exports = { corregirFechasConDesfase };
