// 集成测试脚本
const fetch = require('node-fetch')

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8787'

async function runIntegrationTests() {
  console.log('🧪 Starting integration tests...')
  
  const testCases = [
    {
      name: 'Test new state endpoint',
      endpoint: '/api/artworks/test-artwork-id/state',
      method: 'GET',
      expectedStatus: 200
    },
    {
      name: 'Test batch state endpoint',
      endpoint: '/api/artworks/batch/state',
      method: 'POST',
      body: { artworkIds: ['test1', 'test2', 'test3'] },
      expectedStatus: 200
    },
    {
      name: 'Test like endpoint',
      endpoint: '/api/artworks/test-artwork-id/like',
      method: 'POST',
      expectedStatus: 200
    },
    {
      name: 'Test favorite endpoint',
      endpoint: '/api/artworks/test-artwork-id/favorite',
      method: 'POST',
      expectedStatus: 200
    }
  ]

  let passed = 0
  let failed = 0

  for (const testCase of testCases) {
    try {
      const options = {
        method: testCase.method,
        headers: { 'Content-Type': 'application/json' }
      }
      
      if (testCase.body) {
        options.body = JSON.stringify(testCase.body)
      }

      const response = await fetch(`${BASE_URL}${testCase.endpoint}`, options)
      
      if (response.status === testCase.expectedStatus) {
        console.log(`✅ ${testCase.name}: PASSED`)
        passed++
      } else {
        console.log(`❌ ${testCase.name}: FAILED (Expected ${testCase.expectedStatus}, got ${response.status})`)
        failed++
      }
    } catch (error) {
      console.log(`❌ ${testCase.name}: ERROR - ${error.message}`)
      failed++
    }
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`)
  return { passed, failed }
}

// 并发测试
async function runConcurrencyTests() {
  console.log('🔄 Running concurrency tests...')
  
  const artworkId = 'test-artwork-concurrency'
  const promises = []
  
  // 同时发送多个点赞请求
  for (let i = 0; i < 5; i++) {
    promises.push(
      fetch(`${BASE_URL}/api/artworks/${artworkId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    )
  }
  
  try {
    const responses = await Promise.all(promises)
    const statuses = responses.map(r => r.status)
    console.log('✅ Concurrency test completed, statuses:', statuses)
    return true
  } catch (error) {
    console.log('❌ Concurrency test failed:', error.message)
    return false
  }
}

// 网络异常测试
async function runNetworkErrorTests() {
  console.log('🌐 Running network error tests...')
  
  // 测试无效URL
  try {
    await fetch('http://invalid-url/api/artworks/test/state')
    console.log('❌ Network error test failed - should have thrown')
    return false
  } catch (error) {
    console.log('✅ Network error test passed - properly handled')
    return true
  }
}

// 缓存一致性测试
async function runCacheConsistencyTests() {
  console.log('💾 Running cache consistency tests...')
  
  const artworkId = 'test-cache-artwork'
  
  try {
    // 1. 获取初始状态
    const initialResponse = await fetch(`${BASE_URL}/api/artworks/${artworkId}/state`)
    const initialData = await initialResponse.json()
    
    // 2. 执行点赞操作
    await fetch(`${BASE_URL}/api/artworks/${artworkId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    
    // 3. 再次获取状态，应该一致
    const updatedResponse = await fetch(`${BASE_URL}/api/artworks/${artworkId}/state`)
    const updatedData = await updatedResponse.json()
    
    if (updatedData.data.like_count === initialData.data.like_count + 1) {
      console.log('✅ Cache consistency test passed')
      return true
    } else {
      console.log('❌ Cache consistency test failed')
      return false
    }
  } catch (error) {
    console.log('❌ Cache consistency test error:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Starting comprehensive test suite...')
  
  const results = {
    integration: await runIntegrationTests(),
    concurrency: await runConcurrencyTests(),
    network: await runNetworkErrorTests(),
    cache: await runCacheConsistencyTests()
  }
  
  console.log('\n🏁 Test Suite Summary:')
  console.log('Integration Tests:', results.integration)
  console.log('Concurrency Tests:', results.concurrency ? 'PASSED' : 'FAILED')
  console.log('Network Error Tests:', results.network ? 'PASSED' : 'FAILED')
  console.log('Cache Consistency Tests:', results.cache ? 'PASSED' : 'FAILED')
  
  const allPassed = Object.values(results).every(r => 
    typeof r === 'boolean' ? r : r.failed === 0
  )
  
  process.exit(allPassed ? 0 : 1)
}

// 性能测试
async function runPerformanceTests() {
  console.log('⚡ Running performance tests...')
  
  const artworkIds = Array.from({length: 50}, (_, i) => `test-perf-${i}`)
  
  const startTime = Date.now()
  
  try {
    const response = await fetch(`${BASE_URL}/api/artworks/batch/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artworkIds })
    })
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    if (response.ok && duration < 5000) { // 5秒以内
      console.log(`✅ Performance test passed: ${duration}ms for ${artworkIds.length} artworks`)
      return true
    } else {
      console.log(`❌ Performance test failed: ${duration}ms`)
      return false
    }
  } catch (error) {
    console.log('❌ Performance test error:', error.message)
    return false
  }
}

// 如果直接运行这个脚本
if (require.main === module) {
  main().catch(console.error)
}

module.exports = {
  runIntegrationTests,
  runConcurrencyTests,
  runNetworkErrorTests,
  runCacheConsistencyTests,
  runPerformanceTests
}