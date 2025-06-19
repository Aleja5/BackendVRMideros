const mongoose = require('mongoose');
require('dotenv').config();

async function verificarDatos() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');
          const Produccion = require('./src/models/Produccion');
        const Jornada = require('./src/models/Jornada');
        const Operario = require('./src/models/Operario');
        const Oti = require('./src/models/Oti');
        const Proceso = require('./src/models/Proceso');
        
        // Buscar el operario Sebastian Escobar Galindo
        const sebastian = await Operario.findOne({ name: /Sebastian.*Escobar.*Galindo/i });
        
        if (!sebastian) {
            console.log('❌ No se encontró el operario Sebastian Escobar Galindo');
            mongoose.disconnect();
            return;
        }
        
        console.log(`✅ Operario encontrado: ${sebastian.name} (ID: ${sebastian._id})`);
          // Buscar TODAS las actividades del operario (sin populate)
        const actividades = await Produccion.find({
            operario: sebastian._id
        }).sort({ fecha: 1 });
          console.log(`=== TODAS LAS ACTIVIDADES DE ${sebastian.name} ===`);
        actividades.forEach((act, i) => {
            console.log(`${i+1}. ID: ${act._id}`);
            console.log(`   OTI: ${act.oti || 'No OTI'}`);
            console.log(`   Fecha: ${new Date(act.fecha).toLocaleDateString('es-ES')}`);
            console.log(`   Fecha ISO: ${act.fecha}`);
            console.log(`   Tiempo: ${act.tiempo} min`);
            console.log('---');
        });
        // Buscar jornadas del operario
        const jornadas = await Jornada.find({ operario: sebastian._id }).sort({ fecha: 1 });
        
        console.log('=== JORNADAS DEL OPERARIO ===');
        jornadas.forEach((jornada, i) => {
            console.log(`${i+1}. Fecha: ${new Date(jornada.fecha).toLocaleDateString('es-ES')}`);
            console.log(`   Fecha ISO: ${jornada.fecha}`);
            console.log(`   Registros: ${jornada.registros?.length || 0}`);
            console.log(`   IDs: [${jornada.registros?.slice(0, 3).join(', ') || 'ninguno'}]${jornada.registros?.length > 3 ? '...' : ''}`);
            console.log('---');
        });
        
        // Verificar si las actividades están en las jornadas correctas
        console.log('=== VERIFICACIÓN DE ASIGNACIÓN ===');
        
        // Agrupar actividades por fecha real
        const actividadesPorFecha = {};
        actividades.forEach(act => {
            const fechaStr = new Date(act.fecha).toLocaleDateString('es-ES');
            if (!actividadesPorFecha[fechaStr]) {
                actividadesPorFecha[fechaStr] = [];
            }
            actividadesPorFecha[fechaStr].push(act);
        });
        
        console.log('Actividades agrupadas por fecha real:');
        Object.entries(actividadesPorFecha).forEach(([fecha, acts]) => {
            console.log(`📅 ${fecha}: ${acts.length} actividades`);            acts.forEach(act => {
                console.log(`   - ${act._id} (OTI: ${act.oti || 'Sin OTI'})`);
            });
        });
        
        // Verificar inconsistencias
        console.log('\n=== INCONSISTENCIAS DETECTADAS ===');
        for (const jornada of jornadas) {
            const fechaJornada = new Date(jornada.fecha).toLocaleDateString('es-ES');
            console.log(`\n🗓️ Jornada del ${fechaJornada}:`);
            
            if (jornada.registros && jornada.registros.length > 0) {
                for (const registroId of jornada.registros) {
                    const actividad = actividades.find(a => a._id.toString() === registroId.toString());
                    if (actividad) {
                        const fechaActividad = new Date(actividad.fecha).toLocaleDateString('es-ES');                        if (fechaActividad !== fechaJornada) {
                            console.log(`   ❌ PROBLEMA: Actividad ${actividad._id} tiene fecha ${fechaActividad} pero está en jornada ${fechaJornada}`);
                            console.log(`      OTI: ${actividad.oti || 'Sin OTI'}, Tiempo: ${actividad.tiempo}min`);
                        } else {
                            console.log(`   ✅ OK: Actividad ${actividad._id} está en la jornada correcta`);
                        }
                    } else {
                        console.log(`   ⚠️ ADVERTENCIA: Registro ${registroId} no encontrado en actividades`);
                    }
                }
            } else {
                console.log(`   📭 Jornada vacía`);
            }
        }
        
        mongoose.disconnect();
        console.log('🔍 Verificación completada');
    } catch (error) {
        console.error('❌ Error:', error);
        mongoose.disconnect();
    }
}

verificarDatos();
