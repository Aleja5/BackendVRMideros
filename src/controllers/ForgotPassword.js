import React, { useState } from 'react';
import axiosInstance from '../../../frontend/src/utils/axiosInstance'; // Asegúrate de que esta ruta esté bien configurada
import { useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email) {
      setError('Por favor, ingresa un correo electrónico');
      setLoading(false);
      return;
    }

    try {
      const response = await axiosInstance.post('/auth/forgot-password', { email });
      setMessage(response.data.message);
      setLoading(false);
      setTimeout(() => navigate('/login'), 3000); // Redirige después de 3 segundos
    } catch (err) {
      setError('No se pudo enviar el enlace de restablecimiento');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-white">
      <div className="flex flex-col justify-center w-full p-8 md:p-20">
        <h1 className="text-4xl font-bold mb-6 text-white text-center">Restablecer Contraseña</h1>

        {message && <div className="text-green-500 text-sm text-center mb-4">{message}</div>}
        {error && <div className="text-red-500 text-sm text-center mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Correo electrónico"
              className="w-full pl-4 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition duration-200 flex justify-center"
          >
            {loading ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-blue-400 hover:underline">
            Volver a la página de inicio de sesión
          </a>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
