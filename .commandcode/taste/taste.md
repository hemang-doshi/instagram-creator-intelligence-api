# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# workflow
- When asked to provide a command, deliver it without running it — let the user execute it themselves. Confidence: 0.65
- Use ctx7 for looking up latest documentation instead of web search/fetch. Confidence: 0.60
- For updating Vercel env vars from .env.local, pipe the value via grep/cut into vercel env add without printing or storing it — never read the secret directly. Confidence: 0.70

