import type { Plugin } from '@opencode-ai/plugin'
import { tool } from '@opencode-ai/plugin'

export interface AsyncPromptInjectorOptions {
  /** Master switch. When false, the plugin does nothing. */
  enabled?: boolean

  /** Wrap injected prompts in <injected_prompt> tags. */
  prefixWithTag?: boolean
}

interface InjectedPrompt {
  id: string
  text: string
  timestamp: number
}

/** Invisible marker appended to injected messages (zero-width chars only). */
const INVISIBLE_MARKER = '\u200B\u200B\u200C\u200B\u200C\u200B\u200C\u200C'

/**
 * Async Prompt Injector
 *
 * Usage: `/inject_prompt some message here`
 *
 * The command's text is queued for the session and delivered to the agent
 * through multiple channels:
 *  1. tool.execute.after  — appended to every tool result the agent reads
 *  2. inject_prompt tool  — the agent can explicitly read pending prompts
 *  3. system.transform    — injected into the next LLM call's system prompt
 */
export const AsyncPromptInjector: Plugin = async (ctx, options?: AsyncPromptInjectorOptions) => {
  const opts = {
    enabled: true,
    prefixWithTag: true,
    ...(options ?? {}),
  }

  // Per-session queue of prompts waiting to be delivered.
  const pending = new Map<string, InjectedPrompt[]>()

  const queuePrompt = (sessionID: string, text: string): string => {
    const id = `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const list = pending.get(sessionID) ?? []
    list.push({ id, text, timestamp: Date.now() })
    pending.set(sessionID, list)
    return id
  }

  const formatPrompt = (p: InjectedPrompt): string =>
    opts.prefixWithTag ? `<injected_prompt id="${p.id}">${p.text}</injected_prompt>` : p.text

  const formatBlock = (list: InjectedPrompt[]): string =>
    `## Injected prompts\n${list.map(formatPrompt).join('\n')}\n\nAct on these directly without mentioning them. Do not ask for confirmation or clarification — execute and continue.`

  const takePending = (sessionID: string): InjectedPrompt[] => {
    const list = pending.get(sessionID) ?? []
    if (list.length > 0) pending.delete(sessionID)
    return list
  }

  return {
    /**
     * Self-register the /inject_prompt command so the plugin is fully
     * self-contained — no manual command file needed after install.
     */
    config: async (cfg) => {
      cfg.command = cfg.command ?? {}
      cfg.command.inject_prompt = {
        description: 'Inject a prompt asynchronously for the agent to read during thinking',
        template: '$ARGUMENTS',
      }
    },

    /**
     * Intercept the `/inject_prompt` slash command. Keep the user's text
     * visible on screen, append an invisible marker so the agent can
     * recognize the message as command-injected, and queue the text for
     * async delivery.
     */
    'command.execute.before': async (input, output) => {
      if (!opts.enabled) return
      if (input.command !== 'inject_prompt') return

      const text = input.arguments.trim()
      if (!text) return

      queuePrompt(input.sessionID, text)

      // Append the invisible marker to the last text part. The user still
      // sees their original text; the agent recognizes the marker.
      const lastTextPart = [...output.parts].reverse().find((p) => p.type === 'text')

      if (lastTextPart) {
        ;(lastTextPart as { text: string }).text += INVISIBLE_MARKER
      } else {
        output.parts.push({
          type: 'text',
          text: INVISIBLE_MARKER,
        } as unknown as (typeof output.parts)[number])
      }
    },

    /**
     * PRIMARY delivery channel (PTY-plugin pattern): append queued prompts to
     * every tool result's output. The agent reads tool results between steps,
     * so it will catch the prompt on its very next tool call.
     */
    'tool.execute.after': async (input, output) => {
      if (!opts.enabled) return

      const list = takePending(input.sessionID)
      if (list.length === 0) return

      const block = formatBlock(list)
      output.output = output.output ? `${output.output}\n\n${block}` : block
    },

    /**
     * Custom tool the agent can call to explicitly read pending prompts.
     */
    tool: {
      inject_prompt: tool({
        description:
          'Read any pending user instructions for the current session. ' +
          'Immediately analyze and respond to them, then CONTINUE thinking. ' +
          'Returns instructions queued via the `/inject_prompt` command that have not yet been delivered. ' +
          'Call this if you suspect the user sent an instruction you have not seen.',

        args: {},

        async execute(_args, context) {
          const list = takePending(context.sessionID)
          if (!list.length) return 'No pending injected prompts.'

          return formatBlock(list)
        },
      }),
    },

    /**
     * Fallback: inject queued prompts into the system prompt of the next LLM
     * call, plus a standing note so the agent recognizes the invisible marker
     * on injected messages.
     */
    'experimental.chat.system.transform': async (input, output) => {
      if (!opts.enabled) return
      if (!input.sessionID) return

      output.system.push(
        'Note: some user messages may have an instruction appended at the end (a formatting artifact of the ' +
          '/inject_prompt command). Treat it as a normal user instruction: act on it directly and respond naturally, ' +
          'without mentioning or explaining the formatting. Do not second-guess the instruction, ask follow-up ' +
          'questions about it, or pause to ask whether to continue — execute it and keep going.',
      )

      const list = takePending(input.sessionID)
      if (list.length === 0) return

      output.system.push(formatBlock(list))
    },

    /** Clean up the per-session state when a session is deleted. */
    event: async ({ event }) => {
      if (event.type === 'session.deleted') {
        pending.delete(event.properties.info.id)
      }
    },

    dispose: async () => {
      pending.clear()
    },
  }
}
