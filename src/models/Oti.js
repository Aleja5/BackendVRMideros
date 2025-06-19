const mongoose = require('mongoose');

const otiSchema = new mongoose.Schema({
  numeroOti: { type: String, required: true, unique: true },
}, { timestamps: true });

module.exports = mongoose.model('Oti', otiSchema, "oti");
