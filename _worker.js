const TelegramAuthToken = TELEGRAM_AUTH_TOKEN
const AdminChatId = ADMIN_CHAT_ID
const XaiToken = XAI_TOKEN
const GrokMode = GROK_MODE
const Temperature = TEMPERATURE

const webhookEndpoint = "/endpoint";

addEventListener("fetch", event => {
    event.respondWith(handleIncomingRequest(event));
});

let messages = []

async function handleIncomingRequest(event) {
    let url = new URL(event.request.url);
    let path = url.pathname;
    let method = event.request.method;
    let workerUrl = `${url.protocol}//${url.host}`;

    if (method === "GET" && path === "/") {
        const webhookUrl = `https://api.telegram.org/bot${TelegramAuthToken}/setWebhook?url=${workerUrl}${webhookEndpoint}`;
        const response = await fetch(webhookUrl);
        if (response.ok) {
            const responseText = "Webhook set successfully " + GrokMode
            return new Response(responseText, { status: 200 });
        } else {
            return new Response("Failed to set webhook", { status: response.status });
        }
    }

    if (method === "POST" && path === webhookEndpoint) {
        const update = await event.request.json();
        event.waitUntil(processUpdate(update));
        return new Response("Ok");
    } else if (method === "GET" && path === "/configure-webhook") {
        const url = `https://api.telegram.org/bot${TelegramAuthToken}/setWebhook?url=${workerUrl}${webhookEndpoint}`;
        const response = await fetch(url);
        if (response.ok) {
            return new Response("Webhook set successfully", { status: 200 });
        } else {
            return new Response("Failed to set webhook", { status: response.status });
        }
    } else {
        return new Response("Not found", { status: 404 });
    }
}

async function processUpdate(update) {
    try {
        let chatId, userText;

        if ("message" in update) {
            const message = update.message;
            chatId = message.chat.id;
            userText = message.text;

            if (chatId != AdminChatId) {
                const errInfo = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${chatId}&text=权限不足`;
                await fetch(errInfo);
                return
            }

            messages.push({ role: "user", content: userText });

            if (messages.length % 100 == 0) {
                const errInfo = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${chatId}&text=当前上下文长度为${messages.length}`;
                await fetch(errInfo);
            }

            if (userText == "/clear") {
                let responseText = `清除历史记录成功`
                const url = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(responseText)}&parse_mode=Markdown`;
                await fetch(url);

                messages = []

                return
            } else if (userText.startsWith("/set")) {
                let str = userText.slice(4).trim()

                messages.unshift({ "role": "system", "content": str });

                let responseText = `添加个性化信息为: ` + str
                const url = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(responseText)}&parse_mode=Markdown`;
                await fetch(url);
                return
            }

            const myHeaders = new Headers();
            myHeaders.append("Content-Type", "application/json");
            myHeaders.append("Authorization", `Bearer ${XaiToken}`);
            const raw = JSON.stringify({
                messages,
                "model": GrokMode.trim(),
                "stream": false,
                "temperature": +Temperature
            });

            const requestOptions = {
                method: "POST",
                headers: myHeaders,
                body: raw,
                redirect: "follow"
            };

            const response = await fetch(`https://api.x.ai/v1/chat/completions`, requestOptions);
            const result = await response.json();

            if (!result?.choices) {
                const err = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(JSON.stringify(result))}&parse_mode=Markdown`;
                await fetch(err);
                return
            }

            const responseText = result?.choices[0]?.message?.content || "未知错误🙅,请尝试输入 /clear";

            messages.push({ role: "assistant", content: responseText });

            if (messages.length % 100 == 0) {
                const errInfo = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${chatId}&text=当前上下文长度为${messages.length}`;
                await fetch(errInfo);
            }

            const url = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(responseText)}&parse_mode=Markdown`;
            await fetch(url);
        } else {
            return;
        }
    } catch (error) {
        const errorMessage = `⚠️ 机器人错误: ${error.message}`;
        const url = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${AdminChatId}&text=${encodeURIComponent(errorMessage)}`;
        await fetch(url);
    }
}