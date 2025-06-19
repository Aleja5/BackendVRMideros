const mongoose = require('mongoose');

const areaProduccionSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('AreaProduccion', areaProduccionSchema, "areaProduccion");
