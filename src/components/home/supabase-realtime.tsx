'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Supabase Realtime Hook
 *
 * 订阅数据库变更并自动刷新页面
 *
 * @param table - 要监听的表名
 * @param enabled - 是否启用监听
 */
export function useSupabaseRealtime(table: string, enabled: boolean = true) {
  const router = useRouter();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handleDatabaseChange = useCallback(() => {
    console.log('[Supabase Realtime] Database change detected, refreshing...');
    router.refresh();
  }, [router]);

  useEffect(() => {
    // 检查是否启用和配置正确
    if (!enabled || !isSupabaseConfigured()) {
      console.log('[Supabase Realtime] Not configured or disabled');
      return;
    }

    // 清理之前的连接
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // 创建 Realtime 频道
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes' as const,
        {
          event: '*', // 监听 insert, update, delete
          schema: 'public',
          table: table,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          console.log('[Supabase Realtime] Received change:', payload);
          handleDatabaseChange();
        }
      )
      .subscribe((status) => {
        console.log(`[Supabase Realtime] Subscription status for ${table}:`, status);
      });

    channelRef.current = channel;

    // 清理函数
    return () => {
      console.log('[Supabase Realtime] Cleaning up...');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, table, handleDatabaseChange]);
}

/**
 * 专门用于监听赛季更新的 Hook
 */
export function useSeasonRealtime(enabled: boolean = true) {
  return useSupabaseRealtime('season', enabled);
}

/**
 * 专门用于监听书籍更新的 Hook
 */
export function useBookRealtime(enabled: boolean = true) {
  return useSupabaseRealtime('book', enabled);
}

/**
 * 专门用于监听章节更新的 Hook
 */
export function useChapterRealtime(enabled: boolean = true) {
  return useSupabaseRealtime('chapter', enabled);
}

/**
 * 专门用于监听首页数据的 Hook
 * 监听 season, book, chapter 表的变化
 */
export function useHomeRealtime(enabled: boolean = true) {
  const router = useRouter();
  const handleDatabaseChange = useCallback(() => {
    console.log('[Supabase Realtime] Database change detected, refreshing...');
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) {
      return;
    }

    // 清理之前的连接
    supabase.removeAllChannels();

    // 监听多个表
    const channel = supabase
      .channel('home-changes')
      .on(
        'postgres_changes' as const,
        { event: '*', schema: 'public', table: 'season' },
        () => handleDatabaseChange()
      )
      .on(
        'postgres_changes' as const,
        { event: '*', schema: 'public', table: 'book' },
        () => handleDatabaseChange()
      )
      .on(
        'postgres_changes' as const,
        { event: '*', schema: 'public', table: 'chapter' },
        () => handleDatabaseChange()
      )
      .subscribe((status) => {
        console.log('[Supabase Realtime] Home subscription status:', status);
      });

    return () => {
      console.log('[Supabase Realtime] Cleaning up home...');
      supabase.removeChannel(channel);
    };
  }, [enabled, handleDatabaseChange]);
}
