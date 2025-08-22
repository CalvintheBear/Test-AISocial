# 防抖 Hooks 使用指南

## 📋 概述

本项目提供了一套完整的防抖和节流工具，用于优化用户交互体验，减少不必要的API调用和性能开销。

## 🎯 防抖 Hooks

### `useDebounce<T>(value: T, delay: number): T`

对值进行防抖处理，返回防抖后的值。

```tsx
import { useDebounce } from '@/hooks/useDebounce'

function SearchComponent() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery) {
      // 只有在用户停止输入300ms后才执行搜索
      search(debouncedQuery)
    }
  }, [debouncedQuery])

  return <input value={query} onChange={e => setQuery(e.target.value)} />
}
```

### `useDebouncedCallback<T>(callback: T, delay: number, deps?: any[]): T`

对函数调用进行防抖处理。

```tsx
import { useDebouncedCallback } from '@/hooks/useDebounce'

function ActionButton() {
  const handleClick = useCallback(() => {
    console.log('Button clicked')
  }, [])

  const debouncedHandleClick = useDebouncedCallback(handleClick, 300, [handleClick])

  return <button onClick={debouncedHandleClick}>Click me</button>
}
```

### `useThrottle<T>(callback: T, delay: number, deps?: any[]): T`

限制函数调用频率（节流）。

```tsx
import { useThrottle } from '@/hooks/useDebounce'

function ScrollHandler() {
  const handleScroll = useCallback(() => {
    console.log('Scroll event')
  }, [])

  const throttledHandleScroll = useThrottle(handleScroll, 100, [handleScroll])

  useEffect(() => {
    window.addEventListener('scroll', throttledHandleScroll)
    return () => window.removeEventListener('scroll', throttledHandleScroll)
  }, [throttledHandleScroll])

  return null
}
```

### `useDebouncedSearch(onSearch: (query: string) => void, delay?: number)`

专门用于搜索输入的防抖Hook。

```tsx
import { useDebouncedSearch } from '@/hooks/useDebounce'

function SearchComponent() {
  const { searchQuery, setSearchQuery } = useDebouncedSearch((query) => {
    // 执行搜索
    performSearch(query)
  }, 300)

  return <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
}
```

### `useDebouncedState<T>(initialValue: T, onStateChange?: (value: T) => void, delay?: number)`

用于复杂状态更新的防抖Hook。

```tsx
import { useDebouncedState } from '@/hooks/useDebounce'

function SettingsForm() {
  const [value, setValue, debouncedValue] = useDebouncedState('', (val) => {
    // 保存到服务器
    saveSetting(val)
  }, 500)

  return <input value={value} onChange={e => setValue(e.target.value)} />
}
```

## 🔧 防抖配置建议

### 不同操作的推荐防抖时间

- **搜索输入**: 300-500ms
- **表单提交**: 500-1000ms
- **点赞/收藏**: 300-500ms
- **隐私设置切换**: 500-1000ms
- **Tab切换**: 200-300ms
- **数据重新加载**: 1000ms

### 防抖 vs 节流

- **防抖 (Debounce)**: 等待操作停止后再执行，适合搜索、表单输入
- **节流 (Throttle)**: 限制执行频率，适合滚动、窗口resize事件

## 🎨 在个人主页中的应用

### 隐私设置防抖
```tsx
// 500ms防抖，避免用户快速切换
const persistPrivacy = useDebouncedCallback(persistPrivacyImmediate, 500)
```

### Tab切换防抖
```tsx
// 300ms防抖，避免快速切换Tab时的频繁URL更新
const updateUrl = useDebouncedCallback(updateUrlImmediate, 300)
```

### 点赞/收藏防抖
```tsx
// 300ms防抖，防止快速连续点击
const handleLike = useDebouncedCallback(handleLikeImmediate, 300)
const handleFavorite = useDebouncedCallback(handleFavoriteImmediate, 300)
```

### 数据加载防抖
```tsx
// 1000ms防抖，避免频繁切换Tab导致的重复请求
const reloadAll = useDebouncedCallback(reloadAllImmediate, 1000)
```

## ⚡ 性能优化效果

1. **减少API调用**: 防抖机制防止了用户的快速操作导致的重复请求
2. **提升用户体验**: 避免了界面频繁更新和加载状态的闪烁
3. **节省服务器资源**: 减少了不必要的计算和数据库查询
4. **网络优化**: 降低了带宽消耗和服务器负载

## 🔍 最佳实践

1. **合理设置延迟时间**: 根据操作类型选择合适的防抖时间
2. **提供用户反馈**: 在防抖期间可以显示加载状态或禁用按钮
3. **错误处理**: 确保防抖函数中的错误不会阻塞后续操作
4. **测试验证**: 在各种用户交互场景下测试防抖效果
5. **避免过度防抖**: 不要为所有操作都设置过长的防抖时间

## 📝 使用示例

```tsx
import {
  useDebounce,
  useDebouncedCallback,
  useThrottle,
  useDebouncedSearch,
  useDebouncedState
} from '@/hooks/useDebounce'

// 基础防抖
const debouncedValue = useDebounce(inputValue, 300)

// 防抖函数
const debouncedAction = useDebouncedCallback(handleAction, 500)

// 节流函数
const throttledScroll = useThrottle(handleScroll, 100)

// 搜索防抖
const { searchQuery, setSearchQuery } = useDebouncedSearch(performSearch, 300)

// 状态防抖
const [value, setValue, debouncedValue] = useDebouncedState('', saveToServer, 500)
```
