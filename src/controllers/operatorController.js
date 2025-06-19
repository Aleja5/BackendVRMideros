const Operario = require("../models/Operario");

// Validar si un operario existe en la base de datos con su cédula
const validateCedula = async (req, res) => {
    const { cedula } = req.body;

    if (!cedula) {
        return res.status(400).json({ message: "La cédula es requerida" });
    }

    try {
        // Buscar al operario por su cédula
        const operario = await Operario.findOne({ cedula });

        if (!operario) {
            return res.status(404).json({ message: "Operario no encontrado" });
        }

        res.status(200).json({
            message: "Cédula válida, acceso permitido",
            operario: {
                id: operario._id,
                name: operario.name,
                cedula: operario.cedula,
            }
        });
    } catch (error) {
        console.error("Error al validar la cédula:", error);
        res.status(500).json({ message: "Error del servidor" });
    }
};

// Crear un nuevo operario
const crearOperario = async (req, res) => {
  try {
    const nuevoOperario = new Operario(req.body);
    const operarioGuardado = await nuevoOperario.save();
    res.status(201).json(operarioGuardado);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Obtener todos los operarios
const obtenerOperarios = async (req, res) => {
  const { page = 1, limit = 10, search } = req.query;
  // REMOVED: console.log('Parámetro search recibido:', search);
  const query = search ? { name: { $regex: search, $options: 'i' } } : {};
  // REMOVED: console.log('Consulta construida:', query);
  try {
      const totalResults = await Operario.countDocuments(query);
      const operarios = await Operario.find(query)
          .sort({ name: 1 })
          .skip((page - 1) * limit)
          .limit(Number(limit));
      // REMOVED: console.log('Operarios encontrados:', operarios.length);
      res.json({
          operarios,
          totalPages: Math.ceil(totalResults / limit),
          currentPage: Number(page),
          totalResults: totalResults,
      });
  } catch (error) {
      console.error('Error al obtener operarios:', error);
      res.status(500).json({ message: error.message });
  }
};
// Obtener un operario por ID
const obtenerOperario = async (req, res) => {
  try {
    const operario = await Operario.findById(req.params.id);
    if (!operario) {
      return res.status(404).json({ message: 'Operario no encontrado' });
    }
    res.json(operario);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Actualizar un operario por ID
const actualizarOperario = async (req, res) => {
  try {
    const operarioActualizado = await Operario.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true } // 'new: true' devuelve el documento actualizado
    );
    if (!operarioActualizado) {
      return res.status(404).json({ message: 'Operario no encontrado' });
    }
    res.json(operarioActualizado);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Eliminar un operario por ID
const eliminarOperario = async (req, res) => {
  try {
    const operarioEliminado = await Operario.findByIdAndDelete(req.params.id);
    if (!operarioEliminado) {
      return res.status(404).json({ message: 'Operario no encontrado' });
    }
    res.json({ message: 'Operario eliminado' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  validateCedula,
  crearOperario,
  obtenerOperarios,
  obtenerOperario,
  actualizarOperario,
  eliminarOperario,
};

