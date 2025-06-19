const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
    login,
    forgotPassword,
    resetPassword,
    refreshToken,
    logout,
} = require('../controllers/authControllers');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Datos de entrada inválidos',
            errors: errors.array()
        });
    }
    next();
};

const router = express.Router();

// Validaciones para login
const loginValidation = [
    body('email').isEmail().withMessage('Email debe ser válido'),
    body('password').isLength({ min: 6 }).withMessage('Password debe tener al menos 6 caracteres')
];

// Validaciones para forgot password
const forgotPasswordValidation = [
    body('email').isEmail().withMessage('Email debe ser válido')
];

// Validaciones para reset password
const resetPasswordValidation = [
    body('password').isLength({ min: 6 }).withMessage('Password debe tener al menos 6 caracteres'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Las contraseñas no coinciden');
        }
        return true;
    })
];

// Ruta de login
router.post('/login', loginValidation, handleValidationErrors, login);

// Ruta para enviar el correo de recuperacion
router.post('/forgot-password', forgotPasswordValidation, handleValidationErrors, forgotPassword);

// Ruta para restablecer la contraseña
router.post('/reset-password', resetPasswordValidation, handleValidationErrors, resetPassword);

// Nueva ruta para refresh token
router.post('/refresh-token', refreshToken);

// Nueva ruta para logout mejorado
router.post('/logout', logout);

module.exports = router;