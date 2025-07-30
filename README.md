Unified Collections Reconciliation Portal

**Demo**: https://earnest-biscochitos-360a39.netlify.app

**Problem Statement**
Today, merchants collect payments from diverse channels.
BBPS bill payments (often via multiple vendors like Axis, Pine, Canara)
Payment gateways (Razorpay, PayU, Cashfree, etc.)
Custom flows like WhatsApp-based bill payments or direct links

Each channel:
Settles independently (usually T+1)
Sends a settlement file (e.g. MPRs) in its own format
Offers no unified view
Leads to fragmented reporting, blind spots, and manual reconciliations

**What this Product solves**
This reconX product is a self-serve reconciliation and analytics tool for merchants who manage multi-channel collections. It brings structure, automation, and insights to otherwise scattered operations.

**Tech Notes**
- File parser & mapping engine built using AI
- Modular design ready to plug in SFTP integrations, auto-fetchers.
- Designed with review-first workflow, supports TDD-friendly development

**Why This Matters**
- Built to bring sanity to payment ops.
- Ideal for finance & ops teams reconciling across BBPS + PGs + more.
- Designed with Test-Driven Development
- Reviews gated by clear planning & confirmation checkpoints
- Modular & extendable to add auto-fetching, SFTP integrations, live APIs in future versions
- Secure by design — meant for merchant-grade workflows
