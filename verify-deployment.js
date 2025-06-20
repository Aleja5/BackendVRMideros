#!/usr/bin/env node

// Verificación post-despliegue para https://vr-mideros-backend.onrender.com
// Ejecutar con: node verify-deployment.js

const https = require('https');
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

const BASE_URL = 'https://vr-mideros-backend.onrender.com';

const tests = [
    {
        name: 'Health Check',
        path: '/api/health',
        method: 'GET',
        expectedStatus: 200,
        checkResponse: (data) => {
            const json = JSON.parse(data);
            return json.status === 'OK' && json.services?.database === 'OK';
        }
    },
    {
        name: 'Operarios List',
        path: '/api/operarios',
        method: 'GET',
        expectedStatus: 200,
        checkResponse: (data) => {
            const json = JSON.parse(data);
            return json.operarios && Array.isArray(json.operarios);
        }
    },
    {
        name: 'Auth Login Endpoint',
        path: '/api/auth/login',
        method: 'POST',
        expectedStatus: 400, // Sin credenciales debería dar 400
        checkResponse: (data) => {
            return data.includes('email') || data.includes('password') || data.includes('invalid');
        }
    },
    {
        name: 'Production Data',
        path: '/api/produccion',
        method: 'GET',
        expectedStatus: [200, 401], // Puede requerir auth
        checkResponse: () => true // Solo verificamos que responda
    },
    {
        name: 'Machines Endpoint',
        path: '/api/maquinas',
        method: 'GET',
        expectedStatus: [200, 401],
        checkResponse: () => true
    },
    {
        name: 'Areas Endpoint',
        path: '/api/areas',
        method: 'GET',
        expectedStatus: [200, 401],
        checkResponse: () => true
    }
];

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Deploy-Verification/1.0'
            },
            timeout: 15000
        };

        const req = https.request(url, options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    data: responseData,
                    headers: res.headers
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data && method === 'POST') {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function runTest(test) {
    try {
        const result = await makeRequest(test.path, test.method);
        
        // Verificar status code
        const expectedStatuses = Array.isArray(test.expectedStatus) 
            ? test.expectedStatus 
            : [test.expectedStatus];
        
        const statusOK = expectedStatuses.includes(result.status);
        
        // Verificar respuesta si hay función de verificación
        const responseOK = test.checkResponse ? test.checkResponse(result.data) : true;
        
        return {
            name: test.name,
            success: statusOK && responseOK,
            status: result.status,
            error: null,
            responseSize: result.data.length,
            details: statusOK ? 'OK' : `Expected ${test.expectedStatus}, got ${result.status}`
        };
        
    } catch (error) {
        return {
            name: test.name,
            success: false,
            status: 'ERROR',
            error: error.message,
            details: error.message
        };
    }
}

async function main() {
    console.log(`${colors.bold}${colors.blue}🚀 Verificando despliegue en Render${colors.reset}`);
    console.log(`${colors.blue}URL: ${BASE_URL}${colors.reset}`);
    console.log('=' * 70);
    
    const results = [];
    
    for (const test of tests) {
        process.stdout.write(`${colors.yellow}Testing ${test.name}...${colors.reset} `);
        
        const result = await runTest(test);
        results.push(result);
        
        if (result.success) {
            console.log(`${colors.green}✅ ${result.status} (${result.responseSize} bytes)${colors.reset}`);
        } else {
            console.log(`${colors.red}❌ ${result.status} - ${result.details}${colors.reset}`);
        }
    }
    
    console.log('=' * 70);
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    
    if (successCount === totalCount) {
        console.log(`${colors.green}${colors.bold}🎉 ¡Todos los tests pasaron! (${successCount}/${totalCount})${colors.reset}`);
        console.log(`${colors.green}✅ Tu backend está funcionando correctamente en producción${colors.reset}`);
    } else {
        console.log(`${colors.yellow}⚠️ Algunos tests fallaron (${successCount}/${totalCount})${colors.reset}`);
        
        const failedTests = results.filter(r => !r.success);
        console.log(`${colors.red}Tests fallidos:${colors.reset}`);
        failedTests.forEach(test => {
            console.log(`  - ${test.name}: ${test.details}`);
        });
    }
    
    console.log('\n' + colors.blue + '📋 URLs importantes:' + colors.reset);
    console.log(`  🔍 Health Check: ${BASE_URL}/api/health`);
    console.log(`  🔐 Login: ${BASE_URL}/api/auth/login`);
    console.log(`  👥 Operarios: ${BASE_URL}/api/operarios`);
    console.log(`  🏭 Producción: ${BASE_URL}/api/produccion`);
}

if (require.main === module) {
    main().catch(console.error);
}
