const mongoose = require("mongoose");
const winston = require('winston');
const Produccion = require("../models/Produccion");
const Jornada = require("../models/Jornada");
const { recalcularHorasJornada } = require('../utils/recalcularHoras');
const { recalcularTiempoTotal } = require('../utils/recalcularTiempo');
const { normalizarFecha } = require('../utils/manejoFechas'); // Importar función de manejo de fechas
const fs = require('fs');
const path = require('path');
const verificarYCrearOti = require('../utils/verificarYCrearEntidad');
const Operario = require('../models/Operario'); // <--- AÑADIDO: Importar modelo Operario
const Proceso = require('../models/Proceso'); // Added import
const AreaProduccion = require('../models/AreaProduccion'); // Added import
const Maquina = require('../models/Maquina'); // Added import
const Insumo = require('../models/Insumos'); // Corrected import path from Insumo to Insumos


// Configuración del logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'logs/produccion.log' }),
        new winston.transports.Console()
    ],
});

const Oti = require('../models/Oti');

const logFilePath = path.join(__dirname, '..', '..', 'logs', 'produccion.log');

// Función para registrar mensajes en el archivo de log y en la consola
const logMessage = (message) => {
  // REMOVED: console.log(message);
  fs.appendFileSync(logFilePath, `\${new Date().toISOString()} - \${message}\\n`);
};

/**
 * Valida que las actividades estén en la jornada correcta según su fecha
 */
async function validarConsistenciaJornada(operarioId, fecha) {
    try {
        const fechaNormalizada = normalizarFecha(fecha);
        
        // Buscar la jornada del operario para esta fecha
        const jornada = await Jornada.findOne({
            operario: operarioId,
            fecha: fechaNormalizada
        });

        if (!jornada) return { valida: true, problemas: [] };

        const problemas = [];
        
        // Verificar cada actividad en la jornada
        for (const actividadId of jornada.registros) {
            const actividad = await Produccion.findById(actividadId);
            if (actividad) {
                const fechaActividad = normalizarFecha(actividad.fecha);
                const fechaJornada = normalizarFecha(jornada.fecha);
                
                // Comparar fechas normalizadas
                if (fechaActividad.toDateString() !== fechaJornada.toDateString()) {
                    problemas.push({
                        actividadId: actividad._id,
                        fechaActividad: fechaActividad.toLocaleDateString(),
                        fechaJornada: fechaJornada.toLocaleDateString()
                    });
                }
            }
        }

        return { valida: problemas.length === 0, problemas };
    } catch (error) {
        console.error('Error en validación de consistencia:', error);
        return { valida: false, problemas: [], error: error.message };
    }
}

/**
 * Limpia jornadas duplicadas del mismo día para un operario específico
 */
async function limpiarJornadasDuplicadas(operarioId) {
    try {
        // Obtener todas las jornadas del operario
        const jornadas = await Jornada.find({ operario: operarioId });
        
        // Agrupar por fecha normalizada
        const jornadasPorFecha = {};
        
        for (const jornada of jornadas) {
            const fechaNormalizada = normalizarFecha(jornada.fecha);
            const claveDate = fechaNormalizada.toDateString();
            
            if (!jornadasPorFecha[claveDate]) {
                jornadasPorFecha[claveDate] = [];
            }
            jornadasPorFecha[claveDate].push(jornada);
        }
        
        // Procesar cada grupo de jornadas del mismo día
        for (const [fechaStr, jornadasDelDia] of Object.entries(jornadasPorFecha)) {
            if (jornadasDelDia.length > 1) {
                console.log(`   🔧 Consolidando ${jornadasDelDia.length} jornadas duplicadas del ${new Date(fechaStr).toLocaleDateString('es-ES')}`);
                
                // Combinar todos los registros únicos
                const registrosCombinados = new Set();
                const fechaNormalizada = normalizarFecha(jornadasDelDia[0].fecha);
                
                for (const jornada of jornadasDelDia) {
                    if (jornada.registros) {
                        jornada.registros.forEach(registro => registrosCombinados.add(registro.toString()));
                    }
                }
                
                // Eliminar todas las jornadas existentes de este día
                for (const jornada of jornadasDelDia) {
                    await Jornada.findByIdAndDelete(jornada._id);
                }
                
                // Crear una nueva jornada consolidada con fecha normalizada
                const nuevaJornada = new Jornada({
                    operario: operarioId,
                    fecha: fechaNormalizada,
                    registros: Array.from(registrosCombinados),
                    totalTiempoActividades: { horas: 0, minutos: 0 }
                });
                
                await nuevaJornada.save();
                console.log(`   ✅ Jornadas consolidadas: ${registrosCombinados.size} actividades`);
            }
        }
    } catch (error) {
        console.error('Error limpiando jornadas duplicadas:', error);
    }
}

