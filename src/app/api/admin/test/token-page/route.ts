/**
 * 测试 Token 获取页面
 * GET /api/admin/test/token-page
 *
 * 返回一个简单的 HTML 页面，显示如何获取 Token
 */

export async function GET() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>获取 SecondMe Token</title>
  <style>
    body { font-family: Arial; padding: 20px; max-width: 800px; margin: 0 auto; }
    .step { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
    code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
    .token { background: #fff3cd; padding: 10px; word-break: break-all; }
    button { background: #007bff; color: white; border: none; padding: 10px 20px; cursor: pointer; }
    button:hover { background: #0056b3; }
    #tokenResult { margin-top: 20px; }
  </style>
</head>
<body>
  <h1>获取 SecondMe Token 用于测试</h1>

  <div class="step">
    <h3>方式 1：从浏览器获取（推荐）</h3>
    <ol>
      <li>确保你已经登录 <a href="https://app.mindos.com" target="_blank">SecondMe / MindOS</a></li>
      <li>按 <code>F12</code> 打开浏览器开发者工具</li>
      <li>切换到 <code>Network</code> 标签</li>
      <li>刷新页面</li>
      <li>找到一个请求（通常是 <code>user/info</code>）</li>
      <li>查看 <code>Request Headers</code>，找到 <code>Authorization: Bearer lba_at_xxx</code></li>
      <li>复制完整的 Token</li>
    </ol>
  </div>

  <div class="step">
    <h3>方式 2：使用 API 获取</h3>
    <p>如果你是登录状态，可以直接获取 Token：</p>
    <button onclick="getTokenFromApi()">获取我的 Token</button>
    <div id="tokenResult"></div>
  </div>

  <div class="step">
    <h3>如何配置 Token</h3>
    <p>获取 Token 后，将其添加到 <code>.env</code> 文件中：</p>
    <pre>SECONDME_TEST_TOKEN="你的Token"</pre>
    <p>或者直接在这里粘贴 Token 进行测试：</p>
    <input type="text" id="tokenInput" placeholder="粘贴 Token" style="width: 100%; padding: 10px;">
    <button onclick="useToken()" style="margin-top: 10px;">使用此 Token 测试</button>
  </div>

  <script>
    async function getTokenFromApi() {
      const result = document.getElementById('tokenResult');
      result.innerHTML = '正在获取...';

      try {
        const response = await fetch('/api/oauth/authorize/external', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clientId: 'd689aefb-6618-4c25-9d02-3c901bca2184',
            redirectUri: 'http://localhost:3000/api/auth/callback',
            scope: ['user.info', 'chat'],
            state: 'test-' + Date.now()
          })
        });

        const data = await response.json();

        if (data.code === 0 && data.data.accessToken) {
          result.innerHTML = \`
            <div class="token">
              <strong>Token:</strong><br>
              \${data.data.accessToken}<br>
              <strong>过期时间:</strong> \${data.data.expiresIn} 秒
            </div>
            <p>✅ 复制上面的 Token 并添加到 .env 文件的 SECONDME_TEST_TOKEN</p>
          \`;
        } else {
          result.innerHTML = \`
            <div class="token">
              \${JSON.stringify(data, null, 2)}
            </div>
            <p>❌ 获取失败。如果你没有登录，请先登录 SecondMe</p>
          \`;
        }
      } catch (error) {
        result.innerHTML = \`<p>❌ 错误: \${error.message}</p>\`;
      }
    }

    async function useToken() {
      const token = document.getElementById('tokenInput').value.trim();
      if (!token) {
        alert('请先输入 Token');
        return;
      }

      // 测试 Token 是否有效
      try {
        const response = await fetch('https://app.mindos.com/gate/lab/api/secondme/user/info', {
          headers: {
            'Authorization': 'Bearer ' + token
          }
        });

        const data = await response.json();

        if (data.code === 0) {
          alert('✅ Token 有效！用户: ' + data.data.name);
        } else {
          alert('❌ Token 无效: ' + data.message);
        }
      } catch (error) {
        alert('❌ 错误: ' + error.message);
      }
    }
  </script>
</body>
</html>
  `;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
