/**
 * AI Social 平台调试API路由
 * 基于 HOTNESS_OPTIMIZATION.md 的调试需求
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { HotnessDebugger } from '../utils/hotness-debugger.js';
import { HotnessMetricsCollector, hotnessMetrics } from '../utils/hotness-metrics.js';
import { HotnessService } from '../services/hotness.js';
import { RedisService } from '../services/redis.js';
import { D1Service } from '../services/d1.js';
import { batchUpdateManager } from '../utils/hotness-batch-updater.js';

// 调试API路由
const debugRouter = new Hono();

// 启用CORS
debugRouter.use('*', cors({
  origin: (origin) => origin,
  credentials: true
}));

// 请求验证Schema
const artworkIdSchema = z.object({
  artworkId: z.string()
});

const userIdSchema = z.object({
  userId: z.string()
});

// 初始化调试器
function createDebugger(c: any): HotnessDebugger {
  const redis = RedisService.fromEnv(c.env);
  const d1 = D1Service.fromEnv(c.env);
  const hotnessService = new HotnessService(redis, d1);
  return new HotnessDebugger(hotnessService, redis, d1);
}

// 调试根路由
debugRouter.get('/', async (c) => {
  const debugInstance = createDebugger(c);
  const report = await debugInstance.getDebugReport();
  
  return c.json({
    success: true,
    data: {
      report,
      availableEndpoints: [
        'GET /api/debug/artwork/:id - 获取作品热度详情',
        'GET /api/debug/user/:id - 获取用户行为数据',
        'POST /api/debug/validate/:id - 验证作品热度计算',
        'GET /api/debug/system - 获取系统调试数据',
        'GET /api/debug/metrics - 获取监控指标',
        'GET /api/debug/batch-status - 获取批量更新状态',
        'POST /api/debug/flush-batch - 强制处理批量队列'
      ]
    }
  });
});

// 获取作品热度详情
debugRouter.get('/artwork/:id', async (c) => {
  try {
    const artworkId = c.req.param('id');
    if (!artworkId) {
      return c.json({ success: false, error: 'Artwork ID is required' }, 400);
    }

    const debugInstance = createDebugger(c);
    const details = await debugInstance.getArtworkHotnessDetails(artworkId);
    
    return c.json({ success: true, data: details });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// 获取用户行为数据
debugRouter.get('/user/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    if (!userId) {
      return c.json({ success: false, error: 'User ID is required' }, 400);
    }

    const debugInstance = createDebugger(c);
    const userData = await debugInstance.getUserDebugData(userId);
    
    return c.json({ success: true, data: userData });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// 验证作品热度计算
debugRouter.post('/validate/:id', async (c) => {
  try {
    const artworkId = c.req.param('id');
    if (!artworkId) {
      return c.json({ success: false, error: 'Artwork ID is required' }, 400);
    }

    const debugInstance = createDebugger(c);
    const validation = await debugInstance.validateHotnessCalculation(artworkId);
    
    return c.json({ success: true, data: validation });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// 获取系统调试数据
debugRouter.get('/system', async (c) => {
  try {
    const debugInstance = createDebugger(c);
    const systemData = await debugInstance.getSystemDebugData();
    
    return c.json({ success: true, data: systemData });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// 获取监控指标
debugRouter.get('/metrics', async (c) => {
  try {
    const metrics = hotnessMetrics.getMetrics();
    const runtimeStats = hotnessMetrics.getRuntimeStats();
    const performanceReport = hotnessMetrics.getPerformanceReport();
    
    return c.json({
      success: true,
      data: {
        metrics,
        runtimeStats,
        performanceReport
      }
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// 获取批量更新状态
debugRouter.get('/batch-status', async (c) => {
  try {
    const redis = RedisService.fromEnv(c.env);
    const d1 = D1Service.fromEnv(c.env);
    const hotnessService = new HotnessService(redis, d1);
    const batchUpdater = batchUpdateManager.getBatchUpdater(hotnessService, redis, d1, hotnessMetrics);
    
    const status = batchUpdater.getQueueStatus();
    
    return c.json({ success: true, data: status });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// 强制处理批量队列
debugRouter.post('/flush-batch', async (c) => {
  try {
    const redis = RedisService.fromEnv(c.env);
    const d1 = D1Service.fromEnv(c.env);
    const hotnessService = new HotnessService(redis, d1);
    const batchUpdater = batchUpdateManager.getBatchUpdater(hotnessService, redis, d1, hotnessMetrics);
    
    const result = await batchUpdater.flushQueue();
    
    return c.json({ success: true, data: result });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// 清理过期数据
debugRouter.post('/cleanup', async (c) => {
  try {
    const redis = RedisService.fromEnv(c.env);
    const d1 = D1Service.fromEnv(c.env);
    const hotnessService = new HotnessService(redis, d1);
    const batchUpdater = batchUpdateManager.getBatchUpdater(hotnessService, redis, d1, hotnessMetrics);
    
    const result = await batchUpdater.cleanupExpiredData();
    
    return c.json({ success: true, data: result });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// 健康检查
debugRouter.get('/health', async (c) => {
  try {
    const redis = RedisService.fromEnv(c.env);
    const d1 = D1Service.fromEnv(c.env);
    
    // 检查Redis连接
    const redisHealth = await checkRedisHealth(redis);
    
    // 检查D1连接
    const d1Health = await checkD1Health(d1);
    
    return c.json({
      success: true,
      data: {
        redis: redisHealth,
        d1: d1Health,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
});

// 辅助方法：检查Redis健康
async function checkRedisHealth(redis: RedisService): Promise<{
  connected: boolean;
  responseTime: number;
  error?: string
}> {
  try {
    const start = Date.now();
    await redis.execute('PING');
    return {
      connected: true,
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      connected: false,
      responseTime: -1,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

// 辅助方法：检查D1健康
async function checkD1Health(d1: D1Service): Promise<{
  connected: boolean;
  responseTime: number;
  error?: string
}> {
  try {
    const start = Date.now();
    await d1.getUser('test-user');
    return {
      connected: true,
      responseTime: Date.now() - start
    };
  } catch (error) {
    return {
      connected: false,
      responseTime: -1,
      error: error instanceof Error ? error.message : 'Connection failed'
    };
  }
}

export { debugRouter };