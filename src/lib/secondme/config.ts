/**
 * SecondMe OAuth2 常量配置
 * 参考文档: docs/OAuth2 API 参考.md
 */

export const SECONDME_CONFIG = {
  // API Base URL (用于 API 请求)
  BASE_URL: process.env.SECONDME_API_BASE_URL || 'https://app.mindos.com/gate/lab',

  // OAuth2 授权入口 URL (用于重定向用户)
  OAUTH_AUTHORIZE_URL: process.env.SECONDME_OAUTH_AUTHORIZE_URL || 'https://go.second.me/oauth/',

  // OAuth2 端点
  OAUTH: {
    TOKEN: '/api/oauth/token/code',
    REFRESH: '/api/oauth/token/refresh',
  },

  // API 端点
  API: {
    USER_INFO: '/api/secondme/user/info',
    USER_SHADES: '/api/secondme/user/shades',
    USER_SOFTMEMORY: '/api/secondme/user/softmemory',
    NOTE_ADD: '/api/secondme/note/add',
    CHAT_STREAM: '/api/secondme/chat/stream',
    ACT_STREAM: '/api/secondme/act/stream',
  },

  // Token 配置
  TOKEN: {
    ACCESS_TOKEN_EXPIRY_SECONDS: 2 * 60 * 60, // 2 小时
    REFRESH_TOKEN_EXPIRY_SECONDS: 30 * 24 * 60 * 60, // 30 天
    REFRESH_THRESHOLD_MINUTES: 5, // 在过期前 5 分钟刷新
  },

  // 测试 Token (用于测试 API)
  TEST_TOKEN: process.env.SECONDME_TEST_TOKEN || '',
};

// 导出便捷访问
export const SECONDME_API_BASE_URL = SECONDME_CONFIG.BASE_URL;
export const SECONDME_OAUTH_AUTHORIZE_URL = SECONDME_CONFIG.OAUTH_AUTHORIZE_URL;
export const SECONDME_OAUTH_TOKEN = `${SECONDME_CONFIG.BASE_URL}${SECONDME_CONFIG.OAUTH.TOKEN}`;
export const SECONDME_OAUTH_REFRESH = `${SECONDME_CONFIG.BASE_URL}${SECONDME_CONFIG.OAUTH.REFRESH}`;
export const SECONDME_TEST_TOKEN = SECONDME_CONFIG.TEST_TOKEN;
