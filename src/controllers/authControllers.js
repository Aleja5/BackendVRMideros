const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { safeLog } = require('../utils/logger');
require('dotenv').config();

// Configuración del transporte de correo
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// ------------------ LOGIN ------------------
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ message: 'Correo electrónico y contraseña son obligatorios' });
        }

    const emailToSearch = email.toLowerCase().trim();
    
    // Solo log de desarrollo
    if (process.env.NODE_ENV !== 'production') {
        // REMOVED: console.log('🔍 Intento de login para:', emailToSearch);
    }
    
    const user = await User.findOne({ email: emailToSearch });

    if (!user) {
      console.warn(`⚠️ Intento de login fallido: usuario no encontrado - ${emailToSearch}`);
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    // Comparar la contraseña recibida con la almacenada en la base de datos
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.warn(`⚠️ Intento de login fallido: credenciales inválidas - ${emailToSearch}`);
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }    // Crear el token JWT para la sesión (15 minutos)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    // Crear refresh token (8 horas - duración de jornada laboral)
    const refreshToken = jwt.sign(
      { id: user._id, role: user.role, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '8h' }
    );

    // Guardar refresh token en el usuario (para invalidación)
    user.refreshToken = refreshToken;
    user.lastActivity = new Date();
    await user.save();

    // REMOVED: console.log(`✅ Login exitoso: ${user.email} (${user.role})`);
    
    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      refreshToken, // Nuevo: enviar refresh token
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
      },
      redirect: user.role === 'admin' ? '/admin-home' : '/validate-cedula',
    });
  } catch (error) {
    console.error('❌ Error en el servidor (login):', error.message);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// ------------------ FORGOT PASSWORD ------------------
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Correo electrónico inválido' });
    }    const user = await User.findOne({ email });
    
    if (!user) {
      console.warn(`⚠️ Intento de recuperación: usuario no encontrado - ${email}`);
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    // Generar token y hash para almacenar en DB
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hora
    await user.save({ validateBeforeSave: false });

    // Construir el enlace de reset - asegurar que FRONTEND_URL esté configurada
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

    // REMOVED: console.log(`🔗 Enlace de reset generado: ${resetLink}`);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Recuperación de contraseña - VR Mideros',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Recuperación de contraseña</h2>
                    <p>Hola,</p>
                    <p>Hemos recibido una solicitud para restablecer tu contraseña en VR Mideros.</p>
                    <p>Haz clic en el siguiente botón para restablecer tu contraseña:</p>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" 
                           style="background-color: #3B82F6; color: white; padding: 12px 24px; 
                                  text-decoration: none; border-radius: 6px; display: inline-block;">
                            Restablecer Contraseña
                        </a>
                    </p>
                    <p>O copia y pega este enlace en tu navegador:</p>
                    <p style="color: #666; word-break: break-all;">${resetLink}</p>
                    <p style="color: #999; font-size: 14px;">
                        Este enlace expirará en 1 hora por seguridad.<br>
                        Si no solicitaste este correo, puedes ignorarlo.
                    </p>
                </div>
            `,
        };

    if (process.env.NODE_ENV !== 'production') {
        // REMOVED: console.log('📧 Enviando correo de recuperación a:', email);
    }

    await transporter.sendMail(mailOptions);
    
    // REMOVED: console.log(`✅ Correo de recuperación enviado a: ${email}`);

        res.status(200).json({
            message: 'Correo de recuperación de contraseña enviado.',
        });
    } catch (error) {
        console.error('Error en forgotPassword:', error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
};

// ------------------ RESET PASSWORD ------------------
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validar que el token y la nueva contraseña existan
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token y nueva contraseña son obligatorios' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    // Hashear el token recibido para buscarlo en la base de datos
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }, // Verificar si el token no ha expirado
    });

    if (!user) {
      console.warn('⚠️ Intento de reset con token inválido o expirado');
      return res.status(400).json({ message: 'Token inválido o expirado' });
    }

    // Solo asignar la nueva contraseña, el middleware pre('save') se encarga del hash
    user.password = newPassword;

    // Limpiar los campos de token
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save({ validateBeforeSave: false });
    
    // REMOVED: console.log(`✅ Contraseña restablecida exitosamente para: ${user.email}`);

    res.status(200).json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error en resetPassword:', error.message);
    res.status(500).json({ message: 'Error del servidor al restablecer la contraseña' });
  }
};

// ------------------ REFRESH TOKEN ------------------
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token requerido' });
    }

    // Verificar refresh token
    const decoded = jwt.verify(
      refreshToken, 
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ message: 'Token inválido' });
    }

    // Buscar usuario
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Refresh token inválido' });
    }

    // Crear nuevo access token
    const newToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );

    // Crear nuevo refresh token (rotación para mayor seguridad)
    const newRefreshToken = jwt.sign(
      { id: user._id, role: user.role, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '8h' }
    );

    // Actualizar en base de datos
    user.refreshToken = newRefreshToken;
    user.lastActivity = new Date();
    await user.save();

    // REMOVED: console.log(`🔄 Token renovado para: ${user.email}`);

    res.json({
      message: 'Token renovado exitosamente',
      token: newToken,
      refreshToken: newRefreshToken
    });

  } catch (error) {
    console.error('❌ Error renovando token:', error.message);
    res.status(401).json({ message: 'Refresh token inválido o expirado' });
  }
};

// ------------------ LOGOUT MEJORADO ------------------
exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Invalidar refresh token en base de datos
      const decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
      
      const user = await User.findById(decoded.id);
      if (user) {
        user.refreshToken = null;
        await user.save();
        // REMOVED: console.log(`🚪 Logout exitoso para: ${user.email}`);
      }
    }

    res.json({ message: 'Logout exitoso' });
  } catch (error) {
    console.error('❌ Error en logout:', error.message);
    res.json({ message: 'Logout completado' }); // Siempre permitir logout
  }
};

// No es necesario un module.exports al final si usas "exports.nombreFuncion"
// para cada función individualmente. Esto evita el ReferenceError.