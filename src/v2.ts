/**
 * OpenCode v2 support for the Async Prompt Injector.
 *
 * v1 and v2 need different default exports: v1 loads a plugin **function** (`(ctx, options) => hooks`),
 * while v2 requires a plain **object** (`{ id, setup(ctx) }`) — a callable object is rejected at load
 * time. So the package exposes two entrypoints: the unchanged v1 function in
 * `src/async-prompt-injector.ts` (`main` / `.`) and the v2 object in this file (`./v2`).
 *
 * On v2 the plugin registers `/inject_prompt` via `ctx.command.transform((editor) => editor.add(…))`
 * (`CommandEditor` exposes only `add`; the user's text arrives as `input.prompt.text`) and forwards it
 * as a **queued** prompt through `ctx.session.prompt({ …, delivery: 'queue' })` — the message shows in
 * the chat and the agent reads it when free, without cutting off the current turn. No command file, no
 * markers, nothing to configure. It imports nothing from `@opencode/plugin` (the v2 context is used
 * structurally), so there is no runtime import risk.
 */

import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'

export interface AsyncPromptInjectorV2Options {
  /** Master switch. When false, the plugin does nothing. */
  enabled?: boolean
  /** Delivery mode: `queue` waits for the current turn, `steer` is mid-turn. Defaults to `queue`. */
  delivery?: 'steer' | 'queue'
}

const LOG = process.env.OPENCODE_ASYNC_INJECTOR_LOG ?? join(tmpdir(), 'async-prompt-injector.log')

function log(fields: Record<string, unknown>): void {
  try {
    mkdirSync(dirname(LOG), { recursive: true })
    appendFileSync(LOG, `${JSON.stringify({ ts: new Date().toISOString(), ...fields })}\n`)
  } catch {
    /* never break the host */
  }
}

/**
 * Register the v2 plugin. Safe to call with anything: every hook is feature-detected and wrapped, so a
 * missing domain or a changed callback shape degrades to a no-op instead of breaking the host.
 */
export async function setupV2(ctx: any, options?: AsyncPromptInjectorV2Options): Promise<void> {
  const opts = { enabled: true, delivery: 'queue' as const, ...(options ?? {}) }
  log({ event: 'setup', enabled: opts.enabled, hasSession: Boolean(ctx?.session) })
  if (!opts.enabled) return

  try {
    await ctx?.command?.transform?.((editor: any) => {
      editor?.add?.({
        name: 'inject_prompt',
        description: 'Inject a prompt asynchronously for the agent to read during thinking',
        execute: async (input: any) => {
          const sid = String(input?.sessionID ?? '')
          const text = String(input?.prompt?.text ?? '').trim()
          if (!sid || !text) return
          const delivery = input?.delivery ?? opts.delivery
          try {
            await ctx.session.prompt({ sessionID: sid, text, delivery })
            log({ event: 'command.queued', session: sid, delivery, chars: text.length })
          } catch (err) {
            log({ event: 'command.queue.error', session: sid, error: String(err) })
          }
        },
      })
      log({ event: 'command.registered', name: 'inject_prompt' })
    })
  } catch (err) {
    log({ event: 'command.register.error', error: String(err) })
  }
}

/** OpenCode v2 entrypoint: the plain object v2's loader requires. */
export default {
  id: 'async-prompt-injector',
  setup: async (ctx: any): Promise<void> => {
    await setupV2(ctx, ctx?.options as AsyncPromptInjectorV2Options | undefined)
  },
}
