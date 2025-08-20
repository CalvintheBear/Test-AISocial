#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🔍 验证环境变量配置...\n')

// 检查前端环境变量
const webEnvPath = path.join(__dirname, '../.env.local')
const webEnvExists = fs.existsSync(webEnvPath)

console.log('📱 前端配置:')
if (webEnvExists) {
  const webEnv = fs.readFileSync(webEnvPath, 'utf8')
  const clerkKey = webEnv.match(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=(.+)/)
  const apiBase = webEnv.match(/NEXT_PUBLIC_API_BASE_URL=(.+)/)
  const devJwt = webEnv.match(/NEXT_PUBLIC_DEV_JWT=(.+)/)
  
  console.log(`  ✅ .env.local 文件存在`)
  console.log(`  ${clerkKey ? '✅' : '❌'} Clerk Publishable Key: ${clerkKey ? '已配置' : '未配置'}`)
  console.log(`  ${apiBase ? '✅' : '⚠️'} API Base URL: ${apiBase ? apiBase[1] : '使用默认值 http://127.0.0.1:8787'}`)
  console.log(`  ${devJwt ? '✅' : '⚠️'} Dev JWT: ${devJwt ? '已配置' : '未配置（仅开发环境需要）'}`)
} else {
  console.log('  ❌ .env.local 文件不存在')
  console.log('  💡 建议创建 .env.local 文件并配置必要的环境变量')
}

console.log('\n🔧 后端配置:')

// 检查 .dev.vars 文件（本地开发）
const workerEnvPath = path.join(__dirname, '../../worker-api/.dev.vars')
const workerEnvExists = fs.existsSync(workerEnvPath)

if (workerEnvExists) {
  const workerEnv = fs.readFileSync(workerEnvPath, 'utf8')
  const devMode = workerEnv.match(/DEV_MODE=(.+)/)
  const clerkIssuer = workerEnv.match(/CLERK_ISSUER=(.+)/)
  const clerkJwks = workerEnv.match(/CLERK_JWKS_URL=(.+)/)
  const clerkSecret = workerEnv.match(/CLERK_SECRET_KEY=(.+)/)
  
  console.log(`  ✅ .dev.vars 文件存在`)
  console.log(`  ${devMode ? '✅' : '⚠️'} DEV_MODE: ${devMode ? devMode[1] : '未配置'}`)
  console.log(`  ${clerkIssuer ? '✅' : '⚠️'} CLERK_ISSUER: ${clerkIssuer ? '已配置' : '未配置'}`)
  console.log(`  ${clerkJwks ? '✅' : '⚠️'} CLERK_JWKS_URL: ${clerkJwks ? '已配置' : '未配置'}`)
  console.log(`  ${clerkSecret ? '✅' : '⚠️'} CLERK_SECRET_KEY: ${clerkSecret ? '已配置' : '未配置（可选）'}`)
} else {
  console.log('  ⚠️ .dev.vars 文件不存在（本地开发配置）')
}

// 检查 wrangler.toml 文件（生产配置）
const wranglerPath = path.join(__dirname, '../../worker-api/wrangler.toml')
const wranglerExists = fs.existsSync(wranglerPath)

if (wranglerExists) {
  const wranglerConfig = fs.readFileSync(wranglerPath, 'utf8')
  const devModeToml = wranglerConfig.match(/DEV_MODE\s*=\s*["']([^"']+)["']/)
  const clerkIssuerToml = wranglerConfig.match(/CLERK_ISSUER\s*=\s*["']([^"']+)["']/)
  const clerkJwksToml = wranglerConfig.match(/CLERK_JWKS_URL\s*=\s*["']([^"']+)["']/)
  
  console.log(`  ✅ wrangler.toml 文件存在`)
  console.log(`  ${devModeToml ? '✅' : '⚠️'} DEV_MODE: ${devModeToml ? devModeToml[1] : '未配置'}`)
  console.log(`  ${clerkIssuerToml ? '✅' : '❌'} CLERK_ISSUER: ${clerkIssuerToml ? clerkIssuerToml[1] : '未配置'}`)
  console.log(`  ${clerkJwksToml ? '✅' : '❌'} CLERK_JWKS_URL: ${clerkJwksToml ? clerkJwksToml[1] : '未配置'}`)
  
  // 检查是否配置了生产环境
  if (clerkIssuerToml && clerkJwksToml) {
    console.log('  🎉 生产环境 Clerk 配置完整！')
  }
} else {
  console.log('  ❌ wrangler.toml 文件不存在')
}

console.log('\n📋 配置建议:')
console.log('1. 开发环境: 设置 DEV_MODE=1 以跳过严格认证')
console.log('2. 生产环境: 必须配置 CLERK_ISSUER 和 CLERK_JWKS_URL')
console.log('3. 前端: 配置 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY 启用用户界面')
console.log('4. 确保 API_BASE_URL 指向正确的后端地址')

console.log('\n✨ 验证完成!')