// Obtener todos los registros de producción
exports.getAllProduccion = async (req, res) => {
    try {
        let { page = 1, limit = 10 } = req.query;

        page = isNaN(parseInt(page)) ? 1 : parseInt(page);
        limit = isNaN(parseInt(limit)) ? 10 : parseInt(limit);

        const skip = (page - 1) * limit;

        const totalResults = await Produccion.countDocuments({});

        const registros = await Produccion.find()
            .sort({ fecha: -1 })
            .skip(skip)
            .limit(limit)
            .populate("oti", "_id numeroOti")
            .populate("operario", "name")
            .populate("procesos", "nombre")
            .populate("areaProduccion", "nombre")
            .populate("maquina", "nombre")
            .populate("insumos", "nombre");

        res.json({ totalResults, resultados: registros });
    } catch (error) {
        console.error("error en getAllProduccion:", error);
        res.status(500).json({ message: "Error obteniendo registros", error, totalResults: 0, resultados: [] });
    }
};

// 📌 Registrar Producción
exports.registrarProduccion = async (req, res) => {
    try {
        const { operario, fecha, oti, procesos, areaProduccion, maquina, insumos, tipoTiempo, horaInicio, horaFin, tiempo, observaciones } = req.body;

        // Log de datos recibidos
        logger.info('Datos recibidos en registrarProduccion:', req.body);

        // Nueva validación más detallada
        const validationErrors = [];
        if (!operario) validationErrors.push('operario');
        if (!fecha) validationErrors.push('fecha');
        if (!oti) validationErrors.push('oti');
        if (!procesos || !Array.isArray(procesos)) { // Asegura que procesos sea un array
            validationErrors.push('procesos (debe ser un array)');
        } else if (procesos.length === 0 && (tipoTiempo === "Operación" || tipoTiempo === "Preparación")) { // Ejemplo: requerir procesos si es operación/preparación
            // Ajusta esta lógica si procesos puede estar vacío en ciertos casos o siempre debe tener al menos uno.
            // Por ahora, solo validamos que sea un array. El modelo Produccion.js ya requiere que los elementos internos sean ObjectId.
        }
        if (!areaProduccion) validationErrors.push('areaProduccion');
        if (!maquina) validationErrors.push('maquina');
        if (!insumos || !Array.isArray(insumos)) { // Asegura que insumos sea un array
            validationErrors.push('insumos (debe ser un array)');
        }
        // Similar a procesos, puedes añadir validación de insumos.length === 0 si es necesario.
        if (!tipoTiempo) validationErrors.push('tipoTiempo');
        if (!horaInicio) validationErrors.push('horaInicio');
        if (!horaFin) validationErrors.push('horaFin');
        if (typeof tiempo !== 'number') { // Permite que tiempo sea 0
            validationErrors.push('tiempo (debe ser un número)');
        }

        if (validationErrors.length > 0) {
            const message = `Faltan campos requeridos o tienen formato incorrecto: ${validationErrors.join(', ')}`;
            logger.warn(message, { body: req.body, errors: validationErrors });
            return res.status(400).json({ msg: message, fields: validationErrors });
        }        // NORMALIZAR LA FECHA ANTES DE CUALQUIER OPERACIÓN
        const fechaNormalizada = normalizarFecha(fecha);
        console.log('🔍 Fecha original recibida:', fecha);
        console.log('🔍 Fecha normalizada para Colombia:', fechaNormalizada);
        
        // Buscar o crear la jornada correspondiente usando fecha normalizada
        const inicioDia = new Date(fechaNormalizada);
        inicioDia.setHours(0, 0, 0, 0);
        const finDia = new Date(fechaNormalizada);
        finDia.setHours(23, 59, 59, 999);
        
        let jornada = await Jornada.findOne({
            operario,
            fecha: {
                $gte: inicioDia,
                $lte: finDia
            }
        });
        
        if (!jornada) {
            logger.info('No se encontró jornada, creando una nueva.');
            jornada = new Jornada({ 
                operario, 
                fecha: fechaNormalizada, // Usar fecha normalizada
                registros: [] 
            });
            await jornada.save();
        }

        logger.info('Jornada creada o encontrada:', jornada);

        const otiId = await verificarYCrearOti(oti);        // Asignar el ObjectId de OTI al registro de producción
        const nuevaProduccion = new Produccion({
            operario,
            fecha: fechaNormalizada, // Usar fecha normalizada consistentemente
            oti: otiId,
            procesos,
            areaProduccion,
            maquina,
            insumos,
            jornada: jornada._id,
            tipoTiempo,
            horaInicio,
            horaFin,
            tiempo,
            observaciones: observaciones || null
        });

        logger.info('Creando nueva producción:', nuevaProduccion);
        const produccionGuardada = await nuevaProduccion.save();

        // Asociar el registro a la jornada
        jornada.registros.push(produccionGuardada._id);
        await jornada.save();

        logger.info('Producción registrada y vinculada a la jornada:', produccionGuardada);
        res.status(201).json({ msg: 'Producción registrada y vinculada a la jornada', produccion: produccionGuardada });
    } catch (error) {
        logger.error('Error al registrar producción:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

// 📌 Obtener Producciones por Operario
exports.obtenerProducciones = async (req, res) => {
    try {
        const { operario } = req.query;

        if (!operario) {
            return res.status(400).json({ msg: "El ID del operario es requerido" });
        }

        if (!mongoose.Types.ObjectId.isValid(operario)) {
            return res.status(400).json({ msg: "El ID del operario no es válido" });
        }

        const producciones = await Produccion.find({ operario: operario })
            .populate('operario', 'name')
            .populate('oti', '_id numeroOti')
            .populate('procesos', 'nombre')
            .populate('areaProduccion', 'nombre')
            .populate('maquina', 'nombre')
            .populate('insumos', 'nombre');

        if (!producciones.length) {
            return res.status(404).json({ msg: "No se encontraron producciones para este operario" });
        }

        return res.status(200).json(producciones);
    } catch (error) {
        // Log error in a consistent way
        logger.error("Error al obtener las producciones:", error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};

exports.listarProduccion = async (req, res) => {
    try {
        const { operario, oti } = req.query;
        if (!mongoose.Types.ObjectId.isValid(operario)) {
            return res.status(400).json({ error: "ID de operario no válido" });
        }

        const query = { operario: new mongoose.Types.ObjectId(operario) };

        if (oti) {
            const otiDoc = await Oti.findOne({ numeroOti: oti });
            if (otiDoc) {
                query.oti = otiDoc._id;
            } else {
                return res.status(404).json({ msg: 'OTI no encontrada' });
            }
        }

        const producciones = await Produccion.find(query)
        .sort({ fecha: -1 })
        .populate({ path: 'oti', select: '_id numeroOti' })
        .populate({ path: 'procesos', select: 'nombre' })
        .populate({ path: 'areaProduccion', select: 'nombre' })
        .populate({ path: 'maquina', select: 'nombre' })
        .populate({ path: 'operario', select: 'name' })
        .populate({ path: 'insumos', select: 'nombre' });

        res.status(200).json(producciones);
    } catch (error) {
        logger.error('Error al listar producciones:', error);
        res.status(500).json({ msg: 'Error al listar las producciones' });
    }
};

exports.actualizarProduccion = async (req, res) => {
    try {
        const { _id, operario, oti, procesos, areaProduccion, maquina, insumos, fecha, tiempo, horaInicio, horaFin, tipoTiempo, observaciones } = req.body;

        // Validar que el ID de la producción esté presente
        // Validaciones básicas
        if (!_id) {
            return res.status(400).json({ msg: "El ID del registro de producción es requerido." });
        }
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ msg: "El ID del registro de producción no es válido." });
        }
      
        if (!operario || !areaProduccion || !maquina || !fecha || typeof tiempo !== 'number' || !horaInicio || !horaFin || !tipoTiempo || !procesos) { 
            return res.status(400).json({ msg: "Faltan campos requeridos para la actualización o tienen formato incorrecto." });
        }        // Obtener la producción original ANTES de actualizarla para comparar fechas
        const produccionOriginal = await Produccion.findById(_id);
        if (!produccionOriginal) {
            return res.status(404).json({ msg: "Registro de producción no encontrado." });
        }        // Normalizar fechas para comparación correcta
        // IMPORTANTE: Siempre normalizar las fechas a medianoche para evitar problemas de hora
        const fechaOriginalNormalizada = normalizarFecha(produccionOriginal.fecha);
        const fechaNuevaNormalizada = normalizarFecha(fecha);
        
        // Verificar si la fecha cambió
        const fechaCambio = fechaOriginalNormalizada.toDateString() !== fechaNuevaNormalizada.toDateString();

        console.log('🔍 Información de actualización:');
        console.log(`   ID actividad: ${_id}`);
        console.log(`   Fecha original RAW: ${produccionOriginal.fecha}`);
        console.log(`   Fecha original normalizada: ${fechaOriginalNormalizada.toLocaleDateString()}`);
        console.log(`   Fecha nueva RAW: ${fecha}`);
        console.log(`   Fecha nueva normalizada: ${fechaNuevaNormalizada.toLocaleDateString()}`);
        console.log(`   ¿Cambió fecha?: ${fechaCambio}`);

        // Convertir IDs de string a ObjectId donde sea necesario
        const operarioId = new mongoose.Types.ObjectId(operario);
        const areaProduccionId = new mongoose.Types.ObjectId(areaProduccion);
        const maquinaId = new mongoose.Types.ObjectId(maquina);
        const procesosIds = Array.isArray(procesos) ? procesos.map(pId => new mongoose.Types.ObjectId(pId)) : [new mongoose.Types.ObjectId(procesos)];
        const insumosIds = Array.isArray(insumos) ? insumos.map(iId => new mongoose.Types.ObjectId(iId)) : [new mongoose.Types.ObjectId(insumos)];

        // Verificar y/o crear OTI
        const otiId = await verificarYCrearOti(oti);
        if (!otiId) {
            return res.status(400).json({ msg: "Error al verificar o crear la OTI." });
        }

        const produccionActualizada = await Produccion.findByIdAndUpdate(
            _id,
            {
                operario: operarioId,
                oti: otiId,
                procesos: procesosIds, 
                areaProduccion: areaProduccionId,
                maquina: maquinaId,
                insumos: insumosIds,
                fecha: fechaNuevaNormalizada, // Usar fecha normalizada
                tiempo,
                horaInicio,
                horaFin,
                tipoTiempo,
                observaciones: observaciones || null
            },
            { new: true, runValidators: true }
        )
        .populate("oti", "_id numeroOti")
        .populate("operario", "name")
        .populate("procesos", "nombre") 
        .populate("areaProduccion", "nombre")
        .populate("maquina", "nombre")
        .populate("insumos", "nombre");        if (!produccionActualizada) {
            return res.status(404).json({ msg: "Registro de producción no encontrado." });
        }

        // Gestionar las jornadas
        if (produccionActualizada.operario) {
            try {
                // Si la fecha cambió, necesitamos actualizar ambas jornadas
                if (fechaCambio) {                    console.log('📅 Actualizando jornadas por cambio de fecha...');
                    
                    // 1. REMOVER de la jornada original
                    console.log(`   Buscando jornada original: ${fechaOriginalNormalizada.toLocaleDateString()}`);
                    
                    // Buscar jornada original usando rango de fecha
                    const inicioOriginal = new Date(fechaOriginalNormalizada);
                    inicioOriginal.setHours(0, 0, 0, 0);
                    const finOriginal = new Date(fechaOriginalNormalizada);
                    finOriginal.setHours(23, 59, 59, 999);
                    
                    const jornadaOriginal = await Jornada.findOne({
                        operario: produccionActualizada.operario._id,
                        fecha: {
                            $gte: inicioOriginal,
                            $lte: finOriginal
                        }
                    });

                    if (jornadaOriginal) {
                        console.log(`   Removiendo actividad de jornada original: ${fechaOriginalNormalizada.toLocaleDateString()}`);
                        
                        // Remover esta actividad específica de los registros
                        const registrosOriginales = jornadaOriginal.registros || [];
                        jornadaOriginal.registros = registrosOriginales.filter(
                            registroId => registroId.toString() !== _id.toString()
                        );
                        
                        // Si la jornada queda vacía, eliminarla
                        if (jornadaOriginal.registros.length === 0) {
                            console.log(`   🗑️ Eliminando jornada vacía: ${fechaOriginalNormalizada.toLocaleDateString()}`);
                            await Jornada.findByIdAndDelete(jornadaOriginal._id);
                        } else {
                            // Normalizar la fecha de la jornada original también
                            jornadaOriginal.fecha = fechaOriginalNormalizada;
                            await jornadaOriginal.save();
                            console.log(`   ✅ Actividad removida. Registros restantes: ${jornadaOriginal.registros.length}`);
                        }
                    } else {
                        console.log(`   ⚠️ No se encontró jornada original para: ${fechaOriginalNormalizada.toLocaleDateString()}`);
                    }
                }                // 2. AGREGAR/ACTUALIZAR en la jornada de la nueva fecha
                console.log(`   Buscando jornada para: ${fechaNuevaNormalizada.toLocaleDateString()} (${fechaNuevaNormalizada})`);
                
                // Buscar jornada usando rango de fecha para capturar cualquier hora del día
                const inicioDia = new Date(fechaNuevaNormalizada);
                inicioDia.setHours(0, 0, 0, 0);
                const finDia = new Date(fechaNuevaNormalizada);
                finDia.setHours(23, 59, 59, 999);
                
                let jornada = await Jornada.findOne({
                    operario: produccionActualizada.operario._id,
                    fecha: {
                        $gte: inicioDia,
                        $lte: finDia
                    }
                });

                if (!jornada) {
                    console.log(`   Creando nueva jornada para: ${fechaNuevaNormalizada.toLocaleDateString()}`);
                    // Crear nueva jornada si no existe - SIEMPRE con fecha normalizada
                    jornada = new Jornada({
                        operario: produccionActualizada.operario._id,
                        fecha: fechaNuevaNormalizada, // Fecha ya normalizada
                        registros: [_id], // Agregar solo esta actividad
                        totalTiempoActividades: { horas: 0, minutos: 0 }
                    });
                } else {
                    console.log(`   Actualizando jornada existente: ${jornada.fecha} -> normalizada: ${fechaNuevaNormalizada}`);
                    
                    // Si la jornada existe pero no tiene fecha normalizada, normalizarla
                    if (jornada.fecha.getTime() !== fechaNuevaNormalizada.getTime()) {
                        console.log(`   🔧 Normalizando fecha de jornada existente`);
                        jornada.fecha = fechaNuevaNormalizada;
                    }
                    
                    // Asegurar que esta actividad esté en los registros (sin duplicar)
                    const registroIds = jornada.registros.map(r => r.toString());
                    if (!registroIds.includes(_id.toString())) {
                        jornada.registros.push(_id);
                        console.log(`   ➕ Actividad agregada a jornada existente`);
                    } else {
                        console.log(`   ✅ Actividad ya estaba en la jornada`);
                    }
                    
                    // Buscar todas las actividades que realmente pertenecen a esta fecha normalizada
                    const actividadesReales = await Produccion.find({
                        operario: produccionActualizada.operario._id,
                        fecha: {
                            $gte: inicioDia,
                            $lt: new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000)
                        }
                    });
                    
                    // Actualizar registros con las actividades reales (eliminando duplicados)
                    const registrosUnicos = [...new Set(actividadesReales.map(a => a._id.toString()))];
                    jornada.registros = registrosUnicos;
                    console.log(`   🔄 Registros sincronizados: ${registrosUnicos.length} actividades únicas`);
                }

                await jornada.save();
                console.log(`   ✅ Jornada actualizada. Total registros: ${jornada.registros.length}`);                // 3. LIMPIAR JORNADAS DUPLICADAS DEL MISMO DÍA
                console.log(`   🧹 Verificando jornadas duplicadas del operario...`);
                await limpiarJornadasDuplicadas(produccionActualizada.operario._id);

                // 4. VALIDACIÓN FINAL
                const validacion = await validarConsistenciaJornada(produccionActualizada.operario._id, fechaNuevaNormalizada);
                if (!validacion.valida) {
                    console.log('⚠️ Inconsistencias detectadas después de la actualización:');
                    validacion.problemas.forEach(problema => {
                        console.log(`   - Actividad ${problema.actividadId}: fecha ${problema.fechaActividad} en jornada ${problema.fechaJornada}`);
                    });
                } else {
                    console.log('✅ Validación final: No se detectaron inconsistencias');
                }

            } catch (jornadaError) {
                console.error('❌ Error al recalcular las jornadas:', jornadaError);
                // No fallar la actualización de producción por un error en la jornada
            }
        }

        res.status(200).json({ msg: "Producción actualizada exitosamente", produccion: produccionActualizada });

    } catch (error) {
        logger.error("Error al actualizar producción:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({ msg: "Error de casteo: Verifique los IDs proporcionados." });
        }
        res.status(500).json({ msg: "Error interno del servidor al actualizar la producción." });
    }
};

// 📌 Eliminar Producción
exports.eliminarProduccion = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que el ID de la producción esté presente
        if (!id) {
            return res.status(400).json({ msg: 'El ID de la producción es requerido' });
        }

        // Buscar la producción a eliminar
        const produccion = await Produccion.findById(id);
        if (!produccion) {
            return res.status(404).json({ msg: "Producción no encontrada" });
        }

        const jornadaId = produccion.jornada; // Guardar el ID de la jornada antes de eliminar la producción

        // Eliminar la producción
        await Produccion.findByIdAndDelete(id);

        // Si la producción estaba asociada a una jornada, actualizar la jornada
        if (jornadaId) {
            const jornada = await Jornada.findById(jornadaId);
            if (jornada) {
                // Remover el ID de la producción eliminada de los registros de la jornada
                jornada.registros = jornada.registros.filter(registroId => registroId.toString() !== id.toString());
                
                // Guardar la jornada para disparar el hook pre-save y recalcular totales
                await jornada.save(); 
                logger.info(`Jornada ${jornadaId} actualizada tras eliminación de producción ${id}.`);
            } else {
                logger.warn(`No se encontró la jornada con ID ${jornadaId} para actualizar tras eliminar producción ${id}.`);
            }
        }

        logger.info(`Producción con ID: ${id} eliminada exitosamente.`);
        res.status(200).json({ msg: "Producción eliminada exitosamente" });

    } catch (error) {
        logger.error("Error al eliminar producción:", error);
        res.status(500).json({ msg: "Error interno del servidor" });
    }
};

