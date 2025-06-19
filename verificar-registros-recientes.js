const mongoose = require('mongoose');
const { normalizarFecha, fechaAString } = require('./src/utils/manejoFechas');

// Conectar a la base de datos
mongoose.connect('mongodb://localhost:27017/gestion_produccion')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const Jornada = require('./src/models/Jornada');
const Produccion = require('./src/models/Produccion');
const Oti = require('./src/models/Oti');
const Operario = require('./src/models/Operario');

async function verificarRegistrosRecientes() {
    try {
        console.log('=== VERIFICANDO REGISTROS RECIENTES ===\n');

        // Buscar las actividades más recientes
        console.log('🔍 Buscando las 5 actividades más recientes...');
        const actividadesRecientes = await Produccion.find()
            .sort({ _id: -1 })
            .limit(5)
            .populate('oti', 'numeroOti')
            .populate('operario', 'name');

        console.log(`\n📊 Encontradas ${actividadesRecientes.length} actividades recientes:`);
        
        actividadesRecientes.forEach((actividad, index) => {
            console.log(`\n${index + 1}. Actividad ID: ${actividad._id}`);
            console.log(`   OTI: ${actividad.oti?.numeroOti || 'N/A'}`);
            console.log(`   Operario: ${actividad.operario?.name || 'N/A'}`);
            console.log(`   Fecha guardada: ${fechaAString(actividad.fecha)}`);
            console.log(`   Fecha completa: ${actividad.fecha}`);
            console.log(`   Hora inicio: ${actividad.horaInicio}`);
            console.log(`   Hora fin: ${actividad.horaFin}`);
            console.log(`   Creado: ${actividad._id.getTimestamp()}`);
        });

        // Buscar jornadas de hoy y ayer
        console.log('\n\n📅 Verificando jornadas de hoy y ayer...');
        
        const hoy = normalizarFecha(new Date());
        const ayer = new Date(hoy);
        ayer.setDate(ayer.getDate() - 1);
        
        console.log(`Fecha de hoy normalizada: ${fechaAString(hoy)}`);
        console.log(`Fecha de ayer: ${fechaAString(ayer)}`);

        // Jornadas de hoy
        const jornadasHoy = await Jornada.find({
            fecha: {
                $gte: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0),
                $lte: new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59)
            }
        }).populate('operario', 'name');

        console.log(`\n🟢 Jornadas de HOY (${fechaAString(hoy)}): ${jornadasHoy.length}`);
        jornadasHoy.forEach(jornada => {
            console.log(`   - Operario: ${jornada.operario?.name || 'N/A'}, Registros: ${jornada.registros.length}, Fecha: ${fechaAString(jornada.fecha)}`);
        });

        // Jornadas de ayer
        const jornadasAyer = await Jornada.find({
            fecha: {
                $gte: new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate(), 0, 0, 0),
                $lte: new Date(ayer.getFullYear(), ayer.getMonth(), ayer.getDate(), 23, 59, 59)
            }
        }).populate('operario', 'name');

        console.log(`\n🟡 Jornadas de AYER (${fechaAString(ayer)}): ${jornadasAyer.length}`);
        jornadasAyer.forEach(jornada => {
            console.log(`   - Operario: ${jornada.operario?.name || 'N/A'}, Registros: ${jornada.registros.length}, Fecha: ${fechaAString(jornada.fecha)}`);
        });

        // Verificar si la actividad más reciente está en la jornada correcta
        if (actividadesRecientes.length > 0) {
            const ultimaActividad = actividadesRecientes[0];
            const fechaActividad = fechaAString(ultimaActividad.fecha);
            
            console.log('\n🔍 ANÁLISIS DE LA ÚLTIMA ACTIVIDAD:');
            console.log(`   Fecha de la actividad: ${fechaActividad}`);
            console.log(`   ¿Es de hoy (${fechaAString(hoy)})? ${fechaActividad === fechaAString(hoy) ? '✅ SÍ' : '❌ NO'}`);
            console.log(`   ¿Es de ayer (${fechaAString(ayer)})? ${fechaActividad === fechaAString(ayer) ? '✅ SÍ' : '❌ NO'}`);
            
            if (fechaActividad === fechaAString(ayer)) {
                console.log('\n🚨 PROBLEMA CONFIRMADO: La actividad se guardó con fecha de ayer');
                
                // Verificar cuál fue la fecha original enviada
                console.log('\n🔍 Investigando la causa...');
                console.log('Revisando logs del servidor para ver qué fecha se recibió...');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

verificarRegistrosRecientes();
