const Jornada = require('../models/Jornada');

async function recalcularHorasJornada(jornadaId) {
    try {
        const jornada = await Jornada.findById(jornadaId).populate('registros');
        if (!jornada) {
            console.error(`❌ Jornada no encontrada con ID: ${jornadaId}`);
            return;
        }

        const horasInicio = [];
        const horasFin = [];
        let totalTiempoAcumulado = 0;

        if (jornada.registros?.length > 0) {
            jornada.registros.forEach(registro => {
                if (registro.horaInicio) horasInicio.push(new Date(registro.horaInicio).getTime());
                if (registro.horaFin) horasFin.push(new Date(registro.horaFin).getTime());
                totalTiempoAcumulado += Number(registro.tiempo) || 0;
            });
        }

        jornada.horaInicio = horasInicio.length > 0 ? new Date(Math.min(...horasInicio)) : null;
        jornada.horaFin = horasFin.length > 0 ? new Date(Math.max(...horasFin)) : null;
        jornada.totalTiempoActividades = totalTiempoAcumulado;        await jornada.save({ validateBeforeSave: false });

        // Jornada actualizada exitosamente

    } catch (error) {
        console.error(`❌ Error al recalcular horas de jornada ${jornadaId}:`, error);
        throw error;
    }
}

module.exports = { recalcularHorasJornada };
