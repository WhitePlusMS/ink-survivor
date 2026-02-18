/**
 * LLM 响应 JSON 解析器
 *
 * 使用成熟的 jsonrepair 库处理 LLM 返回的各种格式问题
 *
 * 支持的情况：
 * - Markdown 代码块（```json / ```）
 * - 前后有额外文字说明
 * - 未转义的引号
 * - 单引号代替双引号
 * - 缺失的逗号
 * - 换行符问题
 */

import { jsonrepair } from 'jsonrepair';

/**
 * 指数退避配置
 */
const RETRY_CONFIG = {
  maxRetries: 3,           // 最大重试次数
  baseDelayMs: 1000,       // 基础延迟（毫秒）
  maxDelayMs: 10000,       // 最大延迟（毫秒）
  backoffMultiplier: 2,    // 退避倍率
};

/**
 * 预处理 JSON 字符串，将未转义的引号转义
 *
 * LLM 有时会返回这样的内容：
 * "content": "...招牌闪烁着"24小时营业"。这座城市..."
 *
 * 其中 "24小时营业" 里的引号没有转义，会导致 JSON.parse 失败
 *
 * @param json - 可能是损坏的 JSON 字符串
 * @returns 修复后的 JSON 字符串
 */
function escapeUnescapedQuotes(json: string): string {
  // 只处理 " 未转义的情况：在双引号字符串内容中
  // 使用反向否定断言，确保引号前不是反斜杠（已转义）
  return json.replace(/(?<!\\)"(.*?)"/g, (match, content) => {
    // 将内部的双引号转义
    const escaped = content.replace(/"/g, '\\"');
    return `"${escaped}"`;
  });
}

/**
 * 预处理：清理 LLM 返回的占位符和无效内容
 *
 * LLM 经常在 JSON 中使用占位符，如：
 * - "...", "……", "......" 表示内容省略
 * - "..." 出现在字符串中间导致 JSON 截断
 *
 * @param json - 原始响应字符串
 * @returns 清理后的字符串
 */
function cleanLLMPlaceholders(json: string): string {
  let cleaned = json;

  // 1. 处理字符串值中的省略号占位符（这会导致 JSON 解析失败）
  // 匹配模式：双引号字符串以 ... 或 …… 或 ...... 结尾
  cleaned = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"(?:\s*[,}\]])/g, (match, content, suffix) => {
    // 清理字符串末尾的省略号
    const trimmedContent = content.replace(/\s*[⋯…]{1,6}\s*$/, '');
    return `"${trimmedContent}"${suffix}`;
  });

  // 2. 处理数组元素中的省略号占位符
  cleaned = cleaned.replace(/"([^"]*)"\s*\,\s*"?.\.\."?/g, '"$1"');

  // 3. 处理键值对中值是纯省略号的情况 "key": "..."
  cleaned = cleaned.replace(/"([^"]+)"\s*:\s*"[\s⋯…\.]+"/g, (match, key) => {
    return `"${key}": ""`;
  });

  // 4. 处理类似 "description": "内容... 这样的截断字符串
  // 找到未闭合的字符串（以省略号结尾但没有正确的结束引号）
  cleaned = cleaned.replace(/"([^"\\]*(?:\\.[^"\\]*)*?)[\s⋯…]{3,}(?=\s*[,}\]\d])/g, '"$1"');

  return cleaned;
}

/**
 * 从 LLM 响应中提取并修复 JSON
 *
 * @param response - LLM 的原始响应
 * @returns 修复后的 JSON 字符串
 */
function extractAndRepairJson(response: string): string {
  let cleanedResponse = response;

  // 0. 预处理：只清理不属于 JSON 响应的内容
  // 注意：不删除内容中的换行和空格，因为这些是小说正文的一部分
  // 让 jsonrepair 库来处理 JSON 格式问题

  // 0.1 检查是否是纯文本（没有任何 JSON 特征）
  const trimmed = cleanedResponse.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.includes('```json') && !trimmed.includes('```')) {
    // 纯文本响应，包装成 JSON 对象
    console.log(`[LLM Parser] 检测到纯文本响应，包装成 JSON 格式`);
    return JSON.stringify({
      title: "章节内容",
      content: cleanedResponse.trim()
    });
  }

  // 1. 尝试提取 ```json ... ``` 包裹的内容
  const jsonCodeBlock = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonCodeBlock) {
    const content = jsonCodeBlock[1].trim();
    try {
      JSON.parse(content);
      return content;
    } catch {
      // 使用 jsonrepair 修复
      return jsonrepair(content);
    }
  }

  // 2. 尝试提取 ``` ... ``` 包裹的内容
  const plainCodeBlock = cleanedResponse.match(/```\s*([\s\S]*?)\s*```/);
  if (plainCodeBlock) {
    const content = plainCodeBlock[1].trim();
    try {
      return jsonrepair(content);
    } catch {
      // jsonrepair 失败，返回包装后的纯文本
      console.log(`[LLM Parser] 代码块解析失败，尝试提取纯文本`);
      return JSON.stringify({
        title: "章节内容",
        content: cleanedResponse.trim()
      });
    }
  }

  // 3. 尝试提取 { ... } 结构
  const firstBrace = cleanedResponse.indexOf('{');
  const lastBrace = cleanedResponse.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const extracted = cleanedResponse.substring(firstBrace, lastBrace + 1);
    try {
      JSON.parse(extracted);
      return extracted;
    } catch {
      // 使用 jsonrepair 修复
      try {
        return jsonrepair(extracted);
      } catch {
        // jsonrepair 也失败，尝试更激进的方法
        console.log(`[LLM Parser] JSON 提取和修复都失败，尝试提取 title 和 content 字段`);
        return extractChapterFromText(cleanedResponse);
      }
    }
  }

  // 4. 如果以上都失败，尝试从文本中提取章节内容
  console.log(`[LLM Parser] 无法提取 JSON，尝试从文本提取`);
  return extractChapterFromText(cleanedResponse);
}