// 📌 Buscar Producción con filtros dinámicos para FilterPanel
exports.buscarProduccion = async (req, res) => {
    try {
        const { oti, operario, fechaInicio, fechaFin, proceso, areaProduccion, maquina, insumos, page = 1, limit = 10 } = req.query;
        const query = {};
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Log de parámetros recibidos
        // REMOVED: console.log('Parámetros de búsqueda recibidos:', req.query);

        // Filter by OTI
        if (oti && oti.trim() !== '') {
            const otiTrimmed = oti.trim();
            if (mongoose.Types.ObjectId.isValid(otiTrimmed)) {
                query.oti = new mongoose.Types.ObjectId(otiTrimmed);
                // REMOVED: console.log('Filtro OTI aplicado (ID):', query.oti);
            } else {
                const otiDoc = await Oti.findOne({ numeroOti: otiTrimmed });
                if (otiDoc) {
                    query.oti = otiDoc._id;
                    // REMOVED: console.log('Filtro OTI aplicado (nombre):', query.oti);
                } else {
                    // REMOVED: console.log('OTI no encontrada:', otiTrimmed);
                    return res.status(200).json({ totalResultados: 0, resultados: [] });
                }
            }
        }

        // Filter by Operario
        if (operario && operario.trim() !== '') {
            const operarioTrimmed = operario.trim();
            if (mongoose.Types.ObjectId.isValid(operarioTrimmed)) {
                query.operario = new mongoose.Types.ObjectId(operarioTrimmed);
                // REMOVED: console.log('Filtro Operario aplicado (ID):', query.operario);
            } else {
                const operarioDoc = await Operario.findOne({ name: operarioTrimmed });
                if (operarioDoc) {
                    query.operario = operarioDoc._id;
                    // REMOVED: console.log('Filtro Operario aplicado (nombre):', query.operario);
                } else {
                    // REMOVED: console.log('Operario no encontrado:', operarioTrimmed);
                    return res.status(200).json({ totalResultados: 0, resultados: [] });
                }
            }
        }        // Filter by Date Range
        if (fechaInicio && fechaFin) {
            // Si las fechas vienen en formato YYYY-MM-DD, crear fechas locales explícitamente
            let inicio, fin;
            
            if (fechaInicio.includes('T')) {
                // Formato ISO completo
                inicio = new Date(fechaInicio);
            } else {
                // Formato YYYY-MM-DD, crear fecha local
                const [year, month, day] = fechaInicio.split('-').map(Number);
                inicio = new Date(year, month - 1, day, 0, 0, 0, 0);
            }
            
            if (fechaFin.includes('T')) {
                // Formato ISO completo
                fin = new Date(fechaFin);
            } else {
                // Formato YYYY-MM-DD, crear fecha local
                const [year, month, day] = fechaFin.split('-').map(Number);
                fin = new Date(year, month - 1, day, 23, 59, 59, 999);
            }
              query.fecha = { $gte: inicio, $lte: fin };
        }

        // Filter by Proceso (searches if the ID is in the 'procesos' array)
        if (proceso && proceso.trim() !== '') {
            const procesoTrimmed = proceso.trim();
            let procesoIdToQuery;
            if (mongoose.Types.ObjectId.isValid(procesoTrimmed)) {
                procesoIdToQuery = new mongoose.Types.ObjectId(procesoTrimmed);
            } else {
                const procesoDoc = await Proceso.findOne({ nombre: procesoTrimmed });
                if (procesoDoc) {
                    procesoIdToQuery = procesoDoc._id; // This is already an ObjectId
                } else {
                    // REMOVED: console.log('Proceso no encontrado:', procesoTrimmed);
                    return res.status(200).json({ totalResultados: 0, resultados: [] });
                }
            }
            if (procesoIdToQuery) {
                query.procesos = { $in: [procesoIdToQuery] };
                // REMOVED: console.log('Filtro Proceso aplicado:', query.procesos);
            }
        }

        // Filter by Area de Producción
        if (areaProduccion && areaProduccion.trim() !== '') {
            const areaTrimmed = areaProduccion.trim();
            if (mongoose.Types.ObjectId.isValid(areaTrimmed)) {
                query.areaProduccion = new mongoose.Types.ObjectId(areaTrimmed);
                // REMOVED: console.log('Filtro Área aplicado (ID):', query.areaProduccion);
            } else {
                const areaDoc = await AreaProduccion.findOne({ nombre: areaTrimmed });
                if (areaDoc) {
                    query.areaProduccion = areaDoc._id;
                    // REMOVED: console.log('Filtro Área aplicado (nombre):', query.areaProduccion);
                } else {
                    // REMOVED: console.log('Área no encontrada:', areaTrimmed);
                    return res.status(200).json({ totalResultados: 0, resultados: [] });
                }
            }
        }

        // Filter by Maquina
        if (maquina && maquina.trim() !== '') {
            const maquinaTrimmed = maquina.trim();
            if (mongoose.Types.ObjectId.isValid(maquinaTrimmed)) {
                query.maquina = new mongoose.Types.ObjectId(maquinaTrimmed);
                // REMOVED: console.log('Filtro Máquina aplicado (ID):', query.maquina);
            } else {
                const maquinaDoc = await Maquina.findOne({ nombre: maquinaTrimmed });
                if (maquinaDoc) {
                    query.maquina = maquinaDoc._id;
                    // REMOVED: console.log('Filtro Máquina aplicado (nombre):', query.maquina);
                } else {
                    // REMOVED: console.log('Máquina no encontrada:', maquinaTrimmed);
                    return res.status(200).json({ totalResultados: 0, resultados: [] });
                }
            }
        }

        // Filter by Insumos (searches if the ID is in the 'insumos' array)
        if (insumos && insumos.trim() !== '') {
            const insumosTrimmed = insumos.trim();
            let insumoIdToQuery;
            if (mongoose.Types.ObjectId.isValid(insumosTrimmed)) {
                insumoIdToQuery = new mongoose.Types.ObjectId(insumosTrimmed);
            } else {
                const insumoDoc = await Insumo.findOne({ nombre: insumosTrimmed });
                if (insumoDoc) {
                    insumoIdToQuery = insumoDoc._id; // This is already an ObjectId
                } else {
                    // REMOVED: console.log('Insumo no encontrado:', insumosTrimmed);
                    return res.status(200).json({ totalResultados: 0, resultados: [] });
                }
            }
            if (insumoIdToQuery) {
                query.insumos = { $in: [insumoIdToQuery] };
                // REMOVED: console.log('Filtro Insumos aplicado:', query.insumos);
            }
        }

        // Log de la consulta final construida
        // REMOVED: console.log('Consulta MongoDB construida:', JSON.stringify(query, null, 2));

        const totalResultados = await Produccion.countDocuments(query);
        // REMOVED: console.log('Total de resultados encontrados:', totalResultados);

        const producciones = await Produccion.find(query)
            .skip(skip)
            .limit(parseInt(limit))
            .populate('oti', '_id numeroOti')
            .populate('operario', 'name')
            .populate('procesos', 'nombre')
            .populate('areaProduccion', 'nombre')
            .populate('maquina', 'nombre')
            .populate('insumos', 'nombre');

        // REMOVED: console.log('Producciones encontradas:', producciones.length);
        
        res.status(200).json({ totalResultados, resultados: producciones });
    } catch (error) {
        logger.error('Error al buscar producciones:', error);
        res.status(500).json({ msg: 'Error interno del servidor' });
    }
};

