# AI Social 端到端回归测试脚本
$base = "http://127.0.0.1:8787"
Write-Host "=== 回归测试开始 ===" -ForegroundColor Green

# 1. 健康检查
Write-Host "1. 健康检查..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$base/api/health" -Method GET
    Write-Host "   ✅ 健康检查通过: $($health | ConvertTo-Json -Depth 5)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 健康检查失败: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Redis连接测试
Write-Host "2. Redis连接测试..." -ForegroundColor Yellow
try {
    $redis = Invoke-RestMethod -Uri "$base/api/redis/ping" -Method GET
    Write-Host "   ✅ Redis连接通过: $($redis | ConvertTo-Json -Depth 5)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Redis连接失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. 无鉴权测试（应该返回401）
Write-Host "3. 无鉴权测试..." -ForegroundColor Yellow
try {
    $noAuth = Invoke-RestMethod -Uri "$base/api/feed" -Method GET
    Write-Host "   ❌ 无鉴权测试失败：期望401但得到响应" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "   ✅ 无鉴权测试通过：返回401" -ForegroundColor Green
    } else {
        Write-Host "   ❌ 无鉴权测试失败：返回$($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# 4. 有鉴权测试（DEV模式）
Write-Host "4. 有鉴权测试（DEV模式）..." -ForegroundColor Yellow
try {
    $feed = Invoke-RestMethod -Uri "$base/api/feed" -Method GET -Headers @{ "Authorization" = "Bearer dev-token" }
    Write-Host "   ✅ Feed接口通过: 返回$($feed.Count)条数据" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Feed接口失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. 用户作品测试
Write-Host "5. 用户作品测试..." -ForegroundColor Yellow
try {
    $userArtworks = Invoke-RestMethod -Uri "$base/api/users/dev-user/artworks" -Method GET -Headers @{ "Authorization" = "Bearer dev-token" }
    Write-Host "   ✅ 用户作品接口通过: 返回$($userArtworks.Count)条数据" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 用户作品接口失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. 作品详情测试
Write-Host "6. 作品详情测试..." -ForegroundColor Yellow
try {
    $artwork = Invoke-RestMethod -Uri "$base/api/artworks/test-art-1" -Method GET -Headers @{ "Authorization" = "Bearer dev-token" }
    Write-Host "   ✅ 作品详情接口通过: $($artwork.title)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 作品详情接口失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 7. 点赞/取消点赞测试
Write-Host "7. 点赞测试..." -ForegroundColor Yellow
try {
    $like = Invoke-RestMethod -Uri "$base/api/artworks/test-art-1/like" -Method POST -Headers @{ "Authorization" = "Bearer dev-token" }
    Write-Host "   ✅ 点赞接口通过: likeCount=$($like.data.likeCount)" -ForegroundColor Green
    
    $unlike = Invoke-RestMethod -Uri "$base/api/artworks/test-art-1/like" -Method DELETE -Headers @{ "Authorization" = "Bearer dev-token" }
    Write-Host "   ✅ 取消点赞接口通过: likeCount=$($unlike.data.likeCount)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 点赞测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 8. 收藏/取消收藏测试
Write-Host "8. 收藏测试..." -ForegroundColor Yellow
try {
    $favorite = Invoke-RestMethod -Uri "$base/api/artworks/test-art-1/favorite" -Method POST -Headers @{ "Authorization" = "Bearer dev-token" }
    Write-Host "   ✅ 收藏接口通过" -ForegroundColor Green
    
    $favorites = Invoke-RestMethod -Uri "$base/api/users/dev-user/favorites" -Method GET -Headers @{ "Authorization" = "Bearer dev-token" }
    Write-Host "   ✅ 收藏列表接口通过: 返回$($favorites.Count)条数据" -ForegroundColor Green
    
    $unfavorite = Invoke-RestMethod -Uri "$base/api/artworks/test-art-1/favorite" -Method DELETE -Headers @{ "Authorization" = "Bearer dev-token" }
    Write-Host "   ✅ 取消收藏接口通过" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 收藏测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

# 9. 发布测试
Write-Host "9. 发布测试..." -ForegroundColor Yellow
try {
    $publish = Invoke-RestMethod -Uri "$base/api/artworks/test-art-1/publish" -Method POST -Headers @{ "Authorization" = "Bearer dev-token" }
    Write-Host "   ✅ 发布接口通过: status=$($publish.data.status)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ 发布测试失败: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== 回归测试完成 ===" -ForegroundColor Green