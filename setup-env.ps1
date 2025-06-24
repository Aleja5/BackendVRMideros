Write-Host "🔧 Configuración de variables de entorno para Backend" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si estamos en el directorio correcto
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: No se encuentra el archivo .env" -ForegroundColor Red
    Write-Host "💡 Asegúrate de estar en el directorio backend" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Variables de entorno requeridas:" -ForegroundColor White
Write-Host ""

Write-Host "1️⃣  MONGO_URI (Base de datos MongoDB)" -ForegroundColor Yellow
Write-Host "   Formato: mongodb+srv://usuario:password@cluster.mongodb.net/database" -ForegroundColor Gray
Write-Host "   Ejemplo: mongodb+srv://miuser:mipass123@cluster0.abc123.mongodb.net/vrapp" -ForegroundColor Gray
Write-Host ""

$mongoUri = Read-Host "   Ingresa tu MONGO_URI"
if ($mongoUri) {
    $content = Get-Content ".env" -Raw
    $newContent = $content -replace "MONGO_URI=.*", "MONGO_URI=$mongoUri"
    Set-Content ".env" $newContent -NoNewline
    Write-Host "   ✅ MONGO_URI configurado" -ForegroundColor Green
}

Write-Host ""
Write-Host "2️⃣  JWT_SECRET (Clave secreta para tokens)" -ForegroundColor Yellow
Write-Host "   Puedes generar uno seguro en: https://generate-secret.vercel.app/64" -ForegroundColor Gray
Write-Host "   O usar el que está por defecto para desarrollo local" -ForegroundColor Gray
Write-Host ""

$useDefault = Read-Host "   ¿Usar el JWT_SECRET por defecto para desarrollo? (s/n)"
if ($useDefault -eq "n" -or $useDefault -eq "N") {
    $jwtSecret = Read-Host "   Ingresa tu JWT_SECRET (mínimo 64 caracteres)"
    if ($jwtSecret -and $jwtSecret.Length -ge 64) {
        $content = Get-Content ".env" -Raw
        $newContent = $content -replace "JWT_SECRET=.*", "JWT_SECRET=$jwtSecret"
        Set-Content ".env" $newContent -NoNewline
        Write-Host "   ✅ JWT_SECRET configurado" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  JWT_SECRET debe tener al menos 64 caracteres. Usando el por defecto." -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✅ Usando JWT_SECRET por defecto para desarrollo" -ForegroundColor Green
}

Write-Host ""
Write-Host "🔍 Verificando configuración..." -ForegroundColor Cyan

# Mostrar el archivo .env (sin mostrar secrets completos por seguridad)
$envContent = Get-Content ".env"
Write-Host ""
Write-Host "📄 Archivo .env configurado:" -ForegroundColor White
foreach ($line in $envContent) {
    if ($line -match "^(MONGO_URI|JWT_SECRET)=(.+)") {
        $key = $matches[1]
        $value = $matches[2]
        if ($value -like "*tu_*" -or $value -like "*reemplaza*") {
            Write-Host "   ❌ $key = [NO CONFIGURADO]" -ForegroundColor Red
        } else {
            $maskedValue = $value.Substring(0, [Math]::Min(10, $value.Length)) + "..."
            Write-Host "   ✅ $key = $maskedValue" -ForegroundColor Green
        }
    } elseif ($line -and -not $line.StartsWith("#")) {
        Write-Host "   ✅ $line" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "🚀 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. cd 'c:\Users\VR Mideros\Desktop\VR-app\backend'" -ForegroundColor Gray
Write-Host "   2. npm run dev" -ForegroundColor Gray
Write-Host "   3. Verificar que aparezca: '✅ Conectado a MongoDB'" -ForegroundColor Gray
Write-Host ""

$startNow = Read-Host "¿Quieres iniciar el servidor backend ahora? (s/n)"
if ($startNow -eq "s" -or $startNow -eq "S") {
    Write-Host "🚀 Iniciando servidor backend..." -ForegroundColor Green
    npm run dev
}
