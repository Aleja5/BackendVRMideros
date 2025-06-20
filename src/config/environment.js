// Configuración de variables de entorno con valores por defecto
const requiredEnvVars = {
    'MONGO_URI': 'URL de conexión a MongoDB (requerida)',
    'JWT_SECRET': 'Clave secreta para JWT (requerida)',
    'NODE_ENV': 'production',
    'PORT': '3000',
    'EMAIL_USER': '',
    'EMAIL_PASS': '',
    'CORS_ORIGIN': 'https://vrmideros.netlify.app,https://vr-mideros-backend.onrender.com'
};

const validateEnvironment = () => {
    const missingVars = [];
    const criticalVars = ['MONGO_URI', 'JWT_SECRET'];
    
    criticalVars.forEach(varName => {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    });
    
    if (missingVars.length > 0) {
        console.error('❌ Variables de entorno críticas faltantes:');
        missingVars.forEach(varName => {
            console.error(`   - ${varName}: ${requiredEnvVars[varName]}`);
        });
        
        if (process.env.NODE_ENV === 'production') {
            console.error('💡 Configura estas variables en tu panel de Render');
            process.exit(1);
        } else {
            console.warn('⚠️ Algunas variables faltantes, pero continuando en desarrollo');
        }
    }
    
    // Establecer valores por defecto para variables opcionales
    Object.keys(requiredEnvVars).forEach(varName => {
        if (!process.env[varName] && requiredEnvVars[varName] !== '') {
            process.env[varName] = requiredEnvVars[varName];
        }
    });
    
    return true;
};

module.exports = {
    validateEnvironment,
    requiredEnvVars
};
