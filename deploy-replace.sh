#!/bin/bash

# AI Social 点赞收藏系统一次性部署脚本
# 根据部署指南执行批量替换

echo "🚀 开始点赞收藏系统一次性部署..."

# 检查是否在正确的目录
if [ ! -d "apps/web" ] || [ ! -d "apps/worker-api" ]; then
    echo "❌ 错误：请在项目根目录运行此脚本"
    exit 1
fi

# 步骤1：预检查
echo "📋 步骤1：预检查..."

# 检查新组件是否存在
if [ ! -f "apps/web/components/LikeButtonWrapper.tsx" ]; then
    echo "❌ LikeButtonWrapper.tsx 不存在"
    exit 1
fi

if [ ! -f "apps/web/components/FavoriteButtonWrapper.tsx" ]; then
    echo "❌ FavoriteButtonWrapper.tsx 不存在"
    exit 1
fi

# 检查构建状态
echo "🔍 检查TypeScript构建..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 构建失败，请修复错误后再试"
    exit 1
fi

echo "✅ 预检查通过"

# 步骤2：查找需要替换的组件
echo "🔍 步骤2：查找需要替换的组件..."

echo "📊 当前LikeButton使用情况："
find apps/web -name "*.tsx" -not -path "*/node_modules/*" | xargs grep -l "LikeButton" | grep -v "LikeButtonWrapper\|EnhancedLikeButton" | wc -l

find apps/web -name "*.tsx" -not -path "*/node_modules/*" | xargs grep -l "LikeButton" | grep -v "LikeButtonWrapper\|EnhancedLikeButton"

echo "📊 当前FavoriteButton使用情况："
find apps/web -name "*.tsx" -not -path "*/node_modules/*" | xargs grep -l "FavoriteButton" | grep -v "FavoriteButtonWrapper\|EnhancedFavoriteButton" | wc -l

find apps/web -name "*.tsx" -not -path "*/node_modules/*" | xargs grep -l "FavoriteButton" | grep -v "FavoriteButtonWrapper\|EnhancedFavoriteButton"

# 步骤3：执行替换
echo "🔄 步骤3：执行批量替换..."

# 替换LikeButton导入
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    find apps/web -name "*.tsx" -not -path "*/node_modules/*" -exec sed -i '' 's/from.*\.\/app\/LikeButton/from "@\/components\/LikeButtonWrapper"/' {} \;
    find apps/web -name "*.tsx" -not -path "*/node_modules/*" -exec sed -i '' 's/LikeButton/LikeButtonWrapper/g' {} \;
    
    # 替换FavoriteButton导入
    find apps/web -name "*.tsx" -not -path "*/node_modules/*" -exec sed -i '' 's/from.*\.\/app\/FavoriteButton/from "@\/components\/FavoriteButtonWrapper"/' {} \;
    find apps/web -name "*.tsx" -not -path "*/node_modules/*" -exec sed -i '' 's/FavoriteButton/FavoriteButtonWrapper/g' {} \;
else
    # Linux
    find apps/web -name "*.tsx" -not -path "*/node_modules/*" -exec sed -i 's/from.*\.\/app\/LikeButton/from "@\/components\/LikeButtonWrapper"/' {} \;
    find apps/web -name "*.tsx" -not -path "*/node_modules/*" -exec sed -i 's/LikeButton/LikeButtonWrapper/g' {} \;
    
    # 替换FavoriteButton导入
    find apps/web -name "*.tsx" -not -path "*/node_modules/*" -exec sed -i 's/from.*\.\/app\/FavoriteButton/from "@\/components\/FavoriteButtonWrapper"/' {} \;
    find apps/web -name "*.tsx" -not -path "*/node_modules/*" -exec sed -i 's/FavoriteButton/FavoriteButtonWrapper/g' {} \;
fi

echo "✅ 批量替换完成"

# 步骤4：验证替换结果
echo "✅ 步骤4：验证替换结果..."

# 检查是否还有旧的引用
old_like_count=$(find apps/web -name "*.tsx" -not -path "*/node_modules/*" | xargs grep -l "LikeButton[^(]" | wc -l)
old_fav_count=$(find apps/web -name "*.tsx" -not -path "*/node_modules/*" | xargs grep -l "FavoriteButton[^(]" | wc -l)

echo "📊 剩余旧引用检查："
echo "LikeButton 剩余：$old_like_count"
echo "FavoriteButton 剩余：$old_fav_count"

# 步骤5：构建验证
echo "🔧 步骤5：构建验证..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败，请检查错误"
    exit 1
fi

# 步骤6：生成部署报告
echo "📊 步骤6：生成部署报告..."
echo "部署时间：$(date)" > deployment-report.txt
echo "替换结果：" >> deployment-report.txt
echo "LikeButton -> LikeButtonWrapper: 成功" >> deployment-report.txt
echo "FavoriteButton -> FavoriteButtonWrapper: 成功" >> deployment-report.txt
echo "构建状态：成功" >> deployment-report.txt

echo "🎉 一次性部署脚本执行完成！"
echo "📋 部署报告已保存到 deployment-report.txt"
echo "🔍 请手动检查关键页面功能是否正常"