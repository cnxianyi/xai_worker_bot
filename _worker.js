const TelegramAuthToken = TELEGRAM_AUTH_TOKEN
const AdminChatId = ADMIN_CHAT_ID
let GuestChatId = GUEST_CHAT_ID.split(",")
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

            if (chatId != AdminChatId && !GuestChatId.includes(chatId + "")) {
                const errInfo = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${chatId}&text=权限不足:${chatId}`;
                await fetch(errInfo);
                return;
            }

            messages.push({ role: "user", content: userText });

            if (userText == "/clear") {
                let responseText = `清除历史记录成功`;
                const url = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(responseText)}&parse_mode=Markdown`;
                await fetch(url);
                messages = [];
                return;
            } else if (userText.startsWith("/set")) {
                let str = userText.slice(4).trim();
                messages.unshift({ "role": "system", "content": str });
                let responseText = `添加个性化信息为: ` + str;
                const url = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(responseText)}&parse_mode=Markdown`;
                await fetch(url);
                return;
            }

            const myHeaders = new Headers();
            myHeaders.append("Content-Type", "application/json");
            myHeaders.append("Authorization", `Bearer ${XaiToken}`);
            const raw = JSON.stringify({
                messages,
                "model": GrokMode.trim(),
                "stream": true,
                "temperature": +Temperature
            });

            const requestOptions = {
                method: "POST",
                headers: myHeaders,
                body: raw,
                redirect: "follow"
            };

            const response = await fetch(`https://api.x.ai/v1/chat/completions`, requestOptions);

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const reader = response.body.getReader();
            let decoder = new TextDecoder();
            let buffer = '';
            let accumulatedText = '';
            let messageId;
            let lastUpdateTime = Date.now();

            const initialMessageUrl = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${chatId}&text=...&parse_mode=Markdown`;
            const initialMessageResponse = await fetch(initialMessageUrl);
            const initialMessageResult = await initialMessageResponse.json();
            messageId = initialMessageResult.result.message_id;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                let parts = buffer.split('\n');
                for (let part of parts) {
                    if (part.startsWith('data:')) {
                        try {
                            let data = JSON.parse(part.slice(5));
                            if (data?.choices?.[0]?.delta?.content) {
                                let newText = data.choices[0].delta.content;
                                accumulatedText += newText;
                                const currentTime = Date.now();
                                if (currentTime - lastUpdateTime >= 500) {
                                    let appendUrl = `https://api.telegram.org/bot${TelegramAuthToken}/editMessageText?chat_id=${chatId}&message_id=${messageId}&text=${encodeURIComponent(accumulatedText)}&parse_mode=Markdown`;
                                    await fetch(appendUrl);
                                    lastUpdateTime = currentTime;
                                }
                            }
                        } catch (e) {

                        }
                    }
                }
                buffer = parts.pop() || '';
            }

            let finalUrl = `https://api.telegram.org/bot${TelegramAuthToken}/editMessageText?chat_id=${chatId}&message_id=${messageId}&text=${encodeURIComponent(accumulatedText)}&parse_mode=Markdown`;
            await fetch(finalUrl);

            messages.push({ role: "assistant", content: accumulatedText });
        }
    } catch (error) {
        const errorMessage = `⚠️ 机器人错误: ${error.message}`;
        const url = `https://api.telegram.org/bot${TelegramAuthToken}/sendMessage?chat_id=${AdminChatId}&text=${encodeURIComponent(errorMessage)}`;
        await fetch(url);
    }
}