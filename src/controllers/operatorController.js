const Operario = require("../models/Operario");
const { verificarIntegridadReferencial, obtenerRegistrosAfectados } = require('../utils/integridadReferencial');

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
  const { page = 1, limit = 10, search, estado = 'activo' } = req.query;
  
  let query = {};
  
  // Solo filtrar por estado si no es "todos"
  if (estado !== 'todos') {
    query.estado = estado;
  }
  
  if (search) {
    query.name = { $regex: search, $options: 'i' };
  }
  
  try {
      const totalResults = await Operario.countDocuments(query);
      const operarios = await Operario.find(query)
          .sort({ name: 1 })
          .skip((page - 1) * limit)
          .limit(Number(limit));
      
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
    const { id } = req.params;
    
    // Verificar si el operario existe
    const operario = await Operario.findById(id);
    if (!operario) {
      return res.status(404).json({ message: 'Operario no encontrado' });
    }

    // Verificar si el operario tiene registros de producción asociados
    const Produccion = require('../models/Produccion');
    const registrosProduccion = await Produccion.countDocuments({ operario: id });
    
    if (registrosProduccion > 0) {
      return res.status(409).json({ 
        message: 'No se puede eliminar el operario porque tiene registros de producción asociados',
        conflicto: 'integridad_referencial',
        detalles: {
          entidad: 'operario',
          registrosAfectados: registrosProduccion,
          sugerencia: 'Primero elimine o reasigne los registros de producción asociados'
        }
      });
    }

    // Si no hay registros asociados, proceder con la eliminación
    const operarioEliminado = await Operario.findByIdAndDelete(id);
    res.json({ 
      message: 'Operario eliminado exitosamente',
      operario: operarioEliminado
    });
  } catch (error) {
    console.error('Error al eliminar operario:', error);
    res.status(500).json({ message: error.message });
  }
};

// Verificar integridad referencial antes de eliminar
const verificarIntegridadOperario = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si el operario existe
        const operario = await Operario.findById(id);
        if (!operario) {
            return res.status(404).json({ message: 'Operario no encontrado' });
        }

        // Verificar integridad referencial
        const verificacion = await verificarIntegridadReferencial(id, 'operario', operario.name);
        
        if (!verificacion.puedeEliminar) {
            // Obtener algunos registros afectados para mostrar detalles
            const registrosAfectados = await obtenerRegistrosAfectados(id, 'operario', 5);
            
            return res.status(200).json({
                puedeEliminar: false,
                mensaje: verificacion.mensaje,
                detalles: verificacion.detalles,
                registrosAfectados,
                totalRegistros: verificacion.registrosAfectados
            });
        }

        res.status(200).json({
            puedeEliminar: true,
            mensaje: verificacion.mensaje,
            operario: {
                id: operario._id,
                name: operario.name,
                cedula: operario.cedula
            }
        });

    } catch (error) {
        console.error('Error verificando integridad del operario:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Cambiar estado de un operario (activo/inactivo)
const cambiarEstadoOperario = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    // Validar que el estado sea válido
    if (!['activo', 'inactivo'].includes(estado)) {
      return res.status(400).json({ 
        message: 'Estado inválido. Debe ser "activo" o "inactivo"' 
      });
    }

    const operarioActualizado = await Operario.findByIdAndUpdate(
      id,
      { estado },
      { new: true, runValidators: true }
    );

    if (!operarioActualizado) {
      return res.status(404).json({ message: 'Operario no encontrado' });
    }

    res.json({
      message: `Operario marcado como ${estado} exitosamente`,
      operario: operarioActualizado
    });
  } catch (error) {
    console.error('Error al cambiar estado del operario:', error);
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
  verificarIntegridadOperario,
  cambiarEstadoOperario,
};

