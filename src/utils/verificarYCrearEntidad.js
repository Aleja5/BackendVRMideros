const Oti = require('../models/Oti');

const verificarYCrearOti = async (valor) => {
  if (!valor || typeof valor !== 'string') return null;

  try {
    let existente = await Oti.findOne({ numeroOti: valor });

    if (!existente) {
      existente = await Oti.create({ numeroOti: valor });
    }

    return existente._id; // <- ESTO es lo que espera Producción
  } catch (err) {
    console.error('Error en verificarYCrearOti:', err);
    throw err;
  }
};

module.exports = verificarYCrearOti;
