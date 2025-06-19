/**
 * Script para corrección masiva de inconsistencias de fechas
 * Este script corrige automáticamente todos los registros que tienen desfase de fechas
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
const connectDB = require('../db/db');

// Modelos
const Produccion = require('../models/Produccion');
const Jornada = require('../models/Jornada');
const Operario = require('../models/Operario');
const Oti = require('../models/Oti');

async function correccionMasivaFechas() {
    try {
        // REMOVED: console.log('🔄 Conectando a la base de datos...');
        await connectDB();
        
        // REMOVED: console.log('🚀 Iniciando corrección masiva de inconsistencias de fechas...');
        
        // Obtener TODOS los registros de producción
        const todosLosRegistros = await Produccion.find({})
            .populate('operario', 'name')
            .sort({ fecha: 1, horaInicio: 1 });
            
        // REMOVED: console.log(`📊 Analizando ${todosLosRegistros.length} registros...`);
        
        const registrosACorregir = [];
        const estadisticas = {
            total: todosLosRegistros.length,
            inconsistentes: 0,
            corregidos: 0,
            errores: 0,
            porOperario: {}
        };
        
        // Identificar registros inconsistentes
        for (const registro of todosLosRegistros) {
            const fechaRegistro = new Date(registro.fecha);
            const horaInicio = new Date(registro.horaInicio);
            
            const fechaRegistroStr = fechaRegistro.toISOString().split('T')[0];
            const fechaHoraInicioStr = horaInicio.toISOString().split('T')[0];
            
            if (fechaRegistroStr !== fechaHoraInicioStr) {
                registrosACorregir.push({
                    id: registro._id,
                    operario: registro.operario?.name || 'Sin nombre',
                    fechaActual: fechaRegistroStr,
                    fechaCorrecta: fechaHoraInicioStr,
                    horaInicio: horaInicio,
                    jornada: registro.jornada
                });
                estadisticas.inconsistentes++;
                
                const operario = registro.operario?.name || 'Sin nombre';
                if (!estadisticas.porOperario[operario]) {
                    estadisticas.porOperario[operario] = { corregidos: 0, errores: 0 };
                }
            }
        }
        
        // REMOVED: console.log(`❌ Encontrados ${registrosACorregir.length} registros inconsistentes`);
        
        if (registrosACorregir.length === 0) {
            // REMOVED: console.log('✅ No hay registros para corregir');
            return;
        }
        
        // Confirmar corrección
        // REMOVED: console.log('\n🔧 Procediendo con la corrección masiva...');
        // REMOVED: console.log(`⚠️  ATENCIÓN: Se van a corregir ${registrosACorregir.length} registros`);
        
        // Agrupar por tipo de corrección para mostrar progreso
        const correcciones = {};
        registrosACorregir.forEach(reg => {
            const clave = `${reg.fechaActual} → ${reg.fechaCorrecta}`;
            if (!correcciones[clave]) {
                correcciones[clave] = [];
            }
            correcciones[clave].push(reg);
        });
        
        // REMOVED: console.log('\n📅 Tipos de correcciones a realizar:');
        Object.entries(correcciones).forEach(([tipo, regs]) => {
            // REMOVED: console.log(`   ${tipo}: ${regs.length} registros`);
        });
        
        // Realizar correcciones en lotes
        const tamañoLote = 50;
        let procesados = 0;
        
        for (let i = 0; i < registrosACorregir.length; i += tamañoLote) {
            const lote = registrosACorregir.slice(i, i + tamañoLote);
            
            // REMOVED: console.log(`\n📦 Procesando lote ${Math.floor(i/tamañoLote) + 1}/${Math.ceil(registrosACorregir.length/tamañoLote)} (${lote.length} registros)...`);
            
            for (const reg of lote) {
                try {
                    // Crear la nueva fecha basada en la hora de inicio
                    const horaInicio = new Date(reg.horaInicio);
                    const nuevaFecha = new Date(horaInicio.getFullYear(), horaInicio.getMonth(), horaInicio.getDate(), 0, 0, 0, 0);
                    
                    await Produccion.findByIdAndUpdate(reg.id, {
                        fecha: nuevaFecha
                    });
                    
                    estadisticas.corregidos++;
                    estadisticas.porOperario[reg.operario].corregidos++;
                    procesados++;
                    
                    if (procesados % 25 === 0 || procesados <= 10) {
                        // REMOVED: console.log(`   ✅ ${procesados}/${registrosACorregir.length} - ${reg.operario}: ${reg.fechaActual} → ${reg.fechaCorrecta}`);
                    }
                    
                } catch (error) {
                    console.error(`   ❌ Error corrigiendo ${reg.id}: ${error.message}`);
                    estadisticas.errores++;
                    estadisticas.porOperario[reg.operario].errores++;
                }
            }
        }
        
        // REMOVED: console.log('\n📋 RESUMEN DE LA CORRECCIÓN MASIVA:');
        // REMOVED: console.log('='.repeat(60));
        // REMOVED: console.log(`📊 Total de registros: ${estadisticas.total}`);
        // REMOVED: console.log(`❌ Inconsistencias encontradas: ${estadisticas.inconsistentes}`);
        // REMOVED: console.log(`✅ Registros corregidos: ${estadisticas.corregidos}`);
        // REMOVED: console.log(`❌ Errores durante corrección: ${estadisticas.errores}`);
        // REMOVED: console.log(`📈 Tasa de éxito: ${((estadisticas.corregidos / estadisticas.inconsistentes) * 100).toFixed(1)}%`);
        
        // REMOVED: console.log('\n👥 Correcciones por operario:');
        Object.entries(estadisticas.porOperario)
            .filter(([_, datos]) => datos.corregidos > 0 || datos.errores > 0)
            .sort(([_, a], [__, b]) => (b.corregidos + b.errores) - (a.corregidos + a.errores))
            .forEach(([operario, datos]) => {
                // REMOVED: console.log(`   ${operario}: ${datos.corregidos} corregidos, ${datos.errores} errores`);
            });
        
        // Recalcular jornadas afectadas
        // REMOVED: console.log('\n🔄 Recalculando jornadas afectadas...');
        
        const jornadasUnicas = [...new Set(registrosACorregir.map(r => r.jornada))];
        // REMOVED: console.log(`📊 Jornadas a recalcular: ${jornadasUnicas.length}`);
        
        let jornadasRecalculadas = 0;
        for (const jornadaId of jornadasUnicas) {
            try {
                const jornada = await Jornada.findById(jornadaId);
                if (jornada) {
                    await jornada.save(); // Esto activará el pre-save hook para recalcular
                    jornadasRecalculadas++;
                    
                    if (jornadasRecalculadas % 10 === 0) {
                        // REMOVED: console.log(`   📊 Recalculadas ${jornadasRecalculadas}/${jornadasUnicas.length} jornadas...`);
                    }
                }
            } catch (error) {
                console.error(`   ❌ Error recalculando jornada ${jornadaId}: ${error.message}`);
            }
        }
        
        // REMOVED: console.log(`✅ ${jornadasRecalculadas} jornadas recalculadas exitosamente`);
        
        // REMOVED: console.log('\n🎉 CORRECCIÓN MASIVA COMPLETADA EXITOSAMENTE');
        // REMOVED: console.log('📊 Todos los registros ahora tienen fechas consistentes con sus horas de trabajo');
        
    } catch (error) {
        console.error('❌ Error fatal durante la corrección masiva:', error);
    } finally {
        mongoose.connection.close();
        // REMOVED: console.log('🔌 Conexión a base de datos cerrada');
    }
}

// Ejecutar el script solo si es llamado directamente
if (require.main === module) {
    // REMOVED: console.log('🚀 Iniciando corrección masiva de inconsistencias de fechas...');
    correccionMasivaFechas();
}

module.exports = { correccionMasivaFechas };