exports.buscarPorFechas = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        if (!fechaInicio || !fechaFin) {
            return res.status(400).json({ msg: "Faltan parámetros requeridos: fechaInicio y fechaFin" });
        }

        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);

        if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
            return res.status(400).json({ msg: "Fechas inválidas" });
        }

        const producciones = await Produccion.find({
            fecha: {
                $gte: inicio,
                $lte: fin,
            },
        })
            .populate("oti", "_id numeroOti")
            .populate("operario", "name")
            .populate("procesos", "nombre") // Changed from proceso to procesos
            .populate("areaProduccion", "nombre")
            .populate("maquina", "nombre")
            .populate("insumos", "nombre");

        res.status(200).json(producciones);
    } catch (error) {
        logger.error("Error al buscar por fechas:", error);
        res.status(500).json({ msg: "Error al buscar registros" });
    }
};

// NUEVO: Obtener todas las OTIs para filtros
exports.getAllOtiParaFiltros = async (req, res) => {
    try {
        const otis = await Oti.find({}, '_id numeroOti').sort({ numeroOti: 1 });
        res.status(200).json(otis);
    } catch (error) {
        logger.error("Error al obtener OTIs para filtros:", error);
        res.status(500).json({ msg: "Error interno del servidor al obtener OTIs" });
    }
};

