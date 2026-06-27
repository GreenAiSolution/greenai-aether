# AETHER — Inbox Triage Agent · Integration Spec v1.0

How a client's Inbox Triage Agent gets configured and shipped in 48 hours.

## Required connections (collected during onboarding)
| Connector | Purpose | OAuth via |
|---|---|---|
| Gmail **or** Outlook 365 | Read, draft, label, archive, forward, snooze | Pipedream Connect (Google) or Microsoft Graph |
| Google Calendar **or** Outlook Calendar | Meeting confirms, scheduling, slot lookup | Pipedream Connect |
| Slack | VIP alerts + daily digest delivery | Slack OAuth |

## Optional connections (recommended for full value)
| Connector | Purpose |
|---|---|
| HubSpot / Salesforce / Pipedrive | Auto-log prospect emails as activities, enrich sender context |
| Notion / Linear / Asana | Forward action items as tickets/tasks |
| Twilio | SMS for the VIP-NOW tier (waking the operator for true fires) |
| Zoom / Google Meet | Auto-attach meeting links to confirmations |
| QuickBooks / Stripe | Route invoices and receipts automatically |

## Per-client configuration variables
Populated from the website onboarding form + kickoff call:

- `OPERATOR_NAME`, `OPERATOR_FIRST_NAME`, `OPERATOR_EMAIL`, `OPERATOR_TIMEZONE`
- `COMPANY_NAME`, `COMPANY_DESCRIPTION` (one paragraph — used for sender-relevance scoring)
- `AGENT_NAME` (default: *"Atlas"*)
- `OPERATING_MODE` — `CONSERVATIVE` / `BALANCED` / `AGGRESSIVE` (see system prompt)
- `VIP_LIST` — emails or domains that always alert
- `VIP_ALERT_CHANNEL` (default: operator's private Slack DM)
- `AUTO_REPLY_OK_VIPS` — VIPs the agent may auto-reply to (rare; usually empty)
- `NEVER_AUTO_LIST` — senders that always reach the operator personally
- `BLOCK_LIST` — senders to ignore entirely
- `DIGEST_TIME` (default: `07:30`, operator timezone)
- `DIGEST_CHANNELS` — `email`, `slack`, or both
- `VOICE_SAMPLES_URL` — link to 20–50 of operator's past sent emails (anonymized OK) for tone matching, ingested into vector DB
- `CONFIDENTIAL_LABELS` — Gmail/Outlook labels marking threads the agent must never act on
- `TEAM_ROUTING` — JSON map of `email_pattern → teammate_email` (e.g. `invoices@ → ap@company.com`)

## Delivery stack
- **LLM:** `claude-opus-4-8` for first triage of complex/ambiguous threads; `claude-sonnet-4-6` for categorization of routine email (cost optimization)
- **Runtime:** n8n Cloud — one workspace per client
- **Email watcher:** Gmail Push Notifications via Pub/Sub *(Gmail)* or Microsoft Graph webhooks *(Outlook)* — sub-30-second latency from inbox arrival to agent action
- **State + memory:** Supabase (Postgres + pgvector); per-client schema
- **Voice training:** LlamaIndex → pgvector ingestion of `VOICE_SAMPLES_URL` so `knowledge.search()` returns tone-matched examples
- **Observability:** Langfuse traces + a per-client triage dashboard (categorized counts, time-saved estimate, error rate)

## n8n workflow shape
1. **Webhook / push subscription** → new email arrives in operator inbox
2. **Function node** → fetch full message, fetch last 3 thread messages, fetch sender context from CRM + contacts
3. **HTTP Request** → Anthropic Messages API with system prompt rendered with client vars + tool definitions
4. **Switch** → route to correct tool per model decision (label / draft / archive / forward / notify / snooze)
5. **Persist** → `triage.log()` entry + update `time_saved_estimate` counter in Supabase
6. **Loop** back into the LLM for next-turn decisions until `stop_reason == "end_turn"`
7. **Daily cron at DIGEST_TIME** → assemble digest from past 24h of logs, send via email + Slack

## Time-saved math (use on sales calls)
Used to justify the price on every cold call:

| Inbox volume | Hours/day saved | At $200/hr blended rate | Monthly value |
|---|---|---|---|
| **80 emails/day** | ~1 hr | $200/day | **$4,400/mo** |
| **150 emails/day** | ~2 hr | $400/day | **$8,800/mo** |
| **300+ emails/day** | ~3 hr | $600/day | **$13,200/mo** |

Against Spark ($797/mo) that's a **5.5×–17× ROI**. Against Catalyst ($2,497/mo) it's still **1.8×–5.3×**. Both pay for themselves inside the first month.

## 48-hour delivery checklist (internal, per client)
- [ ] **H+0** — receive intake from website onboarding flow
- [ ] **H+1** — provision n8n workspace, Supabase project, scoped Anthropic key
- [ ] **H+3** — wire Gmail/Outlook OAuth, Calendar OAuth, Slack OAuth
- [ ] **H+6** — set up email push subscription (Gmail Pub/Sub OR Microsoft Graph webhook)
- [ ] **H+10** — ingest 20–50 sent-email voice samples from operator into pgvector
- [ ] **H+14** — configure VIP_LIST, NEVER_AUTO_LIST, TEAM_ROUTING from kickoff-call answers
- [ ] **H+24** — internal QA: run 50 synthetic emails through pipeline; verify categorization accuracy >90%
- [ ] **H+30** — operator UAT: 2-hour shadow session, agent triages live email with operator approving every action
- [ ] **H+40** — switch from shadow to live (Operating Mode = CONSERVATIVE by default)
- [ ] **H+48** — go-live + monitoring active; CSM scheduled for day-7 tuning call

## Pricing tie-back
| GreenAI plan | What client gets here |
|---|---|
| **Spark** | This Inbox Triage Agent (templated, Conservative mode), Gmail or Outlook, 5-day build, shared cloud, monthly tuning |
| **Catalyst** | This agent fully customized to operator's voice + workflows, full connector set, dedicated cloud, business-hours monitoring, 48hr build |
| **Momentum** | This agent + Sales SDR + 3 more (e.g. document triage, reporting, ops), 24/7 ops, dedicated CSM |
| **Enterprise** | All of the above + on-prem/VPC option, custom voice fine-tuning, dedicated eng pod |

## Common-question quick reference (for the sales team)
**Q: Will it learn my voice?** Yes — we ingest 20–50 of your sent emails on day one, and the agent pattern-matches them on every draft. By week 2 it sounds like you. By week 4, most recipients won't notice the difference.

**Q: What if I want to read every email myself?** That's Conservative mode — the agent categorizes, drafts, and archives only true noise. You still see every meaningful message. It just arrives pre-sorted and pre-drafted.

**Q: Can it actually send emails on my behalf?** Only the four pre-approved patterns in Balanced mode (meeting confirms, intro acks, calendar shares, polite declines). For everything else, you click "send" — the agent does the writing.

**Q: What about confidential threads?** Any thread labeled `confidential` (or your custom label) is invisible to the agent. It never reads, drafts on, or summarizes those threads.

**Q: HIPAA?** Healthcare deployments require a BAA with both us and Anthropic before go-live (~2 weeks). Don't promise day-of activation for healthcare clients.

---

*v1.0 · 2026-06-21 · maintained by GreenAI Solutions · jaden@greenaidigital.com*
