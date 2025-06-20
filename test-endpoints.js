// Script para validar que todos los endpoints están funcionando
// Ejecutar con: node test-endpoints.js

const https = require('https');
const http = require('http');

const BASE_URL = process.env.RENDER_URL || 'http://localhost:3000';

const endpoints = [
    { path: '/api/health', method: 'GET', description: 'Health Check' },
    { path: '/api/auth/login', method: 'POST', description: 'Login' },
    { path: '/api/operarios', method: 'GET', description: 'Operarios' },
    { path: '/api/produccion', method: 'GET', description: 'Producción' },
    { path: '/api/maquinas', method: 'GET', description: 'Máquinas' },
    { path: '/api/insumos', method: 'GET', description: 'Insumos' },
    { path: '/api/procesos', method: 'GET', description: 'Procesos' },
    { path: '/api/areas', method: 'GET', description: 'Áreas' },
    { path: '/api/usuarios', method: 'GET', description: 'Usuarios' },
    { path: '/api/jornadas', method: 'GET', description: 'Jornadas' }
];

async function testEndpoint(endpoint) {
    return new Promise((resolve) => {
        const url = new URL(endpoint.path, BASE_URL);
        const client = url.protocol === 'https:' ? https : http;
        
        const options = {
            method: endpoint.method,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Endpoint-Tester/1.0'
            }
        };

        const req = client.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    ...endpoint,
                    status: res.statusCode,
                    success: res.statusCode < 500,
                    response: data.substring(0, 100) + (data.length > 100 ? '...' : '')
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                ...endpoint,
                status: 'ERROR',
                success: false,
                error: error.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                ...endpoint,
                status: 'TIMEOUT',
                success: false,
                error: 'Request timeout'
            });
        });

        req.end();
    });
}

async function runTests() {
    console.log(`🧪 Probando endpoints en: ${BASE_URL}`);
    console.log('=' * 60);
    
    for (const endpoint of endpoints) {
        process.stdout.write(`Testing ${endpoint.description}... `);
        const result = await testEndpoint(endpoint);
        
        if (result.success) {
            console.log(`✅ ${result.status}`);
        } else {
            console.log(`❌ ${result.status} - ${result.error || 'Failed'}`);
        }
    }
    
    console.log('=' * 60);
    console.log('✅ Pruebas completadas');
}

if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { testEndpoint, runTests };
