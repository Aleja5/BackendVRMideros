const mongoose = require('mongoose');
const Jornada = require('./src/models/Jornada');
const Produccion = require('./src/models/Produccion');

mongoose.connect('mongodb://localhost:27017/ProyectoFinal');

async function investigarJornadas() {
  try {
    console.log('=== INVESTIGANDO JORNADAS DE ALEJANDRA ===');
    
    // Buscar todas las jornadas de Alejandra por populate
    const jornadas = await Jornada.find({}).populate('operario').sort({ fecha: -1 });
    const jornadasAlejandra = jornadas.filter(j => j.operario && j.operario.nombre === 'Alejandra Castellanos');
    
    console.log(`Total jornadas encontradas: ${jornadasAlejandra.length}`);
    
    for (const jornada of jornadasAlejandra) {
      console.log(`\nJornada ID: ${jornada._id}`);
      console.log(`Fecha: ${jornada.fecha}`);
      console.log(`Actividades IDs: [${jornada.actividades.join(', ')}]`);
      console.log(`Total actividades: ${jornada.actividades.length}`);
      
      // Verificar que las actividades existen
      const actividades = await Produccion.find({ _id: { $in: jornada.actividades } });
      console.log(`Actividades reales encontradas: ${actividades.length}`);
      
      for (const act of actividades) {
        console.log(`  - Actividad ${act._id}: ${act.proceso}, fecha: ${act.fecha}`);
      }
    }
    
    // Buscar actividades huérfanas
    console.log('\n=== BUSCANDO ACTIVIDADES HUÉRFANAS ===');
    const todasActividades = await Produccion.find({ operario: 'Alejandra Castellanos' }).sort({ fecha: -1 });    
    for (const actividad of todasActividades) {
      const jornadaConActividad = await Jornada.findOne({ 
        actividades: actividad._id 
      });
      
      if (!jornadaConActividad) {
        console.log(`ACTIVIDAD HUÉRFANA: ${actividad._id} - ${actividad.proceso} - ${actividad.fecha}`);
      }
    }
    
    // Verificar duplicaciones por fecha
    console.log('\n=== VERIFICANDO DUPLICACIONES POR FECHA ===');
    const fechasAgrupadas = {};
    
    for (const jornada of jornadasAlejandra) {
      const fechaStr = jornada.fecha.toISOString().split('T')[0];
      if (!fechasAgrupadas[fechaStr]) {
        fechasAgrupadas[fechaStr] = [];
      }
      fechasAgrupadas[fechaStr].push(jornada);
    }
    
    for (const [fecha, jornadasDelDia] of Object.entries(fechasAgrupadas)) {
      if (jornadasDelDia.length > 1) {
        console.log(`DUPLICACIÓN DETECTADA en ${fecha}: ${jornadasDelDia.length} jornadas`);
        for (const jornada of jornadasDelDia) {
          console.log(`  - Jornada ${jornada._id}: ${jornada.actividades.length} actividades`);
        }
      }
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

investigarJornadas();
