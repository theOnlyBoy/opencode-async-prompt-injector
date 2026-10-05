# Changelog

## 1.2.0

- Fixed a bug in v2 plugin registration.

## 1.1.0

- **OpenCode v2 support.** One package, both runtimes — install the same way and use the same
  `/inject_prompt` command. The plugin registers the command itself, so there is nothing extra to set up.
- On v2 your message stays visible in the chat and is queued for the agent, which reads it on its next
  step without the current turn being cut off.
- v1 behaviour is unchanged.

## 1.0.0

- Initial release.
- `/inject_prompt` command to inject messages mid-task while the agent is busy.
