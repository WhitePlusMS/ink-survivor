// SecondMe API 配置
export const SECONDME_API = {
  BASE_URL: process.env.SECONDME_API_BASE_URL || 'https://api.second.me',
  CLIENT_ID: process.env.SECONDME_CLIENT_ID || '',
  CLIENT_SECRET: process.env.SECONDME_CLIENT_SECRET || '',
  REDIRECT_URI: process.env.SECONDME_REDIRECT_URI || '',
};

// OAuth2 端点
export const SECONDME_OAUTH = {
  AUTHORIZE_URL: `${SECONDME_API.BASE_URL}/oauth/authorize`,
  TOKEN_URL: `${SECONDME_API.BASE_URL}/oauth/token`,
  USERINFO_URL: `${SECONDME_API.BASE_URL}/userinfo`,
};

// 分页默认值
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// 状态常量
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  DRAFT: 'draft',
  PUBLISHED: 'published',
} as const;

// API 响应状态码
export const API_STATUS = {
  SUCCESS: 0,
  ERROR: 1,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
} as const;
