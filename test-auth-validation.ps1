# PowerShell validation script for auth production hardening task
$base = "http://127.0.0.1:8787"

Write-Host "=== Auth Production Hardening Validation ===" -ForegroundColor Green

# Test 1: No Authorization header should return 401
try {
    $response = Invoke-RestMethod -Uri "$base/api/feed" -ErrorAction Stop
    Write-Host "❌ Test 1 FAILED: Expected 401 but got 200" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode
    if ($statusCode -eq 401) {
        Write-Host "✅ Test 1 PASSED: No JWT returns 401" -ForegroundColor Green
    } else {
        Write-Host "❌ Test 1 FAILED: Expected 401 but got $statusCode" -ForegroundColor Red
    }
}

# Test 2: Health check should be accessible without auth
try {
    $response = Invoke-RestMethod -Uri "$base/api/health" -ErrorAction Stop
    Write-Host "✅ Test 2 PASSED: Health check accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Test 2 FAILED: Health check should be accessible" -ForegroundColor Red
}

# Test 3: Test with valid JWT (using dev token for testing)
try {
    $headers = @{"Authorization" = "Bearer dev-token"}
    $response = Invoke-RestMethod -Uri "$base/api/feed" -Headers $headers -ErrorAction Stop
    Write-Host "✅ Test 3 PASSED: Valid JWT returns 200" -ForegroundColor Green
} catch {
    $statusCode = $_.Exception.Response.StatusCode
    Write-Host "❌ Test 3 FAILED: Valid JWT got $statusCode" -ForegroundColor Red
}

Write-Host "=== Validation Complete ===" -ForegroundColor Green