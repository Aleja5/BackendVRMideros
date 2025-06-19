const jwt = require('jsonwebtoken');
const User = require("../models/User");

// Middleware de protección (verifica el token y extrae el usuario u operador)
exports.protect = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
   
    if (!token) {
        return res.status(401).json({ 
            message: 'No autorizado, token no proporcionado',            
         });
    }

    try {
        // REMOVED: console.log("Token recibido en middleware:", token);

        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // REMOVED: console.log("Datos decodificados del token:", decoded);

        // Verificar si es un usuario (admin/production) o un operador (solo cédula)
        let user = await User.findById(decoded.id).select("-password");


        if (user) {
            req.user = {
                id: user._id,
                role: user.role, // Puede ser 'admin' o 'production'
                email: user.email,
            }
        } else {
            return res.status(401).json({ message: 'Usuario no encontrado' });
        }

        next();
    } catch (error) {
        console.error("Error en protect:", error);
        res.status(401).json({ message: 'Token inválido' });
    }
};

// Middleware para autorización según roles
exports.authorize = (...roles) => {
    return (req, res, next) => {       

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'No tienes permiso para realizar esta acción' });
        }

        next();
    };
};
