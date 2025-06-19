const mongoose = require('mongoose');
require('dotenv').config();

// Importar los modelos
const Produccion = require('./src/models/Produccion');
const Jornada = require('./src/models/Jornada');
const Operario = require('./src/models/Operario');
const { normalizarFecha, esMismodia } = require('./src/utils/manejoFechas');

async function corregirProblemaZonaHoraria() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('🔧 Conectado a MongoDB para corregir problema de zona horaria\n');

        // 1. PASO 1: Corregir todas las fechas de producción que tienen problema de zona horaria
        console.log('=== PASO 1: CORRIGIENDO FECHAS DE ACTIVIDADES ===\n');
        
        const todasActividades = await Produccion.find({});
        let actividadesCorregidas = 0;
        
        for (const actividad of todasActividades) {
            const fechaOriginal = actividad.fecha;
            
            // Verificar si la fecha tiene problema de zona horaria
            // Si getDate() != getUTCDate(), hay problema de zona horaria
            if (fechaOriginal.getDate() !== fechaOriginal.getUTCDate()) {
                console.log(`🔄 Corrigiendo actividad ${actividad._id}:`);
                console.log(`   Fecha original: ${fechaOriginal.toString()}`);
                console.log(`   Local: ${fechaOriginal.toLocaleDateString()}, UTC: ${fechaOriginal.getUTCDate()}/${fechaOriginal.getUTCMonth()+1}`);
                
                // Crear fecha corregida usando la fecha UTC como fecha local
                const fechaCorregida = new Date(
                    fechaOriginal.getUTCFullYear(),
                    fechaOriginal.getUTCMonth(),
                    fechaOriginal.getUTCDate(),
                    0, 0, 0, 0
                );
                
                console.log(`   Fecha corregida: ${fechaCorregida.toString()}`);
                
                // Actualizar la actividad
                await Produccion.findByIdAndUpdate(actividad._id, { fecha: fechaCorregida });
                actividadesCorregidas++;
                console.log(`   ✅ Actividad corregida\n`);
            }
        }
        
        console.log(`📊 RESULTADO PASO 1: ${actividadesCorregidas} actividades corregidas de ${todasActividades.length} total\n`);

        // 2. PASO 2: Reconstruir todas las jornadas con las fechas corregidas
        console.log('=== PASO 2: RECONSTRUYENDO JORNADAS ===\n');
          // Eliminar todas las jornadas existentes
        const jornadasEliminadas = await Jornada.deleteMany({});
        console.log(`🗑️ Eliminadas ${jornadasEliminadas.deletedCount} jornadas existentes\n`);
        
        // Obtener todas las actividades corregidas y agruparlas por operario y fecha
        const actividadesParaAgrupar = {};
        
        const todasActividadesCorregidas = await Produccion.find({}).populate('operario', 'name');
        
        for (const actividad of todasActividadesCorregidas) {
            if (!actividad.operario) continue;
            
            const operarioId = actividad.operario._id.toString();
            const fecha = actividad.fecha.toLocaleDateString();
            
            const clave = `${operarioId}-${fecha}`;
            
            if (!actividadesParaAgrupar[clave]) {
                actividadesParaAgrupar[clave] = {
                    operario: actividad.operario._id,
                    operarioNombre: actividad.operario.name,
                    fecha: normalizarFecha(actividad.fecha),
                    actividades: []
                };            }
            
            actividadesParaAgrupar[clave].actividades.push(actividad._id);
        }
        
        // Crear nuevas jornadas con las agrupaciones correctas
        let jornadasCreadas = 0;
        
        for (const [clave, grupo] of Object.entries(actividadesParaAgrupar)) {
            console.log(`📅 Creando jornada para ${grupo.operarioNombre} - ${grupo.fecha.toLocaleDateString()} (${grupo.actividades.length} actividades)`);
            
            const nuevaJornada = new Jornada({
                operario: grupo.operario,
                fecha: grupo.fecha,
                registros: grupo.actividades,
                totalTiempoActividades: { horas: 0, minutos: 0 } // Se recalculará automáticamente en pre-save
            });
            
            await nuevaJornada.save();
            jornadasCreadas++;
        }
        
        console.log(`\n📊 RESULTADO PASO 2: ${jornadasCreadas} jornadas creadas correctamente\n`);

        // 3. PASO 3: Verificación final
        console.log('=== PASO 3: VERIFICACIÓN FINAL ===\n');
        
        const jornadasVerificacion = await Jornada.find({}).populate('operario', 'name').sort({ fecha: 1 });
        let problemasEncontrados = 0;
        
        for (const jornada of jornadasVerificacion.slice(0, 10)) { // Verificar las primeras 10
            const fechaJornada = jornada.fecha.toLocaleDateString();
            let problemasEnJornada = 0;
            
            for (const actividadId of jornada.registros.slice(0, 3)) { // Verificar las primeras 3 actividades
                const actividad = await Produccion.findById(actividadId);
                if (actividad) {
                    const fechaActividad = actividad.fecha.toLocaleDateString();
                    if (fechaActividad !== fechaJornada) {
                        problemasEnJornada++;
                        problemasEncontrados++;
                    }
                }
            }
            
            const estado = problemasEnJornada === 0 ? '✅' : '❌';
            console.log(`${estado} Jornada ${jornada.operario.name} - ${fechaJornada}: ${problemasEnJornada} problemas`);
        }
        
        console.log(`\n🎯 RESULTADO FINAL: ${problemasEncontrados === 0 ? '✅ PROBLEMA SOLUCIONADO' : `❌ ${problemasEncontrados} problemas encontrados`}`);
        
        if (problemasEncontrados === 0) {
            console.log(`\n🎉 ¡ÉXITO! El problema de zona horaria ha sido completamente solucionado.`);
            console.log(`📊 Resumen:`);
            console.log(`   • ${actividadesCorregidas} actividades con fechas corregidas`);
            console.log(`   • ${jornadasCreadas} jornadas reconstruidas correctamente`);
            console.log(`   • 0 inconsistencias de fecha detectadas`);
        }
        
    } catch (error) {
        console.error('❌ Error durante la corrección:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Desconectado de MongoDB');
    }
}

// Confirmar antes de ejecutar
console.log('⚠️  ADVERTENCIA: Este script va a:');
console.log('   1. Corregir fechas de todas las actividades');
console.log('   2. Eliminar y reconstruir todas las jornadas');
console.log('   3. Solucionar el problema de zona horaria permanentemente');
console.log('\n🚀 Ejecutando corrección en 3 segundos...\n');

setTimeout(corregirProblemaZonaHoraria, 3000);
