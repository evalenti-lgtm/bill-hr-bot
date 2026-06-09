const { App } = require("@slack/bolt");
const Anthropic = require("@anthropic-ai/sdk");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function searchClickUp(query) {
  try {
    const response = await fetch(
      `https://api.clickup.com/api/v2/team/${process.env.CLICKUP_TEAM_ID}/doc?query=${encodeURIComponent(query)}&limit=5`,
      {
        headers: {
          Authorization: process.env.CLICKUP_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    const text = await response.text();
console.log("ClickUp raw response:", text.slice(0, 500));
const data = JSON.parse(text);
    console.log("ClickUp response:", JSON.stringify(data).slice(0, 500));
    return JSON.stringify(data).slice(0, 3000);
  } catch (err) {
    console.error("ClickUp error:", err);
    return "No ClickUp data found.";
  }
}

const BILL_SYSTEM_PROMPT = `You are Bill, Impossible Cloud's friendly HR and compliance assistant.

Answer HR and compliance questions for Impossible Cloud team members.
You have two sources of knowledge:
1. ClickUp People Space data (provided in the user message as context)
2. General HR knowledge (German labor law, EU regulations, GDPR, standard HR practices)

Always check the ClickUp context first. If it has relevant info, use it and label with:
📋 Source: ClickUp — People Space

If not, use general knowledge and label with:
📚 Source: General HR / Compliance knowledge

If you genuinely cannot answer, say:
"I don't have a reliable answer to this yet — but the HR team is on it and will follow up with you directly."
Then tell them to contact Marilena (mp@impossiblecloud.com) or Henning (hrenken@impossiblecloud.com).

Be friendly, warm, and concise. Never guess on legally sensitive individual matters.`;

app.message(async ({ message, say }) => {
  if (message.subtype) return;
  try {
    const clickupData = await searchClickUp(message.text);
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: BILL_SYSTEM_PROMPT,
      messages: [{
        role: "user",
        content: `ClickUp context: ${clickupData}\n\nQuestion: ${message.text}`
      }],
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
