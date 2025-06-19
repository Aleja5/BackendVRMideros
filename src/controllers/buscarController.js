const mongoose = require("mongoose");

const buscarEntidad = async (req, res) => {
    const { coleccion } = req.params;
    const valor = req.query.nombre || req.query.numeroOti;  // Parámetro de búsqueda

    // REMOVED: console.log(`🔍 Buscando en ${coleccion} con query:`, req.query); 
    
    // Definir el modelo según la colección solicitada
    const modelos = {
        oti: require("../models/Oti"),
        proceso: require("../models/Proceso"),
        areaProduccion: require("../models/AreaProduccion"),
        maquina: require("../models/Maquina"),
        operario: require("../models/Operario"),
        insumo: require("../models/Insumos"),
    };

    const Modelo = modelos[coleccion];
    if (!Modelo) {
        return res.status(400).json({ error: "Colección no válida" });
    }

    try {
        let resultado = null;

        // 📌 Verificar si el valor es un ID válido de MongoDB
        if (mongoose.Types.ObjectId.isValid(valor)) {
            // REMOVED: console.log(`🔍 Buscando por ID en la colección ${coleccion}:`, valor);
            resultado = await Modelo.findById(valor);
        } 
        
        // 📌 Si no es un ID, buscar por los campos específicos de la colección
        if (!resultado) {
            // REMOVED: console.log(`🔍 Buscando por otros campos en ${coleccion}:`, valor);
            let filtro = {};
            
            // Definir los campos de búsqueda según la colección
            switch (coleccion) {
                case "oti":
                    filtro = { numeroOti: valor };
                    break;
                case "proceso":
                    filtro = { nombre: new RegExp(valor, "i") };
                    break;
                case "areaProduccion":
                    filtro = { nombre: new RegExp(valor, "i") };
                    break;
                case "maquina":
                    filtro = { nombre: new RegExp(valor, "i") };
                    break;
                case "operario":
                    filtro = { cedula: valor };
                    break;
                case "insumo":
                    filtro = { nombre: new RegExp(valor, "i") };
                    break;
                default:
                    return res.status(400).json({ error: "Filtro no definido para esta colección" });
            }

            resultado = await Modelo.findOne(filtro);
        }

        // 📌 Si no encuentra nada, devolver un error 404
        if (!resultado) {
            return res.status(404).json({ error: "Entidad no encontrada en la colección especificada" });
        }

        res.json(resultado);
    } catch (error) {
        console.error("❌ Error al buscar la entidad:", error);
        res.status(500).json({ error: "Error al buscar la entidad", detalles: error.message });
    }
};

module.exports = { buscarEntidad };
