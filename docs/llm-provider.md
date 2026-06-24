# LLM Provider Configuration

Signal keeps rule-based scoring separate from LLM review. The LLM layer is used as a reviewer/critic and limited score adjuster, so stronger frontier models can improve risk review, bull/bear case quality, and target/stop sanity checks without replacing the deterministic gates.

## Default: DeepSeek

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
LLM_REASONING_MODEL=deepseek-chat
LLM_WORKER_MODEL=deepseek-chat
LLM_CRITIC_MODEL=deepseek-chat
```

## OpenAI-Compatible Providers

Use this path for OpenAI-compatible APIs and gateways.

```env
LLM_PROVIDER=openai-compatible
LLM_API_KEY=...
LLM_BASE_URL=https://api.openai.com
LLM_MODEL=gpt-4.1
LLM_REASONING_MODEL=gpt-4.1
LLM_WORKER_MODEL=gpt-4.1-mini
LLM_CRITIC_MODEL=gpt-4.1
```

For gateways such as OpenRouter, set `LLM_BASE_URL` to the gateway base URL and use the model ids required by that service.

## GUI Settings and Admin Protection

The `/settings` screen can read environment defaults and, when Supabase is configured, save LLM settings to the `llm_settings` table.

```env
APP_ADMIN_TOKEN=change-me
APP_SETTINGS_ENCRYPTION_KEY=use-a-long-random-secret
```

- `APP_ADMIN_TOKEN` protects LLM settings, LLM connection tests, daily scan, and external-pack routes.
- Send it as `Authorization: Bearer <token>` or `x-signal-admin-token: <token>` when calling protected APIs directly.
- In the `/settings` screen, enter the same value in the `Admin token` field before loading, saving, or testing GUI-managed settings.
- The browser stores that admin token in localStorage for convenience, so use this GUI only from a trusted local/private browser session.
- In production, protected admin APIs fail closed when `APP_ADMIN_TOKEN` is missing.
- `APP_SETTINGS_ENCRYPTION_KEY` encrypts saved API keys. In production it is required before writing GUI-managed LLM settings.
- Do not reuse `SUPABASE_SERVICE_ROLE_KEY` as the settings encryption key in production.

## Model Roles

- `LLM_REASONING_MODEL`: main analysis reviewer. Use the strongest model here.
- `LLM_CRITIC_MODEL`: critical reviewer for strong candidates or when critic mode is enabled. Use a strong model here when budget allows.
- `LLM_WORKER_MODEL`: JSON repair worker. This can be a cheaper reliable model.

## Safety Boundary

The LLM cannot freely override Signal's rule-based engine:

- score adjustments are clamped to +/-10
- low data confidence blocks optimistic upgrades
- event blockers, forbidden symbols, high-risk cases, and avoid classifications block positive LLM adjustments
- final action is reclassified through deterministic gates after LLM adjustment

The LLM input includes score contributions, gate details, and decision reasons so frontier models can audit why a signal was produced instead of only seeing final scores.
