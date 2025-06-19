const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Obtener todos los usuarios con paginación y búsqueda
// @route   GET /api/usuarios
// @access  Public (o según tu autenticación)
const obtenerUsuarios = async (req, res) => {
    // Parámetros de paginación y búsqueda desde la query string
    const { page = 1, limit = 10, search } = req.query;
    const query = {}; // Objeto de consulta para MongoDB

    // Si hay un término de búsqueda, construye la query con expresiones regulares case-insensitive
    if (search) {
        query.$or = [
            { nombre: { $regex: search, $options: 'i' } }, // Busca por nombre
            { email: { $regex: search, $options: 'i' } }   // Busca por email
        ];
    }

    try {
        // Contar el total de documentos que coinciden con la query
        const totalResults = await User.countDocuments(query);
          // Obtener los usuarios para la página actual, ordenados y con límite
        const usuarios = await User.find(query)
            .select('-password') // Excluir la contraseña de la respuesta
            .sort({ nombre: 1 }) // Ordena por nombre ascendente
            .skip((Number(page) - 1) * Number(limit)) // Calcula el offset para la paginación
            .limit(Number(limit)); // Limita el número de resultados

        // Envía la respuesta JSON con los usuarios, total de páginas, página actual y total de resultados
        res.json({
            usuarios,
            totalPages: Math.ceil(totalResults / Number(limit)),
            currentPage: Number(page),
            totalResults: totalResults,
        });
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Obtener un usuario por ID
// @route   GET /api/usuarios/:id
// @access  Public (o según tu autenticación)
const obtenerUsuario = async (req, res) => {
    try {
        const usuario = await User.findById(req.params.id).select('-password'); // Excluir contraseña
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(usuario);
    } catch (error) {
        console.error('Error al obtener un usuario por ID:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener el usuario.' });
    }
};

// Registrar un nuevo usuario
const Registrar = async (req, res) => {
    // Desestructura los datos del cuerpo de la solicitud
    const { nombre, email, password, role } = req.body;

    try {
        // --- Validaciones de entrada ---
        if (!nombre || !email || !password || !role) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
        }

        // Validar que el nombre tenga una longitud mínima
        if (nombre.trim().length < 2) {
            return res.status(400).json({ message: 'El nombre debe tener al menos 2 caracteres.' });
        }

        // Validar formato de email
        if (!/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({ message: 'Formato de correo electrónico inválido.' });
        }

        // Validar longitud de contraseña
        if (password.length < 6) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        // Validar roles permitidos
        const rolesPermitidos = ['admin', 'operario', 'supervisor', 'usuario'];
        if (!rolesPermitidos.includes(role)) {
            return res.status(400).json({ message: 'Rol no válido. Los roles permitidos son: ' + rolesPermitidos.join(', ') });
        }

        // Verificar si el correo electrónico ya está registrado
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
        }// Crear nuevo usuario con la contraseña sin hashear
        // El middleware pre('save') en el modelo User se encargará de hashear la contraseña
        user = new User({
            nombre,
            email,
            password, // La contraseña se hasheará automáticamente
            role
        });

        await user.save(); // Guarda el nuevo usuario en la base de datos

        // Envía una respuesta de éxito con los datos del usuario (sin la contraseña)
        res.status(201).json({ 
            message: 'Usuario registrado exitosamente', 
            user: {
                _id: user._id,
                nombre: user.nombre,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar el usuario.' });
    }
};

// @desc    Actualizar un usuario
// @route   PUT /api/usuarios/:id

//Actualizar un usuario
const actualizarUsuario = async (req, res) => {
    const { id } = req.params;
    // Desestructura los campos que podrían ser actualizados
    const { nombre, email, password, role } = req.body; 

    try {
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }        // Validar formato de email si se proporciona
        if (email && !/\S+@\S+\.\S+/.test(email)) {
            return res.status(400).json({ message: 'Formato de correo electrónico inválido.' });
        }

        // Validar que el nombre tenga una longitud mínima si se proporciona
        if (nombre && nombre.trim().length < 2) {
            return res.status(400).json({ message: 'El nombre debe tener al menos 2 caracteres.' });
        }

        // Validar roles permitidos si se proporciona
        if (role) {
            const rolesPermitidos = ['admin', 'operario', 'supervisor', 'usuario'];
            if (!rolesPermitidos.includes(role)) {
                return res.status(400).json({ message: 'Rol no válido. Los roles permitidos son: ' + rolesPermitidos.join(', ') });
            }
        }

        // Verificar si el nuevo email ya está en uso por otro usuario
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'El correo electrónico ya está registrado por otro usuario.' });
            }
        }

        // Actualizar campos si se proporcionan en la solicitud
        if (nombre !== undefined) user.nombre = nombre;
        if (email !== undefined) user.email = email;
        if (role !== undefined) user.role = role;
        
        // Manejar actualización de contraseña solo si se proporciona una nueva contraseña
        if (password) { 
            if (password.length < 6) {
                return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            }
            // Solo asignamos la contraseña, el middleware pre('save') se encarga del hash
            user.password = password;
        }

        await user.save(); // Guarda los cambios del usuario

        // Envía una respuesta con los datos del usuario actualizado (sin la contraseña)
        res.json({
            message: 'Usuario actualizado exitosamente',
            user: {
                _id: user._id,
                nombre: user.nombre,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Error al actualizar el usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al actualizar el usuario.' });
    }
};

// @desc    Eliminar un usuario
// @route   DELETE /api/usuarios/:id
// @access  Public (o según tu autenticación)

// Eliminar un usuario
const eliminarUsuario = async (req, res) => {
    try {
        const usuario = await User.findByIdAndDelete(req.params.id);
        if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar el usuario:', error);
        res.status(500).json({ message: 'Error interno del servidor al eliminar el usuario.' });
    }
};


// Exporta todas las funciones del controlador
module.exports = {
    obtenerUsuarios,
    obtenerUsuario,
    Registrar,
    actualizarUsuario,
    eliminarUsuario
};

