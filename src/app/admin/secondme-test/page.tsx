'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { User, Heart, Brain } from 'lucide-react';

// 用户信息类型
interface UserInfo {
  userId: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  selfIntroduction: string;
  profileCompleteness: number;
  route: string;
}

// 兴趣标签类型
interface Shade {
  id: number;
  shadeName: string;
  shadeIcon: string;
  confidenceLevel: string;
  shadeDescription: string;
  shadeNamePublic: string;
}

// 软记忆类型
interface SoftMemory {
  id: number;
  factObject: string;
  factContent: string;
  createTime: number;
  updateTime: number;
}

// API 响应类型
interface ApiResponse {
  code: number;
  data: {
    userInfo: UserInfo | null;
    shades: Shade[];
    softMemory: SoftMemory[];
  } | null;
  message: string;
}

export default function SecondMeTestPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUserParams = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/user/secondme-params');
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('请求失败: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">SecondMe API 测试</h1>

      <Card className="mb-6">
        <CardHeader>
          <div className="text-lg font-semibold">获取当前用户参数</div>
          <div className="text-sm text-gray-500">
            点击按钮获取当前已登录用户在 SecondMe 平台上的用户信息、兴趣标签和软记忆
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchUserParams} disabled={loading} className="w-full">
            {loading ? <Spinner className="mr-2" /> : <User className="mr-2 h-4 w-4" />}
            获取用户参数
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card className="mb-6 border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      )}

      {result && result.code === 0 && result.data && (
        <div className="space-y-6">
          {/* 用户基本信息 */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                用户基本信息
              </div>
            </CardHeader>
            <CardContent>
              {result.data.userInfo ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">用户ID</p>
                    <p className="font-mono">{result.data.userInfo.userId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">用户名</p>
                    <p className="font-medium">{result.data.userInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">邮箱</p>
                    <p>{result.data.userInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">资料完整度</p>
                    <p>{result.data.userInfo.profileCompleteness}%</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">个人简介</p>
                    <p>{result.data.userInfo.bio || '暂无'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">自我介绍</p>
                    <p>{result.data.userInfo.selfIntroduction || '暂无'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">未获取到用户信息</p>
              )}
            </CardContent>
          </Card>

          {/* 兴趣标签 */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Heart className="mr-2 h-5 w-5" />
                兴趣标签 ({result.data.shades.length})
              </div>
            </CardHeader>
            <CardContent>
              {result.data.shades.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {result.data.shades.map((shade) => (
                    <div
                      key={shade.id}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm"
                    >
                      {shade.shadeNamePublic || shade.shadeName}
                      <span className="ml-1 text-xs text-gray-500">
                        ({shade.confidenceLevel})
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">未获取到兴趣标签</p>
              )}
            </CardContent>
          </Card>

          {/* 软记忆 */}
          <Card>
            <CardHeader>
              <div className="flex items-center">
                <Brain className="mr-2 h-5 w-5" />
                软记忆 ({result.data.softMemory.length})
              </div>
            </CardHeader>
            <CardContent>
              {result.data.softMemory.length > 0 ? (
                <div className="space-y-3">
                  {result.data.softMemory.map((memory) => (
                    <div
                      key={memory.id}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <p className="text-sm font-medium text-gray-500">{memory.factObject}</p>
                      <p>{memory.factContent}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">未获取到软记忆</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {result && result.code !== 0 && (
        <Card className="mb-6 border-yellow-500">
          <CardContent className="pt-6">
            <p className="text-yellow-600">{result.message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
