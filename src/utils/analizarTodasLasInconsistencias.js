/**
 * Script para analizar TODOS los registros y detectar inconsistencias de fechas
 * Este script identifica registros donde la fecha no coincide con las horas de trabajo
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
const connectDB = require('../db/db');

// Modelos - Cargar todos los modelos explícitamente
const Produccion = require('../models/Produccion');
const Jornada = require('../models/Jornada');
const Operario = require('../models/Operario');
const Oti = require('../models/Oti');

// También importar otros modelos para asegurar que estén disponibles
require('../models/AreaProduccion');
require('../models/Maquina');
require('../models/Proceso');
require('../models/Insumos');

async function analizarTodasLasInconsistencias() {
    try {
        // REMOVED: console.log('🔄 Conectando a la base de datos...');
        await connectDB();
        
        // Verificar que los modelos estén registrados
        // REMOVED: console.log('📋 Verificando modelos registrados...');
        const modelNames = mongoose.modelNames();
        // REMOVED: console.log(`Modelos disponibles: ${modelNames.join(', ')}`);
        
        // Asegurar que todos los modelos estén cargados
        if (!modelNames.includes('Operario')) {
            // REMOVED: console.log('⚠️ Modelo Operario no encontrado, forzando carga...');
            require('../models/Operario');
        }
        if (!modelNames.includes('Oti')) {
            // REMOVED: console.log('⚠️ Modelo Oti no encontrado, forzando carga...');
            require('../models/Oti');
        }
        
        // REMOVED: console.log('🔍 Analizando TODOS los registros para detectar inconsistencias de fechas...');
        
        // Obtener TODOS los registros de producción
        const todosLosRegistros = await Produccion.find({})
            .populate('operario', 'name')
            .populate('oti', 'numeroOti')
            .sort({ fecha: 1, horaInicio: 1 });
            
        // REMOVED: console.log(`📊 Total de registros a analizar: ${todosLosRegistros.length}`);
        
        const inconsistencias = [];
        const registrosPorOperario = {};
        
        // Analizar cada registro
        for (const registro of todosLosRegistros) {
            const fechaRegistro = new Date(registro.fecha);
            const horaInicio = new Date(registro.horaInicio);
            const horaFin = new Date(registro.horaFin);
            
            // Extraer fechas sin considerar zona horaria
            const fechaRegistroStr = fechaRegistro.toISOString().split('T')[0];
            const fechaHoraInicioStr = horaInicio.toISOString().split('T')[0];
            const fechaHoraFinStr = horaFin.toISOString().split('T')[0];
            
            // Verificar si hay inconsistencia
            const hayInconsistencia = fechaRegistroStr !== fechaHoraInicioStr || fechaRegistroStr !== fechaHoraFinStr;
            
            if (hayInconsistencia) {
                inconsistencias.push({
                    id: registro._id,
                    operario: registro.operario?.name || 'Sin nombre',
                    oti: registro.oti?.numeroOti || 'Sin OTI',
                    fechaRegistro: fechaRegistroStr,
                    fechaHoraInicio: fechaHoraInicioStr,
                    fechaHoraFin: fechaHoraFinStr,
                    horaInicio: horaInicio.toLocaleString(),
                    horaFin: horaFin.toLocaleString(),
                    tiempo: registro.tiempo,
                    jornada: registro.jornada
                });
            }
            
            // Agrupar por operario para estadísticas
            const operarioNombre = registro.operario?.name || 'Sin nombre';
            if (!registrosPorOperario[operarioNombre]) {
                registrosPorOperario[operarioNombre] = {
                    total: 0,
                    inconsistentes: 0,
                    fechas: new Set()
                };
            }
            registrosPorOperario[operarioNombre].total++;
            registrosPorOperario[operarioNombre].fechas.add(fechaRegistroStr);
            
            if (hayInconsistencia) {
                registrosPorOperario[operarioNombre].inconsistentes++;
            }
        }
        
        // REMOVED: console.log(`\n❌ Inconsistencias encontradas: ${inconsistencias.length}`);
        
        if (inconsistencias.length === 0) {
            // REMOVED: console.log('✅ No se encontraron inconsistencias de fechas');
            return;
        }
        
        // Mostrar resumen por operario
        // REMOVED: console.log('\n📊 RESUMEN POR OPERARIO:');
        // REMOVED: console.log('='.repeat(80));
        Object.entries(registrosPorOperario)
            .filter(([_, datos]) => datos.inconsistentes > 0)
            .sort(([_, a], [__, b]) => b.inconsistentes - a.inconsistentes)
            .forEach(([operario, datos]) => {
                const porcentaje = ((datos.inconsistentes / datos.total) * 100).toFixed(1);
                // REMOVED: console.log(`👤 ${operario}:`);
                // REMOVED: console.log(`   📊 Total registros: ${datos.total}`);
                // REMOVED: console.log(`   ❌ Inconsistentes: ${datos.inconsistentes} (${porcentaje}%)`);
                // REMOVED: console.log(`   📅 Fechas trabajadas: ${Array.from(datos.fechas).sort().join(', ')}`);
                // REMOVED: console.log('');
            });
        
        // Agrupar inconsistencias por tipo de problema
        // REMOVED: console.log('\n🔍 ANÁLISIS DETALLADO DE INCONSISTENCIAS:');
        // REMOVED: console.log('='.repeat(80));
        
        const problemasAgrupados = {};
        inconsistencias.forEach(inc => {
            const tipoProblema = `${inc.fechaRegistro} → ${inc.fechaHoraInicio}`;
            if (!problemasAgrupados[tipoProblema]) {
                problemasAgrupados[tipoProblema] = [];
            }
            problemasAgrupados[tipoProblema].push(inc);
        });
        
        Object.entries(problemasAgrupados)
            .sort(([_, a], [__, b]) => b.length - a.length)
            .forEach(([problema, registros]) => {
                // REMOVED: console.log(`\n📅 ${problema} (${registros.length} registros):`);
                
                // Mostrar primeros 5 ejemplos
                registros.slice(0, 5).forEach((reg, idx) => {
                    // REMOVED: console.log(`   ${idx + 1}. ${reg.operario} - OTI: ${reg.oti}`);
                    // REMOVED: console.log(`      Registro: ${reg.fechaRegistro} | Trabajo: ${reg.fechaHoraInicio}`);
                    // REMOVED: console.log(`      Horas: ${reg.horaInicio} - ${reg.horaFin} (${reg.tiempo}min)`);
                });
                
                if (registros.length > 5) {
                    // REMOVED: console.log(`   ... y ${registros.length - 5} más`);
                }
            });
        
        // Generar sugerencias de corrección
        // REMOVED: console.log('\n💡 SUGERENCIAS DE CORRECCIÓN:');
        // REMOVED: console.log('='.repeat(80));
        
        Object.entries(problemasAgrupados).forEach(([problema, registros]) => {
            const [fechaRegistro, fechaReal] = problema.split(' → ');
            // REMOVED: console.log(`\n📝 Para corregir ${registros.length} registros de ${fechaRegistro} a ${fechaReal}:`);
            
            // Agrupar por operario
            const porOperario = {};
            registros.forEach(reg => {
                if (!porOperario[reg.operario]) {
                    porOperario[reg.operario] = [];
                }
                porOperario[reg.operario].push(reg.id);
            });
            
            Object.entries(porOperario).forEach(([operario, ids]) => {
                // REMOVED: console.log(`   👤 ${operario}: ${ids.length} registros`);
                // REMOVED: console.log(`      IDs: ${ids.slice(0, 3).join(', ')}${ids.length > 3 ? '...' : ''}`);
            });
        });
        
        // Guardar reporte detallado
        const reporte = {
            fecha_analisis: new Date().toISOString(),
            total_registros: todosLosRegistros.length,
            inconsistencias_encontradas: inconsistencias.length,
            operarios_afectados: Object.keys(registrosPorOperario).filter(op => registrosPorOperario[op].inconsistentes > 0).length,
            detalle_inconsistencias: inconsistencias,
            problemas_agrupados: problemasAgrupados
        };
        
        // REMOVED: console.log('\n📄 Reporte completo generado con todos los detalles');
        // REMOVED: console.log(`📊 ${inconsistencias.length} inconsistencias encontradas en ${reporte.operarios_afectados} operarios`);
        
        return reporte;
        
    } catch (error) {
        console.error('❌ Error durante el análisis:', error);
    } finally {
        mongoose.connection.close();
        // REMOVED: console.log('🔌 Conexión a base de datos cerrada');
    }
}

// Ejecutar el script solo si es llamado directamente
if (require.main === module) {
    // REMOVED: console.log('🚀 Iniciando análisis completo de inconsistencias de fechas...');
    analizarTodasLasInconsistencias();
}

module.exports = { analizarTodasLasInconsistencias };
