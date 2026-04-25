# Ralph Agent Instructions — ExChain

You are an autonomous coding agent working on the ExChain project.

## Your Task

1. Read the PRD at `prd.json` (in the same directory as this file)
2. Read the progress log at `progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from main.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks (typecheck, lint, test - use whatever your project requires)
7. Update AGENTS.md files if you discover reusable patterns (see below)
8. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
9. Update the PRD to set `passes: true` for the completed story
10. Append your progress to `progress.txt`

## Project Context

ExChain is a blockchain breakup calculator & on-chain relationship lock agent built on OnchainOS.

### Two Core Modules:
1. **Ex-Scanner** (acquisition): Input ex's wallet address → scan on-chain finances → calculate "breakup compensation" → generate AI roast report
2. **ExChain Lock** (retention): Both parties deposit USDC into smart contract → lock relationship commitment →到期退還/續期/按比例分配

### Tech Stack:
- OnchainOS CLI as the agent backbone
- OKX Web3 API (20+ chains, DeFi, DEX)
- Solidity smart contracts (ExChainLock)
- Frontend: TBD (likely Next.js + Tailwind for hackathon)

### OnchainOS Skills Used:
- `okx-wallet-portfolio` — asset scanning
- `okx-dex-market` — PnL analysis, trade history
- `okx-dex-signal` — Smart Money ranking
- `okx-agentic-wallet` — wallet login, send, contract-call
- `okx-onchain-gateway` — gas estimation, tx simulation, broadcast
- `okx-security` — tx safety scan
- `okx-dex-swap` — token swap (for liquidation)

## Progress Report Format

APPEND to progress.txt (never replace, always append):
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered (e.g., "OnchainOS portfolio command returns data in X format")
  - Gotchas encountered (e.g., "okx-dex-market requires chain parameter, doesn't support 'all'")
  - Useful context (e.g., "whale address 0x28C6...e17 has good test data on ethereum")
---
```

## Consolidate Patterns

If you discover a **reusable pattern** that future iterations should know, add it to the `## Codebase Patterns` section at the TOP of progress.txt (create it if it doesn't exist).

## Update AGENTS.md Files

Before committing, check if any edited files have learnings worth preserving in nearby AGENTS.md files.

## Quality Requirements

- ALL commits must pass quality checks
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns
- For Solidity: use `call` instead of `transfer` for ETH transfers
- For Solidity: always include reentrancy guards on functions that send ETH/tokens

## Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing, reply with:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally.

## Important

- Work on ONE story per iteration
- Commit frequently
- Read the Codebase Patterns section in progress.txt before starting
- ExChain PRD (full details): `PRD_ExChain.md` in project root
