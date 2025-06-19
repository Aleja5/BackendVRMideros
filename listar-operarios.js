const mongoose = require('mongoose');

// Conectar a la base de datos
mongoose.connect('mongodb://localhost:27017/gestion_produccion')
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error conectando a MongoDB:', err));

const Operario = require('./src/models/Operario');
const Produccion = require('./src/models/Produccion');
const { fechaAString } = require('./src/utils/manejoFechas');

async function listarTodosLosOperarios() {
    try {
        console.log('=== LISTANDO TODOS LOS OPERARIOS ===\n');

        const operarios = await Operario.find();
        console.log(`Total de operarios: ${operarios.length}\n`);

        for (const operario of operarios) {
            console.log(`👤 ${operario.name} (ID: ${operario._id})`);
            console.log(`   Cédula: ${operario.cedula}`);
            
            // Contar actividades de este operario
            const actividades = await Produccion.find({ operario: operario._id }).sort({ _id: -1 }).limit(3);
            console.log(`   Actividades totales: ${actividades.length}`);
            
            if (actividades.length > 0) {
                console.log(`   Última actividad: ${fechaAString(actividades[0].fecha)}`);
                const minutosHace = Math.floor((new Date() - actividades[0]._id.getTimestamp()) / (1000 * 60));
                console.log(`   Creada hace: ${minutosHace} minutos`);
            }
            console.log('');
        }

        // Buscar actividades muy recientes de cualquier operario
        console.log('\n🕐 ACTIVIDADES MUY RECIENTES (últimos 15 minutos):');
        const ahora = new Date();
        const hace15min = new Date(ahora.getTime() - 15 * 60 * 1000);
        
        const actividadesRecientes = await Produccion.find({
            _id: { $gte: mongoose.Types.ObjectId.createFromTime(hace15min.getTime() / 1000) }
        }).populate('operario', 'name').populate('oti', 'numeroOti').sort({ _id: -1 });

        console.log(`Encontradas ${actividadesRecientes.length} actividades recientes:`);
        
        actividadesRecientes.forEach(act => {
            const minutosHace = Math.floor((ahora - act._id.getTimestamp()) / (1000 * 60));
            console.log(`📝 ${act.oti?.numeroOti || 'N/A'} - ${act.operario?.name || 'N/A'}`);
            console.log(`   Fecha guardada: ${fechaAString(act.fecha)}`);
            console.log(`   Creada hace: ${minutosHace} minutos`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        mongoose.connection.close();
    }
}

listarTodosLosOperarios();
