Write-Host "🔄 Configurador de entorno VR-app Backend" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si estamos en el directorio correcto
if (-not (Test-Path ".env")) {
    Write-Host "❌ Error: No se encuentra el archivo .env" -ForegroundColor Red
    Write-Host "💡 Asegúrate de estar en el directorio backend" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Variables de entorno por ambiente:" -ForegroundColor White
Write-Host ""
Write-Host "🏠 DESARROLLO LOCAL:" -ForegroundColor Yellow
Write-Host "   • FRONTEND_URL = http://localhost:5173" -ForegroundColor Gray
Write-Host "   • NODE_ENV = development" -ForegroundColor Gray
Write-Host "   • PORT = 5000" -ForegroundColor Gray
Write-Host "   • CORS_ORIGIN = http://localhost:5173" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 PRODUCCIÓN:" -ForegroundColor Yellow
Write-Host "   • FRONTEND_URL = https://vrmideros.netlify.app" -ForegroundColor Gray
Write-Host "   • NODE_ENV = production" -ForegroundColor Gray
Write-Host "   • CORS_ORIGIN = múltiples URLs de Netlify" -ForegroundColor Gray
Write-Host ""

$env = Read-Host "¿Qué entorno quieres configurar? (local/produccion)"

if ($env -eq "local" -or $env -eq "l") {
    Write-Host "🏠 Configurando para DESARROLLO LOCAL..." -ForegroundColor Green
    
    # Leer el archivo actual
    $content = Get-Content ".env" -Raw
    
    # Actualizar variables para desarrollo
    $content = $content -replace "FRONTEND_URL=.*", "FRONTEND_URL=http://localhost:5173"
    $content = $content -replace "NODE_ENV=.*", "NODE_ENV=development"
    $content = $content -replace "PORT=.*", "PORT=5000"
    $content = $content -replace "CORS_ORIGIN=.*", "CORS_ORIGIN=http://localhost:5173"
    
    # Guardar cambios
    Set-Content ".env" $content -NoNewline
    
    Write-Host "✅ Configurado para desarrollo local" -ForegroundColor Green
    Write-Host ""
    Write-Host "📝 Próximos pasos:" -ForegroundColor White
    Write-Host "   1. npm run dev" -ForegroundColor Gray
    Write-Host "   2. Verificar que el servidor inicie en puerto 5000" -ForegroundColor Gray
    Write-Host "   3. Los emails de recuperación apuntarán a localhost:5173" -ForegroundColor Gray
    
} elseif ($env -eq "produccion" -or $env -eq "p") {
    Write-Host "🌐 Configurando para PRODUCCIÓN..." -ForegroundColor Green
    
    Write-Host "⚠️  IMPORTANTE: Esta configuración es solo para referencia." -ForegroundColor Yellow
    Write-Host "    En producción (Render), las variables se configuran en el dashboard." -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "📋 Variables que debes configurar en Render:" -ForegroundColor White
    Write-Host "   FRONTEND_URL=https://vrmideros.netlify.app" -ForegroundColor Cyan
    Write-Host "   NODE_ENV=production" -ForegroundColor Cyan
    Write-Host "   CORS_ORIGIN=https://vrmideros.netlify.app,https://vr-mideros.netlify.app" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔗 Para configurar en Render:" -ForegroundColor White
    Write-Host "   1. Ve a tu dashboard de Render" -ForegroundColor Gray
    Write-Host "   2. Selecciona tu servicio backend" -ForegroundColor Gray
    Write-Host "   3. Ve a Environment → Add Environment Variable" -ForegroundColor Gray
    Write-Host "   4. Agrega las variables mostradas arriba" -ForegroundColor Gray
    
} else {
    Write-Host "❌ Opción no válida. Usa 'local' o 'produccion'" -ForegroundColor Red
}

Write-Host ""
Write-Host "💡 Recordatorio importante:" -ForegroundColor Green
Write-Host "   • FRONTEND_URL debe apuntar a donde los usuarios harán clic en los emails" -ForegroundColor Gray
Write-Host "   • En desarrollo: localhost para pruebas locales" -ForegroundColor Gray
Write-Host "   • En producción: URL real de Netlify para usuarios reales" -ForegroundColor Gray
