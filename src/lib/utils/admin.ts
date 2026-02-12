/**
 * 管理员权限验证工具
 *
 * 提供管理员用户验证功能
 */

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

// 管理员手机号配置
const ADMIN_PHONE = '+8618801318191';

/**
 * 检查当前请求的用户是否为管理员
 * 从 Cookie 中获取用户信息，查询数据库判断是否为管理员
 */
export async function checkAdminPermission(): Promise<{
  isAdmin: boolean;
  userId?: string;
  nickname?: string;
}> {
  try {
    // 1. 从 Cookie 获取 auth_token
    const authToken = cookies().get('auth_token')?.value;

    if (!authToken) {
      return { isAdmin: false };
    }

    // 2. 通过 auth_token (即 userId) 查询用户
    const user = await prisma.user.findUnique({
      where: { id: authToken },
      select: { id: true, nickname: true, isAdmin: true },
    });

    if (!user) {
      return { isAdmin: false };
    }

    return {
      isAdmin: user.isAdmin === true,
      userId: user.id,
      nickname: user.nickname,
    };
  } catch (error) {
    console.error('[AdminAuth] 检查管理员权限失败:', error);
    return { isAdmin: false };
  }
}

/**
 * 中间件/装饰器：确保只有管理员可以访问
 * 用于 API 路由开头调用
 */
export async function requireAdmin(): Promise<{
  success: boolean;
  message: string;
  userId?: string;
}> {
  const { isAdmin, userId, nickname } = await checkAdminPermission();

  if (!isAdmin) {
    console.warn(`[AdminAuth] 非管理员尝试访问管理功能: ${nickname} (${userId})`);
    return {
      success: false,
      message: '无权限：只有管理员可以执行此操作',
    };
  }

  return {
    success: true,
    message: '验证通过',
    userId,
  };
}

/**
 * 获取管理员手机号
 */
export function getAdminPhone(): string {
  return ADMIN_PHONE;
}

/**
 * 判断用户手机号是否为管理员
 * 用于注册/登录时自动设置管理员权限
 */
export async function setUserAsAdminByPhone(phone: string): Promise<boolean> {
  if (phone !== ADMIN_PHONE) {
    return false;
  }

  try {
    // 通过 phone 查找用户（secondMeId 可能是手机号或其他唯一标识）
    // 这里假设 secondMeId 就是手机号格式
    await prisma.user.updateMany({
      where: { secondMeId: phone },
      data: { isAdmin: true },
    });
    return true;
  } catch (error) {
    console.error('[AdminAuth] 设置管理员失败:', error);
    return false;
  }
}

/**
 * 创建 API 错误响应（401 未授权）
 */
export function createUnauthorizedResponse(message: string = '请先登录') {
  return {
    code: 401,
    data: null,
    message,
  };
}

/**
 * 创建禁止访问响应（403 无权限）
 */
export function createForbiddenResponse(message: string = '无权限：只有管理员可以执行此操作') {
  return {
    code: 403,
    data: null,
    message,
  };
}
