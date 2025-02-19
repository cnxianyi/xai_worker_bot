# xai worker bot

这是一个基于 cloudflare Workers 环境实现的无服务器 Telegram bot. 集成ai聊天

## 版本更新

### 1.0.1

添加环境变量 `GUEST_CHAT_ID`

填入用户chatId 即可访问bot

如果没有权限会返回 权限不足:18.....

然后添加进环境变量即可

## 功能

1. **命令支持**：
   - **`/clear`**：清除聊天上下文历史。
   - **`/set`**：为对话添加个性化定制信息。
   - 当消息记录达到 100 条倍数时，提醒当前上下文长度。

2. **AI 聊天**：
   - 接入 AI（如 `https://api.x.ai`）实现对话功能。

## 使用说明

1. **创建workers**
    1. 点击 Workers 和 Pages
    2. 创建
    3. 创建 Worker
    4. 部署
    5. 编辑代码
    6. 返回 Workers 和 Pages 页面

2. **环境变量配置**
    1. 进入Workers 和 Pages
    2. 点击刚创建的worker
    3. 进入设置
    4. 变量和机密 添加以下内容 *全部选择文本*
   - `TELEGRAM_AUTH_TOKEN`：Telegram 机器人授权令牌。
   - `ADMIN_CHAT_ID`：自己的 Telegram Chat ID。
   - `XAI_TOKEN`：外部 AI 服务的访问令牌。
   - `GROK_MODE`：AI 模型名称。
        - 如 `grok-2-1212` `grok-2-vision-1212`
   - `TEMPERATURE`：AI 回答的随机性参数（数值越大回答越随机）
        - 默认为 0

3. **修改代码**
    1. 重新进入Workers 和 Pages
    2. 点击刚创建的worker
    3. 点击右上角的 </> 按钮
    4. 将代码复制进去
    5. 部署
