const express = require('express');
const { protect, authorize } = require('../middleware/authMiddleware');
const { getAllProduccion } = require('../controllers/productionController');
const { getDashboardKpi } = require('../controllers/dashboardController');


const router = express.Router();



// Ruta protegida para el admin dashboard
router.get('/admin-dashboard', protect, authorize('admin'), (req, res) => {
    res.status(200).json({ message: 'Bienvenido al panel de administrador' });
});

router.get('/admin-producciones', protect, authorize('admin'), getAllProduccion); 

// Ruta para obtener KPIs del dashboard
router.get('/dashboard/kpi', protect, authorize('admin'), getDashboardKpi);


module.exports = router;