/**
 * 从纯文本中提取章节内容
 * 当 JSON 解析失败时的备用方案
 */
function extractChapterFromText(text: string): string {
  // 尝试提取 title
  const titleMatch = text.match(/"title"\s*:\s*"([^"]+)"/) || text.match(/title[:：]\s*([^\n]+)/i);
  const title = titleMatch ? titleMatch[1] : "章节内容";

  // 尝试提取 content（更激进：获取第一个 ``` 之后的所有内容）
  const contentMatch = text.match(/```[\s\S]*?```/);
  let content = text;
  if (contentMatch) {
    // 移除代码块标记，保留内容
    content = contentMatch[0].replace(/```\w*\s*/g, '').trim();
  } else {
    // 如果没有代码块，尝试获取 { } 之间的内容
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      content = braceMatch[0];
    }
  }

  // 返回修复后的 JSON
  try {
    return jsonrepair(`{"title":"${title}","content":${JSON.stringify(content)}}`);
  } catch {
    // 最坏情况：直接返回纯文本包装
    return JSON.stringify({
      title: title,
      content: text.substring(0, 5000) // 限制长度
    });
  }
}

/**
 * 计算指数退避延迟时间
 */
function getExponentialBackoffDelay(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
    RETRY_CONFIG.maxDelayMs
  );
  // 添加随机抖动（±20%）
  const jitter = delay * 0.2 * (Math.random() - 0.5) * 2;
  return Math.max(0, Math.round(delay + jitter));
}

/**
 * 带指数退避的 LLM 响应 JSON 解析
 *
 * @param llmResponseFn - 返回 LLM 响应的异步函数
 * @param options - 解析选项
 * @returns 解析后的 JSON 对象
 * @throws Error - 当重试次数用尽后解析仍失败
 */
export async function parseLLMJsonWithRetry<T = Record<string, unknown>>(
  llmResponseFn: () => Promise<string>,
  options?: {
    /** 期望的根键名，如果指定则从该键提取值 */
    rootKey?: string;
    /** 打印日志的字符数 */
    logLength?: number;
    /** 自定义重试次数（覆盖默认配置） */
    maxRetries?: number;
    /** 任务标识，用于日志 */
    taskId?: string;
  }
): Promise<T> {
  const { rootKey, logLength = 200, maxRetries = RETRY_CONFIG.maxRetries, taskId = 'LLM' } = options || {};

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 调用 LLM 获取响应
      const response = await llmResponseFn();
      console.log(`[${taskId}] LLM 响应 (尝试 ${attempt + 1}/${maxRetries + 1}): ${response.substring(0, logLength)}...`);

      // 解析 JSON
      const repairedJson = extractAndRepairJson(response);
      const parsed = JSON.parse(repairedJson) as Record<string, unknown>;

      // 如果指定了根键，提取该键的值
      if (rootKey) {
        if (!(rootKey in parsed)) {
          throw new Error(`响应中未找到根键 "${rootKey}"`);
        }
        console.log(`[${taskId}] ✓ 从根键 "${rootKey}" 解析成功`);
        return parsed[rootKey] as T;
      }

      console.log(`[${taskId}] ✓ 解析成功`);
      return parsed as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 增强错误信息，包含更多上下文
      const enhancedError = lastError.message.includes('原始响应预览')
        ? lastError
        : new Error(`${lastError.message} (尝试 ${attempt + 1}/${maxRetries + 1})`);

      if (attempt < maxRetries) {
        const delay = getExponentialBackoffDelay(attempt);
        console.warn(`[${taskId}] 解析失败: ${enhancedError.message}`);
        console.log(`[${taskId}] 等待 ${delay}ms 后进行第 ${attempt + 2} 次重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[${taskId}] 重试次数用尽，解析最终失败: ${enhancedError.message}`);
        throw enhancedError;
      }
    }
  }

  // 理论上不会到这里
  throw lastError || new Error('未知错误');
}

/**
 * 解析 LLM 响应为 JSON 对象（单次尝试，不重试）
 *
 * @param response - LLM 的原始响应
 * @param options - 解析选项
 * @returns 解析后的 JSON 对象
 * @throws Error - 当解析失败时
 */
export function parseLLMJson<T = Record<string, unknown>>(
  response: string,
  options?: {
    /** 期望的根键名，如果指定则从该键提取值 */
    rootKey?: string;
    /** 打印日志的字符数 */
    logLength?: number;
  }
): T {
  const { rootKey, logLength = 200 } = options || {};

  console.log(`[LLM Parser] 原始响应: ${response.substring(0, logLength)}...`);

  try {
    // 提取并修复 JSON
    const repairedJson = extractAndRepairJson(response);
    console.log(`[LLM Parser] 修复后: ${repairedJson.substring(0, logLength)}...`);

    // 解析 JSON
    const parsed = JSON.parse(repairedJson) as Record<string, unknown>;

    // 如果指定了根键，提取该键的值
    if (rootKey) {
      if (!(rootKey in parsed)) {
        throw new Error(`响应中未找到根键 "${rootKey}"`);
      }
      console.log(`[LLM Parser] ✓ 从根键 "${rootKey}" 解析成功`);
      return parsed[rootKey] as T;
    }

    console.log(`[LLM Parser] ✓ 解析成功`);
    return parsed as T;
  } catch (error) {
    const errorMsg = `[LLM Parser] 解析失败: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
}

/**
 * 安全解析 LLM 响应 - 失败时返回 null 而不是抛出异常
 */
export function parseLLMJsonSafe<T = Record<string, unknown>>(
  response: string,
  options?: {
    rootKey?: string;
    logLength?: number;
  }
): T | null {
  try {
    return parseLLMJson<T>(response, options);
  } catch {
    return null;
  }
}
