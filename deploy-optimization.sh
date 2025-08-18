#!/bin/bash
# deploy-optimization.sh - AI社交延迟优化部署脚本

echo "🚀 开始部署延迟优化..."

# 1. 检查环境
if [ ! -f "apps/web/.env.local" ]; then
    echo "⚠️  创建环境变量文件..."
    cat > apps/web/.env.local << 'EOF'
NEXT_PUBLIC_API_BASE_URL=https://cuttingasmr.org
NEXT_PUBLIC_SITE_URL=https://cuttingasmr.org
NEXT_PUBLIC_USE_MOCK=0
NEXT_PUBLIC_DEV_JWT=dev
EOF
fi

# 2. 安装依赖
echo "📦 安装依赖..."
npm install

# 3. 类型检查
echo "🔍 执行类型检查..."
cd apps/web && npm run typecheck
cd ../worker-api && npm run typecheck
cd ../..

# 4. 构建前端
echo "🏗️  构建前端..."
cd apps/web
npm run build

# 5. 检查构建结果
if [ $? -eq 0 ]; then
    echo "✅ 前端构建成功"
else
    echo "❌ 前端构建失败"
    exit 1
fi

# 6. 部署后端（如果需要）
echo "🚀 部署后端..."
cd ../worker-api
npm run deploy

# 7. 部署前端
echo "🚀 部署前端..."
cd ../web
npm run deploy  # 或 vercel --prod

# 8. 部署完成
echo "✅ 延迟优化部署完成！"
echo "🌐 请访问: https://cuttingasmr.org"
echo "📊 运行 ./test-optimization.sh 测试性能"