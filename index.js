const { App } = require("@slack/bolt");
const Anthropic = require("@anthropic-ai/sdk");

console.log("Starting Bill...");
console.log("SLACK_APP_TOKEN exists:", !!process.env.SLACK_APP_TOKEN);
console.log("SLACK_BOT_TOKEN exists:", !!process.env.SLACK_BOT_TOKEN);
console.log("SLACK_SIGNING_SECRET exists:", !!process.env.SLACK_SIGNING_SECRET);
console.log("ANTHROPIC_API_KEY exists:", !!process.env.ANTHROPIC_API_KEY);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BILL_SYSTEM_PROMPT = `You are Bill, Impossible Cloud's friendly HR and compliance assistant. Answer HR questions helpfully and concisely.`;

app.message(async ({ message, say }) => {
  if (message.subtype) return;
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: BILL_SYSTEM_PROMPT,
      messages: [{ role: "user", content: message.text }],
    });
    await say({ text: response.content[0].text, thread_ts: message.ts });
  } catch (err) {
    console.error(err);
    await say({ text: "Sorry, something went wrong!", thread_ts: message.ts });
  }
});

(async () => {
  await app.start();
  console.log("Bill is running!");
})();
