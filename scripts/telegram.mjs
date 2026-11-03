// Sets up the Telegram alert for new leads.
//
// Usage:
//   TELEGRAM_BOT_TOKEN=… npm run telegram               list the channels (and chats) the bot is in, with their ids
//   TELEGRAM_BOT_TOKEN=… TELEGRAM_CHAT_ID=… npm run telegram -- --test
//                                                       send a test message to those chats
//
// Add the bot to the channel as an admin that can post messages, then write
// any post in the channel: the bot only sees a channel through its updates.
// A public channel can also be given by its username (TELEGRAM_CHAT_ID=@name).

const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
if (!token) {
  console.error("Set TELEGRAM_BOT_TOKEN (from @BotFather).");
  process.exit(1);
}

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
}

if (process.argv.includes("--test")) {
  const chatIds = (process.env.TELEGRAM_CHAT_ID ?? "").split(",").map((id) => id.trim()).filter(Boolean);
  if (!chatIds.length) {
    console.error("Set TELEGRAM_CHAT_ID (run without --test to find it).");
    process.exit(1);
  }
  for (const chatId of chatIds) {
    await call("sendMessage", { chat_id: chatId, text: "✅ تجربة: إشعارات زبائن سديم توصل لهنا." });
    console.log(`Sent to ${chatId}`);
  }
} else {
  const me = await call("getMe");
  const updates = await call("getUpdates", { allowed_updates: ["channel_post", "message", "my_chat_member"] });
  const chats = new Map();
  for (const update of updates) {
    const chat = (update.channel_post ?? update.message ?? update.my_chat_member)?.chat;
    if (chat) chats.set(chat.id, chat);
  }
  console.log(`Bot: @${me.username}`);
  if (!chats.size) {
    console.log("No channels yet: add the bot to the channel as an admin that can post, write a post there, then run this again.");
  }
  for (const chat of chats.values()) {
    console.log(`${chat.id}\t${chat.type}\t${chat.title ?? [chat.first_name, chat.last_name].filter(Boolean).join(" ")}`);
  }
}
