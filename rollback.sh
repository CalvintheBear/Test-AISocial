#!/bin/bash
# AI Social 点赞收藏系统一键回滚脚本

echo "🚨 开始系统回滚..."

# 检查参数
if [ "$1" = "--help" ]; then
    echo "使用方法: ./rollback.sh"
    echo "回滚到旧版本的点赞收藏系统"
    exit 0
fi

# 1. 确认回滚
echo "⚠️  即将回滚到旧版本的点赞收藏系统"
echo "此操作将撤销所有新系统的更改"
read -p "确定要回滚吗？(y/N): " confirm

if [[ $confirm != [yY] ]]; then
    echo "❌ 回滚已取消"
    exit 1
fi

echo "🔄 开始执行回滚操作..."

# 2. 回滚代码更改
echo "📂 步骤1：回滚代码更改..."
git checkout old-system-backup -- apps/web/components/app/LikeFavoriteBarNew.tsx
git checkout old-system-backup -- apps/web/components/app/LikeButton.tsx
git checkout old-system-backup -- apps/web/components/app/FavoriteButton.tsx

# 3. 移除新文件
echo "🗑️  步骤2：清理新文件..."
rm -f apps/web/components/LikeButtonWrapper.tsx
rm -f apps/web/components/FavoriteButtonWrapper.tsx
rm -f apps/web/lib/dataAdapter.ts
rm -f apps/web/lib/featureFlags.ts
rm -f deployment-validation.ts

# 4. 验证回滚结果
echo "✅ 步骤3：验证回滚结果..."
if [ -f "apps/web/components/app/LikeButton.tsx" ]; then
    echo "✅ LikeButton.tsx 已恢复"
else
    echo "❌ LikeButton.tsx 恢复失败"
    exit 1
fi

if [ -f "apps/web/components/app/FavoriteButton.tsx" ]; then
    echo "✅ FavoriteButton.tsx 已恢复"
else
    echo "❌ FavoriteButton.tsx 恢复失败"
    exit 1
fi

# 5. 重新构建检查
echo "🔧 步骤4：重新构建检查..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败，请手动处理"
    exit 1
fi

# 6. 重新部署
echo "🚀 步骤5：重新部署..."
read -p "是否立即重新部署？(y/N): " deploy_confirm

if [[ $deploy_confirm == [yY] ]]; then
    echo "📦 部署后端..."
    cd apps/worker-api && npm run deploy
    
    echo "📦 部署前端..."
    cd ../web && npm run build && vercel --prod
    
    echo "✅ 回滚部署完成！"
else
    echo "⏸️  回滚完成，请手动部署"
fi

echo "🎉 回滚操作全部完成！"