const mongoose = require('mongoose');
require('dotenv').config();

async function corregirJornadasMasivo() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Conectado a MongoDB');

        const Produccion = require('./src/models/Produccion');
        const Jornada = require('./src/models/Jornada');
        const Operario = require('./src/models/Operario');

        // Función para normalizar fechas (eliminar hora, mantener solo fecha)
        function normalizarFecha(fecha) {
            const d = new Date(fecha);
            return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        }

        // Función para formatear fecha como string
        function formatearFecha(fecha) {
            return new Date(fecha).toLocaleDateString('es-ES');
        }

        console.log('🔍 Buscando todos los operarios...');
        const operarios = await Operario.find({});
        console.log(`📋 Encontrados ${operarios.length} operarios`);

        let totalCorregidas = 0;
        let totalJornadasModificadas = 0;

        for (const operario of operarios) {
            console.log(`\n👤 Procesando operario: ${operario.name}`);
            
            // Obtener todas las actividades del operario
            const actividades = await Produccion.find({ operario: operario._id });
            
            if (actividades.length === 0) {
                console.log('   ⚠️ No tiene actividades');
                continue;
            }

            // Agrupar actividades por fecha real
            const actividadesPorFecha = {};
            actividades.forEach(actividad => {
                const fechaNormalizada = normalizarFecha(actividad.fecha);
                const fechaKey = fechaNormalizada.toISOString().split('T')[0];
                
                if (!actividadesPorFecha[fechaKey]) {
                    actividadesPorFecha[fechaKey] = [];
                }
                actividadesPorFecha[fechaKey].push(actividad);
            });

            console.log(`   📅 Actividades agrupadas en ${Object.keys(actividadesPorFecha).length} fechas distintas`);

            // Obtener todas las jornadas del operario
            const jornadas = await Jornada.find({ operario: operario._id });
            
            // Limpiar todas las jornadas existentes
            for (const jornada of jornadas) {
                jornada.registros = [];
                jornada.tiempoTotal = 0;
                jornada.tiempoEfectivo = 0;
                await jornada.save();
            }

            // Recrear jornadas correctamente
            for (const [fechaKey, actividadesDelDia] of Object.entries(actividadesPorFecha)) {
                const fechaJornada = new Date(fechaKey + 'T19:00:00-05:00'); // Fecha con hora en Colombia
                
                // Buscar jornada existente para esta fecha
                let jornada = await Jornada.findOne({
                    operario: operario._id,
                    fecha: fechaJornada
                });

                // Si no existe, crear nueva jornada
                if (!jornada) {
                    jornada = new Jornada({
                        operario: operario._id,
                        fecha: fechaJornada,
                        registros: [],
                        tiempoTotal: 0,
                        tiempoEfectivo: 0
                    });
                }

                // Agregar todas las actividades de esta fecha
                jornada.registros = actividadesDelDia.map(act => act._id);
                
                // Calcular tiempos
                jornada.tiempoTotal = actividadesDelDia.reduce((total, act) => total + (act.tiempo || 0), 0);
                
                // Calcular tiempo efectivo (excluyendo descansos/alimentación)
                jornada.tiempoEfectivo = actividadesDelDia
                    .filter(act => {
                        // Aquí puedes agregar lógica para excluir actividades de descanso
                        // Por ahora, consideramos todo como tiempo efectivo
                        return true;
                    })
                    .reduce((total, act) => total + (act.tiempo || 0), 0);

                await jornada.save();
                
                console.log(`   ✅ Jornada ${formatearFecha(fechaJornada)}: ${actividadesDelDia.length} actividades (${jornada.tiempoTotal} min)`);
                totalCorregidas += actividadesDelDia.length;
                totalJornadasModificadas++;
            }

            // Eliminar jornadas vacías
            const jornadasVacias = await Jornada.find({
                operario: operario._id,
                $or: [
                    { registros: { $size: 0 } },
                    { registros: { $exists: false } },
                    { registros: null }
                ]
            });

            if (jornadasVacias.length > 0) {
                await Jornada.deleteMany({
                    operario: operario._id,
                    $or: [
                        { registros: { $size: 0 } },
                        { registros: { $exists: false } },
                        { registros: null }
                    ]
                });
                console.log(`   🗑️ Eliminadas ${jornadasVacias.length} jornadas vacías`);
            }
        }

        console.log('\n🎉 CORRECCIÓN COMPLETADA');
        console.log(`📊 Total actividades reorganizadas: ${totalCorregidas}`);
        console.log(`📅 Total jornadas procesadas: ${totalJornadasModificadas}`);

        // Verificación final
        console.log('\n🔍 VERIFICACIÓN FINAL...');
        
        const verificaciones = await Jornada.aggregate([
            {
                $lookup: {
                    from: 'produccions',
                    localField: 'registros',
                    foreignField: '_id',
                    as: 'actividades'
                }
            },
            {
                $project: {
                    fecha: 1,
                    operario: 1,
                    inconsistencias: {
                        $filter: {
                            input: '$actividades',
                            cond: {
                                $ne: [
                                    { $dateToString: { format: '%Y-%m-%d', date: '$fecha' } },
                                    { $dateToString: { format: '%Y-%m-%d', date: '$$this.fecha' } }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    'inconsistencias.0': { $exists: true }
                }
            }
        ]);

        if (verificaciones.length === 0) {
            console.log('✅ ¡Perfecto! No se encontraron inconsistencias');
        } else {
            console.log(`❌ Aún hay ${verificaciones.length} jornadas con inconsistencias`);
            verificaciones.forEach(v => {
                console.log(`   - Jornada ${formatearFecha(v.fecha)}: ${v.inconsistencias.length} actividades incorrectas`);
            });
        }

        mongoose.disconnect();
        console.log('👋 Desconectado de MongoDB');

    } catch (error) {
        console.error('❌ Error durante la corrección:', error.message);
        mongoose.disconnect();
        process.exit(1);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    corregirJornadasMasivo();
}

module.exports = { corregirJornadasMasivo };
