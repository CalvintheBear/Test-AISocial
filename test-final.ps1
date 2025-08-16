# Final validation script using curl
Write-Host "=== Auth Production Hardening Final Validation ===" -ForegroundColor Green

# Test 1: No auth header should return 401
Write-Host "Test 1: No Authorization header" -ForegroundColor Yellow
$result = curl -s -w "%{http_code}" http://127.0.0.1:8787/api/feed | tail -1
if ($result -like "*401*") {
    Write-Host "✅ PASSED: Returns 401 without JWT" -ForegroundColor Green
} else {
    Write-Host "❌ FAILED: Expected 401" -ForegroundColor Red
}

# Test 2: Health check should work without auth
Write-Host "Test 2: Health check" -ForegroundColor Yellow
$result = curl -s -w "%{http_code}" http://127.0.0.1:8787/api/health | tail -1
if ($result -like "*200*") {
    Write-Host "✅ PASSED: Health check accessible" -ForegroundColor Green
} else {
    Write-Host "❌ FAILED: Health check should return 200" -ForegroundColor Red
}

# Test 3: Invalid token should return 401
Write-Host "Test 3: Invalid JWT" -ForegroundColor Yellow
$result = curl -H "Authorization: Bearer invalid-token" -s -w "%{http_code}" http://127.0.0.1:8787/api/feed | tail -1
if ($result -like "*401*") {
    Write-Host "✅ PASSED: Invalid JWT returns 401" -ForegroundColor Green
} else {
    Write-Host "❌ FAILED: Invalid JWT should return 401" -ForegroundColor Red
}

Write-Host "=== Validation Complete ===" -ForegroundColor Green