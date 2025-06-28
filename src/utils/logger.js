/**
 * Logger utilitario para manejar logs según el entorno
 */

const winston = require('winston');
const path = require('path');

// Configurar Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'vrm-production-system' },
  transports: [
    // Escribir logs de error a archivo
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error' 
    }),
    // Escribir todos los logs a archivo combinado
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log') 
    }),
  ],
});

// En desarrollo, también log a consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Funciones de logging seguras
const safeLog = {
  info: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      // REMOVED: console.log(`ℹ️ ${message}`, meta);
    }
    logger.info(message, meta);
  },
  
  warn: (message, meta = {}) => {
    console.warn(`⚠️ ${message}`, meta);
    logger.warn(message, meta);
  },
  
  error: (message, meta = {}) => {
    console.error(`❌ ${message}`, meta);
    logger.error(message, meta);
  },
  
  success: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      // REMOVED: console.log(`✅ ${message}`, meta);
    }
    logger.info(`SUCCESS: ${message}`, meta);
  },
  
  debug: (message, meta = {}) => {
    if (process.env.NODE_ENV !== 'production') {
      // REMOVED: console.log(`🔍 ${message}`, meta);
    }
    logger.debug(message, meta);
  }
};

module.exports = { logger, safeLog };
