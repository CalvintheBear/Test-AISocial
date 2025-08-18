#!/bin/bash
# test-optimization.sh - AI社交延迟优化测试脚本

echo "🔍 开始测试延迟优化效果..."

# 1. 测试API响应时间
echo "📊 测试API响应时间..."
echo "测试作品状态API:"
time_result=$(curl -w "@curl-format.txt" -o /dev/null -s https://cuttingasmr.org/api/artworks/5c010788-9481-4ffb-9667-655ad42243c7/state)
echo "响应时间: $time_result"

# 2. 测试批量API
echo "📊 测试批量API响应时间..."
time_result=$(curl -w "@curl-format.txt" -o /dev/null -s -X POST https://cuttingasmr.org/api/artworks/batch/state \
  -H "Content-Type: application/json" \
  -d '{"artworkIds":["5c010788-9481-4ffb-9667-655ad42243c7"]}')
echo "批量API响应时间: $time_result"

# 3. 测试Feed页面
echo "📊 测试Feed页面响应时间..."
time_result=$(curl -w "@curl-format.txt" -o /dev/null -s https://cuttingasmr.org/api/feed)
echo "Feed响应时间: $time_result"

# 4. 测试用户收藏页面
echo "📊 测试用户收藏页面响应时间..."
time_result=$(curl -w "@curl-format.txt" -o /dev/null -s https://cuttingasmr.org/api/users/demo-user/favorites)
echo "用户收藏响应时间: $time_result"

# 5. 测试Redis连接
echo "🔍 测试Redis连接..."
curl -s https://cuttingasmr.org/api/redis/ping

# 6. 健康检查
echo "🔍 健康检查..."
curl -s https://cuttingasmr.org/api/health

echo "✅ 测试完成！"
echo ""
echo "🎯 预期效果对比:"
echo "数据同步延迟: 5-10秒 → 2-3秒"
echo "页面切换延迟: 3-5秒 → 1-2秒"
echo "手动刷新需求: 经常需要 → 基本不需要"
echo "用户体验: 一般 → 流畅"
echo ""
echo "📈 请使用浏览器开发者工具验证实际效果"