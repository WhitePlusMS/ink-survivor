/**
 * Supabase 客户端初始化
 *
 * 用于 Supabase Realtime 功能
 * 需要在 Supabase Dashboard -> Settings -> API 中获取 anon key
 */

import { createClient } from '@supabase/supabase-js';

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 验证配置
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing configuration. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env'
  );
}

// 创建 Supabase 客户端
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    // 不需要自动刷新 token，因为用户已经通过 SecondMe 登录
    autoRefreshToken: false,
    persistSession: false,
  },
  // 启用 Realtime
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * 检查 Supabase 是否已正确配置
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabaseAnonKey !== 'YOUR_ANON_KEY_HERE');
}
