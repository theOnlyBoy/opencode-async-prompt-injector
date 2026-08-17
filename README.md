# ⚡ OpenCode Async Prompt Injector

**Slide a sticky note under your agent's nose while it's busy thinking.**

No interruption. No restart. The agent picks it up at the earliest opportunity.

---

You know that feeling when someone's mid-story, and you suddenly remember something important… but you don't want to cut them off?

Working with an AI agent is the same — except the agent is the one on a roll. You forgot a detail. A new idea just hit. You want to nudge the direction. Waiting feels wasteful. Interrupting just burns credits.

This plugin lets you drop a message that the agent reads **mid-task**, without breaking its flow.

## ✨ How it works

1. Agent is thinking / using tools.
2. You type `/inject_prompt <your message>` and send.
3. The agent reads it and acts on it within the current flow.

That’s it.

## 📦 Installation

```bash
npm install opencode-async-prompt-injector
```

Then add it to your [opencode.json](https://opencode.ai/docs/config/):

```json
{
  "plugin": ["opencode-async-prompt-injector"]
}
```

Restart OpenCode.

## 🚀 Usage

- **/inject_prompt** Hey, I just updated the tests — check them too
- **/inject_prompt** Change of plans: postpone item #7 until the next round

Your message stays visible exactly as you typed it.
The agent picks it up the moment it’s free to look, without you having to wait for the current task to finish.

## 🛠️ Development

```bash
git clone https://github.com/theOnlyBoy/opencode-async-prompt-injector.git
cd opencode-async-prompt-injector
```

```bash
npm install        # or yarn / pnpm install
npm run build      # or yarn build / pnpm build
```

```bash
opencode           # run OpenCode from the project dir to test the plugin
```

The plugin is registered in `./opencode.json` as `"./dist/index.js"`, so after rebuilding you can test changes right away — just restart OpenCode.

## ⚠️ Model compatibility

This plugin injects your message into the conversation as cleanly as possible. Whether the agent actually _acts_ on it depends on the model.

Most models handle it well. Some (especially smaller or more rigid ones) may treat the injected message as the end of the turn and stop, or respond more cautiously than usual.

There’s no plugin-side fix for that — it’s just how those models interpret turn boundaries. If something feels off, try a different model.

## 🤝 Contributing

Found a bug? Have an idea? PRs and issues are welcome.

Open an [issue](https://github.com/theOnlyBoy/opencode-async-prompt-injector/issues) or submit a pull request — happy to take a look.

## License

MIT