// NUEVO: Obtener todos los Operarios para filtros
exports.getAllOperariosParaFiltros = async (req, res) => {
    try {
        const operarios = await Operario.find({}, '_id name').sort({ name: 1 }); // Asumiendo que el campo es 'name'
        res.status(200).json(operarios);
    } catch (error) {
        logger.error("Error al obtener Operarios para filtros:", error);
        res.status(500).json({ msg: "Error interno del servidor al obtener Operarios" });
    }
};

// NUEVO: Función de debug para verificar datos existentes
exports.debugDatos = async (req, res) => {
    try {
        // REMOVED: console.log('=== DEBUG: Verificando datos en la base de datos ===');
        
        // Contar total de registros de producción
        const totalProduccion = await Produccion.countDocuments({});
        // REMOVED: console.log('Total de registros de producción:', totalProduccion);
        
        // Obtener algunos registros de muestra
        const muestraProduccion = await Produccion.find({})
            .limit(3)
            .populate('operario', 'name')
            .populate('oti', 'numeroOti');        
        muestraProduccion.forEach((prod, index) => {
            // Debug info removed
        });
        
        // Verificar operarios existentes
        const operarios = await Operario.find({}, '_id name').limit(5);
        operarios.forEach(op => {
            // Debug info removed
        });
        
        res.status(200).json({
            totalProduccion,
            muestraProduccion,
            operarios
        });
    } catch (error) {
        console.error('Error en debug:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Función para limpiar inconsistencias de fechas entre actividades y jornadas
 * Esta función asegura que todas las actividades estén en la jornada correcta
 */
exports.limpiarInconsistenciasFechas = async (req, res) => {
    try {
        console.log('🧹 Iniciando limpieza de inconsistencias de fechas...');
        
        let problemasEncontrados = 0;
        let problemasCorregidos = 0;
        
        // Obtener todas las jornadas
        const jornadas = await Jornada.find({}).populate('operario', 'name');
        
        for (const jornada of jornadas) {
            const fechaJornada = normalizarFecha(jornada.fecha);
            const registrosCorrectos = [];
            
            console.log(`📋 Revisando jornada de ${jornada.operario.name} - ${fechaJornada.toLocaleDateString()}`);
            
            // Revisar cada actividad en la jornada
            for (const actividadId of jornada.registros) {
                const actividad = await Produccion.findById(actividadId);
                
                if (!actividad) {
                    console.log(`   ⚠️ Actividad ${actividadId} no encontrada, será removida`);
                    problemasEncontrados++;
                    continue;
                }
                
                const fechaActividad = normalizarFecha(actividad.fecha);
                
                // Verificar si las fechas coinciden
                if (fechaActividad.toDateString() === fechaJornada.toDateString()) {
                    registrosCorrectos.push(actividadId);
                } else {
                    console.log(`   ❌ Inconsistencia: Actividad ${actividadId} tiene fecha ${fechaActividad.toLocaleDateString()} pero está en jornada ${fechaJornada.toLocaleDateString()}`);
                    problemasEncontrados++;
                    
                    // Buscar la jornada correcta para esta actividad
                    let jornadaCorrecta = await Jornada.findOne({
                        operario: actividad.operario,
                        fecha: fechaActividad
                    });
                    
                    if (!jornadaCorrecta) {
                        // Crear jornada si no existe
                        console.log(`   🆕 Creando nueva jornada para ${fechaActividad.toLocaleDateString()}`);
                        jornadaCorrecta = new Jornada({
                            operario: actividad.operario,
                            fecha: fechaActividad,
                            registros: [actividadId],
                            totalTiempoActividades: { horas: 0, minutos: 0 }
                        });
                        await jornadaCorrecta.save();
                    } else {
                        // Agregar a jornada existente si no está ya
                        if (!jornadaCorrecta.registros.includes(actividadId)) {
                            jornadaCorrecta.registros.push(actividadId);
                            await jornadaCorrecta.save();
                        }
                    }
                    
                    problemasCorregidos++;
                }
            }
            
            // Actualizar la jornada actual con solo los registros correctos
            if (registrosCorrectos.length !== jornada.registros.length) {
                jornada.registros = registrosCorrectos;
                await jornada.save();
                console.log(`   ✅ Jornada actualizada. Registros válidos: ${registrosCorrectos.length}`);
            }
        }
        
        console.log(`\n📊 Limpieza completada:`);
        console.log(`   • ${problemasEncontrados} problemas encontrados`);
        console.log(`   • ${problemasCorregidos} problemas corregidos`);
        
        res.status(200).json({ 
            message: 'Limpieza de inconsistencias completada',
            problemasEncontrados,
            problemasCorregidos
        });
        
    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        res.status(500).json({ 
            message: 'Error durante la limpieza de inconsistencias',
            error: error.message 
        });
    }
};