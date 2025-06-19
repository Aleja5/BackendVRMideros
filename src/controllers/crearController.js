const crearEntidad = async (req, res) => {
    const { coleccion } = req.params;
    const data = req.body;

    // REMOVED: console.log("📥 Datos recibidos en el backend:", data);

    if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: "No se recibieron datos en el body" });
    }

    const modelos = {
        oti: require("../models/Oti"),
        proceso: require("../models/Proceso"),
        areaProduccion: require("../models/AreaProduccion"),
        maquina: require("../models/Maquina"),
    };

    const Modelo = modelos[coleccion];
    if (!Modelo) {
        return res.status(400).json({ error: "Colección no válida" });
    }

    try {
        let entidad;

        if (coleccion === "oti") {
            // REMOVED: console.log("📥 Datos recibidos para crear OTI:", JSON.stringify(req.body, null, 2));

            let numeroOti = req.body.numeroOti || req.body.numeroOTI;
            // REMOVED: console.log("🎯 Procesando numeroOti:", numeroOti);

            if (!numeroOti || typeof numeroOti !== "string" || numeroOti.trim() === "") {
                return res.status(400).json({ error: "El número de OTI es obligatorio y no puede estar vacío" });
            }

            numeroOti = numeroOti.trim();
            // REMOVED: console.log("🔹 Número OTI después de limpiar:", numeroOti);

            // 🔎 Buscar si ya existe en la BD
            entidad = await Modelo.findOne({ numeroOti: { $regex: `^${numeroOti}$`, $options: "i" }});

            if (entidad) {
                // REMOVED: console.log("✅ OTI encontrada:", entidad);
                return res.status(200).json({ 
                    msg: "OTI encontrada", 
                    id: entidad._id, 
                    entidad 
                });
            } else {
                // REMOVED: console.log("⚠️ OTI no encontrada");
                
                // 🚀 Crear automáticamente la OTI
                const nuevaOti = new Modelo({ numeroOti });
                
                try {
                    await nuevaOti.save();
                    // REMOVED: console.log("✅ Nueva OTI creada correctamente:", nuevaOti);

                    return res.status(201).json({
                        msg: "OTI creada exitosamente",
                        id: nuevaOti._id,
                        entidad: nuevaOti
                    });
                } catch (error) {
                    console.error("❌ Error al guardar la nueva OTI en MongoDB:", error);
                    return res.status(500).json({ error: "Error al guardar la OTI", detalles: error.message });
                }
            }
        } else {
            const { nombre } = data;
            if (!nombre) {
                return res.status(400).json({ error: "El nombre es obligatorio" });
            }

            entidad = await Modelo.findOne({ nombre: new RegExp(`^${nombre}$`, "i") });

            if (entidad) {
                return res.status(200).json({ 
                    msg: "Entidad encontrada", 
                    id: entidad._id, 
                    entidad 
                });
            } else {
                // REMOVED: console.log("⚠️ Entidad no encontrada, creando automáticamente...");

                // 🚀 Crear automáticamente la entidad
                const nuevaEntidad = new Modelo({ nombre });
                
                try {
                    await nuevaEntidad.save();
                    // REMOVED: console.log("✅ Nueva entidad creada correctamente:", nuevaEntidad);

                    return res.status(201).json({
                        msg: "Entidad creada exitosamente",
                        id: nuevaEntidad._id,
                        entidad: nuevaEntidad
                    });
                } catch (error) {
                    console.error("❌ Error al guardar la nueva entidad en MongoDB:", error);
                    return res.status(500).json({ error: "Error al guardar la entidad", detalles: error.message });
                }
            }
        }
    } catch (error) {
        console.error("❌ Error al buscar/crear la entidad:", error);
        res.status(500).json({ error: "Error en el proceso", detalles: error.message });
    }
};
module.exports = { crearEntidad };
