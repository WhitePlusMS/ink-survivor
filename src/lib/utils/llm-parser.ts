/**
 * LLM 响应 JSON 解析器
 *
 * 使用自定义逻辑 + jsonrepair 双重保障
 * 主要针对 LLM 输出的常见问题：
 * - content 字段中未转义的引号
 * - Markdown 代码块
 * - 各种格式问题
 */

import { jsonrepair } from 'jsonrepair';

/**
 * 指数退避配置
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * 修复 JSON 字符串中 content 字段内未转义的引号
 * 这是 LLM 输出的常见问题：content 中包含中文引号或英文引号导致 JSON 解析失败
 *
 * 示例问题：
 * {"title":"第一章","content":"他说："你好"，然后..."}
 * {"title":"第一章","content":"He said: "Hello world" end"}
 */
function fixUnescapedQuotesInContent(jsonString: string): string {
  // 匹配 "content": "..." 的模式
  // 使用更精确的正则来处理嵌套引号
  return jsonString.replace(
    /("content"\s*:\s*")((?:[^"\\]|\\.)*)(\")/g,
    (match, prefix, content, suffix) => {
      // 修复 content 中的各种引号问题
      let fixed = content
        // 中文左双引号 → 转义
        .replace(/"/g, '\u201C')
        // 中文右双引号 → 转义
        .replace(/"/g, '\u201D')
        // 英文左双引号(开引号) → 转义
        .replace(/(?<!\x5c)"/g, '\\"')
        // 英文右双引号(闭引号) → 转义
        .replace(/"/g, '\\"');

      return prefix + fixed + suffix;
    }
  );
}

/**
 * 修复整个 JSON 字符串中的未转义引号（全局修复）
 */
function fixAllUnescapedQuotes(input: string): string {
  let result = input;

  // 方法1：针对 content 字段的定向修复
  result = fixUnescapedQuotesInContent(result);

  // 方法2：全局修复未转义的英文双引号（但要避免破坏已转义的）
  // 匹配不在字符串内且未转义的引号
  result = result.replace(
    /(?<!\\)(?:\\\\)*(?<!["\\])"(?!\s*:|\s*,|\s*\]|\s*\}|\s*$)/g,
    '\\"'
  );

  return result;
}

/**
 * 从 LLM 响应中提取并修复 JSON
 */
function extractAndRepairJson(response: string): string {
  // 预处理：移除 Markdown 代码块标记
  let processed = response
    .replace(/^```json\s*/g, '')
    .replace(/^```\s*/g, '')
    .replace(/\s*```$/g, '');

  // 检查是否是纯文本
  const trimmed = processed.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.includes('```')) {
    console.log(`[LLM Parser] 检测到纯文本响应，包装成 JSON 格式`);
    return JSON.stringify({
      title: "章节内容",
      content: trimmed
    });
  }

  // 尝试提取 ```json ... ``` 包裹的内容
  const jsonCodeBlock = processed.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonCodeBlock) {
    const content = jsonCodeBlock[1].trim();
    return repairJsonString(content);
  }

  // 尝试提取 ``` ... ``` 包裹的内容
  const plainCodeBlock = processed.match(/```\s*([\s\S]*?)\s*```/);
  if (plainCodeBlock) {
    const content = plainCodeBlock[1].trim();
    return repairJsonString(content);
  }

  // 尝试提取 { ... } 结构
  const firstBrace = processed.indexOf('{');
  const lastBrace = processed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const extracted = processed.substring(firstBrace, lastBrace + 1);
    return repairJsonString(extracted);
  }

  // 最后的备用方案
  console.log(`[LLM Parser] 无法提取 JSON，尝试从文本提取`);
  return extractFieldsFromText(processed);
}

/**
 * 修复 JSON 字符串的完整流程
 * 1. 先尝试自定义修复（针对 content 字段）
 * 2. 再用 jsonrepair 处理其他问题
 * 3. 最后尝试直接解析
 */
function repairJsonString(input: string): string {
  // 第1步：自定义修复未转义引号
  let fixed = fixAllUnescapedQuotes(input);

  // 第2步：验证是否修复成功
  try {
    JSON.parse(fixed);
    return fixed;
  } catch {
    // 第3步：使用 jsonrepair
    try {
      fixed = jsonrepair(fixed);
      JSON.parse(fixed); // 验证
      return fixed;
    } catch {
      // 第4步：提取字段作为后备
      return extractFieldsFromText(input);
    }
  }
}

/**
 * 从纯文本中提取字段
 */
function extractFieldsFromText(text: string): string {
  const titleMatch = text.match(/"title"\s*:\s*"([^"]+)"/) || text.match(/title[:：]\s*([^\n]+)/i);
  const title = titleMatch ? titleMatch[1] : "章节内容";

  const contentMatch = text.match(/```[\s\S]*?```/);
  const content = contentMatch
    ? contentMatch[0].replace(/```\w*\s*/g, '').trim()
    : text;

  return JSON.stringify({
    title,
    content
  });
}

/**
 * 计算指数退避延迟
 */
function getExponentialBackoffDelay(attempt: number): number {
  const delay = Math.min(
    RETRY_CONFIG.baseDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
    RETRY_CONFIG.maxDelayMs
  );
  const jitter = delay * 0.2 * (Math.random() - 0.5) * 2;
  return Math.max(0, Math.round(delay + jitter));
}

/**
 * 带指数退避的 LLM 响应 JSON 解析
 */
export async function parseLLMJsonWithRetry<T = Record<string, unknown>>(
  llmResponseFn: () => Promise<string>,
  options?: {
    rootKey?: string;
    logLength?: number;
    maxRetries?: number;
    taskId?: string;
  }
): Promise<T> {
  const { rootKey, logLength = 200, maxRetries = RETRY_CONFIG.maxRetries, taskId = 'LLM' } = options || {};

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await llmResponseFn();
      console.log(`[${taskId}] LLM 响应 (尝试 ${attempt + 1}/${maxRetries + 1}): ${response.substring(0, logLength)}...`);

      const repairedJson = extractAndRepairJson(response);
      const parsed = JSON.parse(repairedJson) as Record<string, unknown>;

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

  throw lastError || new Error('未知错误');
}

/**
 * 解析 LLM 响应为 JSON 对象（单次尝试）
 */
export function parseLLMJson<T = Record<string, unknown>>(
  response: string,
  options?: {
    rootKey?: string;
    logLength?: number;
  }
): T {
  const { rootKey, logLength = 200 } = options || {};

  console.log(`[LLM Parser] 原始响应: ${response.substring(0, logLength)}...`);

  try {
    const repairedJson = extractAndRepairJson(response);
    console.log(`[LLM Parser] 修复后: ${repairedJson.substring(0, logLength)}...`);

    const parsed = JSON.parse(repairedJson) as Record<string, unknown>;

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
 * 安全解析 - 失败返回 null
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
