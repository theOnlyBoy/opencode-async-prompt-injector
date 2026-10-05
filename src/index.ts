import type { Plugin } from '@opencode-ai/plugin'
import { AsyncPromptInjector } from './async-prompt-injector.js'
import v2 from './v2.js'

/**
 * Dual-runtime entrypoint (OpenCode **v1 + v2**), per the official v2 migration guide
 * (“Support V1 and V2 from one package”): one object default export carrying both implementations —
 * **v1 calls `server(input, options)`**, **v2 calls `setup(ctx)`**.
 *
 * v1's `PluginModule` is `{ id?: string; server: Plugin }` and v2's `Plugin` is `{ id, setup }`, so a
 * single object serves both loaders. v1 object entrypoints require OpenCode **>= 1.18.29**; the
 * implementation is unchanged from the original function form, just reachable as `server`.
 */
export default {
  id: v2.id,
  setup: v2.setup,
  server: AsyncPromptInjector as Plugin,
}
