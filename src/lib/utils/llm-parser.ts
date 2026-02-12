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
 * 从 LLM 响应中提取并修复 JSON
 *
 * @param response - LLM 的原始响应
 * @returns 修复后的 JSON 字符串
 */
function extractAndRepairJson(response: string): string {
  // 0. 预处理：转义未转义的引号
  const preprocessed = escapeUnescapedQuotes(response);
  let jsonToRepair = preprocessed;

  // 0.5. 检查是否是纯文本（没有任何 JSON 特征）
  const trimmed = response.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[') && !trimmed.includes('```json')) {
    // 纯文本响应，包装成 JSON 对象
    // 这种情况通常发生在章节创作时 LLM 直接返回正文
    console.log(`[LLM Parser] 检测到纯文本响应，包装成 JSON 格式`);
    return JSON.stringify({
      title: "章节内容",
      content: response.trim()
    });
  }

  // 1. 尝试提取 ```json ... ``` 包裹的内容
  const jsonCodeBlock = response.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonCodeBlock) {
    const content = jsonCodeBlock[1].trim();
    try {
      JSON.parse(content);
      return content;
    } catch {
      return jsonrepair(content);
    }
  }

  // 2. 尝试提取 ``` ... ``` 包裹的内容
  const plainCodeBlock = response.match(/```\s*([\s\S]*?)\s*```/);
  if (plainCodeBlock) {
    const content = plainCodeBlock[1].trim();
    return jsonrepair(content);
  }

  // 3. 尝试提取 { ... } 结构（最后一个）
  const firstBrace = response.lastIndexOf('{');
  const lastBrace = response.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const extracted = response.substring(firstBrace, lastBrace + 1);
    try {
      JSON.parse(extracted);
      return extracted;
    } catch {
      return jsonrepair(extracted);
    }
  }

  // 4. 直接尝试修复整个响应（预处理后的）
  return jsonrepair(jsonToRepair.trim());
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
export async function parseLLMJsonWithRetry<T = Record<string, any>>(
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
      const parsed = JSON.parse(repairedJson) as Record<string, any>;

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

      if (attempt < maxRetries) {
        const delay = getExponentialBackoffDelay(attempt);
        console.warn(`[${taskId}] 解析失败 (尝试 ${attempt + 1}/${maxRetries + 1}): ${lastError.message}`);
        console.log(`[${taskId}] 等待 ${delay}ms 后进行第 ${attempt + 2} 次重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`[${taskId}] 重试次数用尽，解析失败: ${lastError.message}`);
        throw new Error(`${lastError.message} (已重试 ${maxRetries} 次)`);
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
export function parseLLMJson<T = Record<string, any>>(
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
    const parsed = JSON.parse(repairedJson) as Record<string, any>;

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
    throw new Error(`${errorMsg}, 原始响应: ${response.substring(0, 500)}...`);
  }
}

/**
 * 安全解析 LLM 响应 - 失败时返回 null 而不是抛出异常
 */
export function parseLLMJsonSafe<T = Record<string, any>>(
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
