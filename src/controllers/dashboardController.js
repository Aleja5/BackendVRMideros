const Jornada = require('../models/Jornada');
const Produccion = require('../models/Produccion');
const Oti = require('../models/Oti');
const { safeLog } = require('../utils/logger');

// Controlador para obtener datos KPI para el dashboard
exports.getDashboardKpi = async (req, res) => {
    try {
        // Usar normalización correcta para Colombia
        const { obtenerRangoDia, normalizarFecha } = require('../utils/manejoFechas');
        const hoy = normalizarFecha(new Date());
        const rango = obtenerRangoDia(hoy);

        safeLog.debug(`📅 Rango de fechas para dashboard: ${rango.inicio} -> ${rango.fin}`);

        // Contar jornadas activas hoy (solo las que tienen actividades registradas)
        const jornadasHoy = await Jornada.countDocuments({
            fecha: { 
                $gte: rango.inicio, 
                $lte: rango.fin
            },
            registros: { $exists: true, $not: { $size: 0 } } // Solo jornadas con al menos un registro
        });

        safeLog.success(`Jornadas activas hoy (con actividades): ${jornadasHoy}`);

        // Obtener registros de producción de hoy
        const registrosHoy = await Produccion.find({
            fecha: { 
                $gte: rango.inicio,
                $lte: rango.fin
            }
        });

        safeLog.success(`Producciones hoy: ${registrosHoy.length}`);

        // Calcular minutos trabajados hoy
        const minutosHoy = registrosHoy.reduce((total, registro) => {
            return total + (registro.tiempo || 0);
        }, 0);

        safeLog.debug(`Minutos trabajados: ${minutosHoy}`);    
        // Devolver los KPIs
        res.json({
            jornadasHoy,
            minutosHoy,
            registrosHoy: registrosHoy.length
        });
    } catch (error) {
        safeLog.error('Error al obtener KPIs del dashboard:', error);
        res.status(500).json({ mensaje: 'Error al obtener datos del dashboard' });
    }
};
