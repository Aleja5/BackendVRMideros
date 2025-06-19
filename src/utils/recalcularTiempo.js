const Jornada = require("../models/Jornada");

// Función auxiliar para recalcular tiempo total de actividades y actualizar jornada
const recalcularTiempoTotal = async (jornadaId) => {
    try {
        const jornada = await Jornada.findById(jornadaId).populate('registros');

        if (!jornada || !jornada.registros.length) {
            return await Jornada.findByIdAndUpdate(jornadaId, {
                totalTiempoActividades: { horas: 0, minutos: 0 },
                horaInicio: null,
                horaFin: null
            });
        }

        const registros = jornada.registros;
        const horasInicio = registros.map(r => r.horaInicio).filter(Boolean);
        const horasFin = registros.map(r => r.horaFin).filter(Boolean);

        const totalMinutos = registros.reduce((acc, r) => acc + (r.tiempo || 0), 0);
        const horas = Math.floor(totalMinutos / 60);
        const minutos = totalMinutos % 60;

        const nuevaHoraInicio = horasInicio.length > 0 ? new Date(Math.min(...horasInicio.map(h => h.getTime()))) : null;
        const nuevaHoraFin = horasFin.length > 0 ? new Date(Math.max(...horasFin.map(h => h.getTime()))) : null;

        const tiempoActual = jornada.totalTiempoActividades || { horas: 0, minutos: 0 };

        const cambios =
            tiempoActual.horas !== horas ||
            tiempoActual.minutos !== minutos ||
            (jornada.horaInicio?.getTime() || null) !== (nuevaHoraInicio?.getTime() || null) ||
            (jornada.horaFin?.getTime() || null) !== (nuevaHoraFin?.getTime() || null);

        if (cambios) {
            await Jornada.findByIdAndUpdate(jornadaId, {
                totalTiempoActividades: { horas, minutos },
                horaInicio: nuevaHoraInicio,
                horaFin: nuevaHoraFin
            });
        }

    } catch (error) {
        console.error(`🚨 Error al recalcular tiempo total para la jornada ${jornadaId}:`, error);
    }
};


module.exports = recalcularTiempoTotal;