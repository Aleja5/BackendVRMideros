// Test CORS desde el navegador - Pega esto en la consola de tu frontend

console.log('🧪 Testing CORS...');

// Test 1: Preflight request manual
fetch('https://vr-mideros-backend.onrender.com/api/auth/login', {
    method: 'OPTIONS',
    headers: {
        'Origin': window.location.origin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
    }
})
.then(response => {
    console.log('✅ Preflight Status:', response.status);
    console.log('✅ Headers:', [...response.headers.entries()]);
    return response;
})
.catch(error => {
    console.log('❌ Preflight Error:', error);
});

// Test 2: Actual POST request
setTimeout(() => {
    fetch('https://vr-mideros-backend.onrender.com/api/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: 'test@test.com',
            password: 'test123'
        })
    })
    .then(response => {
        console.log('✅ POST Status:', response.status);
        return response.text();
    })
    .then(data => {
        console.log('✅ POST Response:', data);
    })
    .catch(error => {
        console.log('❌ POST Error:', error);
    });
}, 2000);

// Test 3: Health check (should always work)
setTimeout(() => {
    fetch('https://vr-mideros-backend.onrender.com/api/health')
    .then(response => response.json())
    .then(data => {
        console.log('✅ Health Check:', data);
    })
    .catch(error => {
        console.log('❌ Health Check Error:', error);
    });
}, 4000);
