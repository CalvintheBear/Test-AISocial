import useSWR from 'swr';
import { ArtworkListItem as Artwork } from '@/lib/types';
import { fetchArtworkList } from '@/lib/apiAdapter';

// 获取趋势作品
export function useTrendingArtworks(timeWindow: string = '24h', category: string = 'all') {
  const { data, error, isLoading, mutate } = useSWR(
    [`/api/hotness/trending?timeWindow=${timeWindow}&category=${category}`],
    ([url]) => fetchArtworkList(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1分钟去重
    }
  );

  return {
    data: data || [],
    isLoading,
    error,
    mutate,
  };
}

// 获取热门作品
export function useHotArtworks(limit: number = 20) {
  const { data, error, isLoading } = useSWR(
    [`/api/hotness/trending?category=hot&limit=${limit}`],
    ([url]) => fetchArtworkList(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    data: data || [],
    isLoading,
    error,
  };
}

// 获取上升作品
export function useRisingArtworks(limit: number = 20) {
  const { data, error, isLoading } = useSWR(
    [`/api/hotness/trending?category=rising&limit=${limit}`],
    ([url]) => fetchArtworkList(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    data: data || [],
    isLoading,
    error,
  };
}

// 获取爆红作品
export function useViralArtworks(limit: number = 20) {
  const { data, error, isLoading } = useSWR(
    [`/api/hotness/trending?category=viral&limit=${limit}`],
    ([url]) => fetchArtworkList(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    data: data || [],
    isLoading,
    error,
  };
}