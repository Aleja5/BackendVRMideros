const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // Puedes cambiar a Outlook, Yahoo, etc.
  auth: {
    user: process.env.EMAIL_USER, // Configura estas variables en tu .env
    pass: process.env.EMAIL_PASS
  }
});

const sendResetPasswordEmail = async (to, resetToken) => {
  const resetLink = `http://localhost:3000/reset-password/${resetToken}`; // Ajusta la URL según tu frontend

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Recuperar contraseña',
    html: `
      <p>Hola,</p>
      <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Si no solicitaste este correo, ignóralo.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendResetPasswordEmail };
