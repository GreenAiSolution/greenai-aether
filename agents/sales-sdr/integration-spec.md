# AETHER — Sales SDR Agent · Integration Spec v1.0

How a client's Sales SDR Agent gets configured and shipped in 48 hours.

## Required connections (collected during onboarding)
| Connector | Purpose | OAuth via |
|---|---|---|
| Gmail **or** Outlook | Send/receive prospect emails | Pipedream Connect |
| Google Calendar **or** Outlook Calendar | Read availability, book demos | Pipedream Connect |
| HubSpot **or** Salesforce | Lead create/update, activity log | Native OAuth |
| Slack | Hot-lead alerts to the sales team | Slack OAuth |
| Web-form webhook | Trigger on form-fill | Direct webhook URL (we give them one) |

## Optional connections (quality boosters)
| Connector | Purpose |
|---|---|
| Clearbit / Apollo / Hunter | Lead enrichment + firmographics |
| LinkedIn Sales Navigator | Persona insights |
| Twilio | SMS follow-up channel |
| Calendly | Alternative scheduling backend |

## Per-client configuration variables
Populated from the website onboarding form + kickoff call:

- `COMPANY_NAME`, `COMPANY_URL`, `COMPANY_DESCRIPTION` (one paragraph)
- `AGENT_NAME` (default: *"Aria"*)
- `SALES_REP_EMAILS` (list — for round-robin AE routing)
- `HOT_LEAD_SLACK_CHANNEL` (default: `#sales-handoff`)
- `ICP_DESCRIPTION` (Ideal Customer Profile, one paragraph)
- `CASE_STUDIES_URL` (or attached PDFs — ingested to vector DB)
- `PRICING_RULES` (what may / may not be disclosed)
- `SUPPRESSION_LIST_URL` (CSV or webhook)
- `EXCLUDED_DOMAINS` (competitor / unwanted-source list)
- `TIMEZONE` (IANA, e.g. `America/Toronto`)
- `MAX_DAILY_MESSAGES_PER_LEAD` (default: 2)

## Delivery stack
- **LLM:** `claude-opus-4-8` (primary) with `claude-sonnet-4-6` fallback for cost-sensitive turns
- **Runtime:** n8n Cloud (one workspace per client) — workflow JSON template at `./n8n-workflow.json` *(to be exported once n8n workspace is provisioned)*
- **State + memory:** Supabase (Postgres + pgvector); one project per client
- **Knowledge ingestion:** LlamaIndex → pgvector (client case studies, FAQ, product docs)
- **Observability:** Langfuse for traces; Sentry for errors

## n8n workflow shape
1. **Webhook trigger** → `POST /sdr-intake`
2. **HTTP Request** → Anthropic Messages API (with `system-prompt.md` rendered with client vars)
3. **Function node** → parse tool calls from the response
4. **Switch** → route to the correct tool (CRM / Calendar / Email / Slack / Knowledge)
5. **Persist** → lead state in Supabase (`leads` table)
6. **Loop** back into the LLM for the next turn until `stop_reason == "end_turn"` or human handoff is triggered

## 48-hour delivery checklist (internal, per client)
- [ ] **H+0** — receive intake from website onboarding flow
- [ ] **H+1** — provision n8n workspace, Supabase project, scoped Anthropic key
- [ ] **H+4** — wire OAuth connections (Gmail / Calendar / CRM / Slack)
- [ ] **H+8** — ingest client knowledge base into pgvector
- [ ] **H+12** — render system prompt with client vars; configure tool schemas
- [ ] **H+24** — internal QA: run 20 synthetic leads end-to-end
- [ ] **H+36** — client UAT call: walk through dashboard, run 3 live tests together
- [ ] **H+40** — client sign-off; flip webhook URL from staging to production
- [ ] **H+48** — go-live + monitoring active; success manager assigned

## Pricing tie-back
| GreenAI plan | What client gets here |
|---|---|
| **Spark** | This SDR Agent as a templated deploy — 5-day build, shared cloud, monthly tuning |
| **Catalyst** | This SDR Agent fully customized to their business — 48hr build, dedicated cloud, business-hours monitoring |
| **Momentum** | This SDR Agent + 4 more orchestrated agents (e.g. inbox triage, reporting), 24/7 ops, dedicated CSM |
| **Enterprise** | This SDR Agent + unlimited fleet, on-prem/VPC option, custom fine-tuning, dedicated eng pod |

---

*v1.0 · 2026-06-20 · maintained by GreenAI Solutions · jaden@greenaidigital.com*
