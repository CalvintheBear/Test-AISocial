# 测试认证中间件的PowerShell脚本
$base = "http://127.0.0.1:8787"

Write-Host "=== 认证测试开始 ===" -ForegroundColor Green

# 1. 无认证测试
Write-Host "1. 无认证测试..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$base/api/feed" -Method GET -SkipHttpErrorCheck
$status = $response.StatusCode
if ($status -eq 401) {
    Write-Host "   ✅ 无认证返回401" -ForegroundColor Green
} else {
    Write-Host "   ❌ 无认证返回$status，期望401" -ForegroundColor Red
}

# 2. 无效token测试
Write-Host "2. 无效token测试..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$base/api/feed" -Method GET -Headers @{ "Authorization" = "Bearer invalid-token" } -SkipHttpErrorCheck
    Write-Host "   ❌ 无效token返回200，期望401" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   ✅ 无效token返回401" -ForegroundColor Green
    } else {
        Write-Host "   ❌ 无效token返回$($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# 3. 健康检查（应无需认证）
Write-Host "3. 健康检查测试..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$base/api/health" -Method GET -SkipHttpErrorCheck
$status = $response.StatusCode
if ($status -eq 200) {
    Write-Host "   ✅ 健康检查返回200" -ForegroundColor Green
} else {
    Write-Host "   ❌ 健康检查返回$status，期望200" -ForegroundColor Red
}

Write-Host "=== 认证测试完成 ===" -ForegroundColor Green