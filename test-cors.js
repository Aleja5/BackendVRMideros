#!/usr/bin/env node

// Test CORS configuration
// Ejecutar con: node test-cors.js

const https = require('https');

const BACKEND_URL = 'https://vr-mideros-backend.onrender.com';
const FRONTEND_URL = 'https://685583e92141020008646547--vrmideros.netlify.app';

function testCors(origin) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'vr-mideros-backend.onrender.com',
            port: 443,
            path: '/api/health',
            method: 'OPTIONS',
            headers: {
                'Origin': origin,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type, Authorization'
            }
        };

        const req = https.request(options, (res) => {
            const allowOrigin = res.headers['access-control-allow-origin'];
            const allowMethods = res.headers['access-control-allow-methods'];
            const allowHeaders = res.headers['access-control-allow-headers'];
            
            resolve({
                origin,
                status: res.statusCode,
                allowOrigin,
                allowMethods,
                allowHeaders,
                success: res.statusCode === 200 && (allowOrigin === origin || allowOrigin === '*')
            });
        });

        req.on('error', (error) => {
            reject({ origin, error: error.message });
        });

        req.end();
    });
}

async function testAllOrigins() {
    const originsToTest = [
        'https://vrmideros.netlify.app',
        'https://vr-mideros.netlify.app',
        'https://685583e92141020008646547--vrmideros.netlify.app',
        'http://localhost:5173',
        'http://localhost:3000'
    ];

    console.log('🧪 Testing CORS configuration...\n');

    for (const origin of originsToTest) {
        try {
            const result = await testCors(origin);
            
            if (result.success) {
                console.log(`✅ ${origin}`);
                console.log(`   Status: ${result.status}`);
                console.log(`   Allow-Origin: ${result.allowOrigin || 'Not set'}`);
            } else {
                console.log(`❌ ${origin}`);
                console.log(`   Status: ${result.status}`);
                console.log(`   Allow-Origin: ${result.allowOrigin || 'Not set'}`);
            }
            console.log('');
        } catch (error) {
            console.log(`❌ ${error.origin} - Error: ${error.error}\n`);
        }
    }

    // Test actual POST request
    console.log('🔄 Testing actual POST request...');
    try {
        const postResult = await testPostRequest();
        console.log(`✅ POST request: ${postResult.status} - CORS working!`);
    } catch (error) {
        console.log(`❌ POST request failed: ${error.message}`);
    }
}

function testPostRequest() {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            email: 'test@test.com',
            password: 'test123'
        });

        const options = {
            hostname: 'vr-mideros-backend.onrender.com',
            port: 443,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'https://685583e92141020008646547--vrmideros.netlify.app',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    data: responseData
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

if (require.main === module) {
    testAllOrigins().catch(console.error);
}
