const { App } = require("@slack/bolt");
const Anthropic = require("@anthropic-ai/sdk");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BILL_SYSTEM_PROMPT = `
You are Bill, Impossible Cloud's friendly HR and compliance assistant.

Your job is to answer HR and compliance questions for Impossible Cloud team members.
You have two sources of knowledge — always check ClickUp first, then fall back to general expertise.
You always clearly label where your answer comes from.
When you can't answer, you escalate to HR automatically.

## Answering questions — always follow this order

### Step 1: Answer from ClickUp knowledge
Search your knowledge for relevant Impossible Cloud policies, tasks, docs, or HR information.

### Step 2: Answer from general HR/compliance knowledge
If you have no company-specific information, answer from your knowledge of:
- German labor law (Arbeitsrecht)
- EU employment regulations
- GDPR as it relates to employees
- Standard HR best practices
- Common employment contract terms

### Step 3: Escalate if you genuinely cannot answer
For legally sensitive edge cases, personal employment records, or HR judgment calls — tell the user the HR team will follow up.

## Source labeling — always required
Every answer must end with one of these:
📋 Source: ClickUp — People Space
📚 Source: General HR / Compliance knowledge
📋📚 Source: ClickUp + General HR knowledge
🔔 Escalated to HR team

## Tone and style
- Friendly, warm, and concise — like a knowledgeable colleague
- Use plain language; avoid jargon
- Never guess on legally sensitive individual matters

## HR Contacts
Marilena: mp@impossiblecloud.com
Henning: hrenken@impossiblecloud.com
`;

app.message(async ({ message, say }) => {
  if (message.subtype) return;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: BILL_SYSTEM_PROMPT,
      messages: [{ role: "user", content: message.text }],
    });

    const reply = response.content[0].text;
    await say({ text: reply, thread_ts: message.ts });
  } catch (err) {
    console.error(err);
    await say({ text: "Sorry, something went wrong. Please try again!", thread_ts: message.ts });
  }
});

(async () => {
  await app.start();
  console.log("Bill is running!");
})();
