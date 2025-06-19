const mongoose = require('mongoose');
const { fechaAString } = require('./src/utils/manejoFechas');

// Conectar a la base de datos
mongoose.connect('mongodb://localhost:27017/gestion_produccion')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const Produccion = require('./src/models/Produccion');

async function verificarActividades() {
    try {
        console.log('=== VERIFICANDO ACTIVIDADES SIN POPULATE ===\n');

        // Buscar actividades muy recientes sin populate
        const ahora = new Date();
        const hace15min = new Date(ahora.getTime() - 15 * 60 * 1000);
        
        console.log(`🕐 Buscando actividades desde: ${hace15min}`);
        console.log(`🕐 Hasta: ${ahora}`);
        
        const actividadesRecientes = await Produccion.find({
            _id: { $gte: mongoose.Types.ObjectId.createFromTime(hace15min.getTime() / 1000) }
        }).sort({ _id: -1 });

        console.log(`\n📊 Encontradas ${actividadesRecientes.length} actividades recientes:`);
        
        if (actividadesRecientes.length === 0) {
            console.log('No hay actividades recientes. Buscando las últimas 5...');
            
            const ultimas5 = await Produccion.find().sort({ _id: -1 }).limit(5);
            console.log(`\n📊 Últimas 5 actividades:`);
            
            ultimas5.forEach((act, index) => {
                const minutosHace = Math.floor((ahora - act._id.getTimestamp()) / (1000 * 60));
                console.log(`\n${index + 1}. ID: ${act._id}`);
                console.log(`   Operario ID: ${act.operario}`);
                console.log(`   OTI ID: ${act.oti}`);
                console.log(`   Fecha guardada: ${fechaAString(act.fecha)}`);
                console.log(`   Fecha completa: ${act.fecha}`);
                console.log(`   Creada hace: ${minutosHace} minutos`);
                console.log(`   Hora inicio: ${act.horaInicio}`);
                console.log(`   Hora fin: ${act.horaFin}`);
            });
        } else {
            actividadesRecientes.forEach((act, index) => {
                const minutosHace = Math.floor((ahora - act._id.getTimestamp()) / (1000 * 60));
                console.log(`\n${index + 1}. ID: ${act._id}`);
                console.log(`   Operario ID: ${act.operario}`);
                console.log(`   OTI ID: ${act.oti}`);
                console.log(`   Fecha guardada: ${fechaAString(act.fecha)}`);
                console.log(`   Fecha completa: ${act.fecha}`);
                console.log(`   Creada hace: ${minutosHace} minutos`);
            });
        }

        // Verificar específicamente actividades de hoy vs ayer
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const ayer = new Date(hoy);
        ayer.setDate(ayer.getDate() - 1);
        const mañana = new Date(hoy);
        mañana.setDate(mañana.getDate() + 1);

        console.log(`\n📅 DISTRIBUCIÓN POR FECHAS:`);
        
        const actividadesHoy = await Produccion.countDocuments({
            fecha: { $gte: hoy, $lt: mañana }
        });
        
        const actividadesAyer = await Produccion.countDocuments({
            fecha: { $gte: ayer, $lt: hoy }
        });

        console.log(`🟢 Actividades de HOY (${fechaAString(hoy)}): ${actividadesHoy}`);
        console.log(`🟡 Actividades de AYER (${fechaAString(ayer)}): ${actividadesAyer}`);

        // Si hay actividades de ayer, mostrar detalles
        if (actividadesAyer > 0) {
            console.log(`\n🔍 Detalles de actividades de AYER:`);
            const actividadesAyerDetalle = await Produccion.find({
                fecha: { $gte: ayer, $lt: hoy }
            }).sort({ _id: -1 });
            
            actividadesAyerDetalle.forEach((act, index) => {
                const minutosHace = Math.floor((ahora - act._id.getTimestamp()) / (1000 * 60));
                console.log(`   ${index + 1}. Creada hace ${minutosHace} minutos, fecha guardada: ${fechaAString(act.fecha)}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

verificarActividades();
