# ExChain — Breakup on-chain calculator & relationship lock

ExChain is a blockchain-based breakup calculator and on-chain relationship lock agent built on OnchainOS. It helps users calculate breakup compensation based on their ex's wallet activity and create on-chain relationship locks with USDC deposits.

## Features

### 1. Breakup Calculator
- **Wallet Scan**: Analyze ex's wallet holdings and trading activity
- **Compensation Calculation**: Calculate breakup compensation based on assets and profit
- **AI Roast**: Generate humorous roast text based on wallet activity
- **Report Generation**: Create formatted reports with ASCII art and statistics

### 2. Relationship Lock
- **Contract Deployment**: Deploy ExChain Lock smart contracts
- **USDC Deposit**: Deposit USDC into the contract
- **Template Selection**: Choose from pre-defined templates (peace, negotiate, punish, custom)
- **Custom Ratios**: Define custom split ratios for custom templates

## Installation

1. **Install Node.js and npm**

2. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/exchain.git
   cd exchain
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Install OnchainOS CLI**:
   - For Windows:
     ```powershell
     Invoke-WebRequest -Uri "https://raw.githubusercontent.com/okx/onchainos-skills/main/install.ps1" -OutFile "$env:TEMP\onchainos-install.ps1"
     & "$env:TEMP\onchainos-install.ps1"
     ```
   - For macOS/Linux:
     ```bash
     curl -sSL "https://raw.githubusercontent.com/okx/onchainos-skills/main/install.sh" | sh
     ```

5. **Install ExChain CLI**:
   ```bash
   npm install -g .
   ```

## Usage

### CLI

#### Scan Wallet
```bash
exchain scan <address> [--from <date>] [--to <date>] [--chains <chains>]
```

- `<address>`: Ex's wallet address
- `--from <date>`: Relationship start date (default: 2023-01-01)
- `--to <date>`: Relationship end date (default: today)
- `--chains <chains>`: Chains to scan (comma-separated, default: ethereum,base,bsc,arbitrum)

#### Create Relationship Lock
```bash
exchain lock --amount <USDC> --duration <months> --template <peace|negotiate|punish|custom> [--custom-ratio <bps>]
```

- `--amount <USDC>`: USDC amount to deposit (per party)
- `--duration <months>`: Lock duration in months (default: 12)
- `--template <peace|negotiate|punish|custom>`: Lock template (default: peace)
- `--custom-ratio <bps>`: Custom split ratio in basis points (default: 10000)

### Claude Code

1. **Start Claude Code**:
   ```bash
   cd onchainos-skills
   claude-code --mcp-server .
   ```

2. **Use natural language commands**:
   ```
   Claude Code, 計算我前任錢包的分手補償金
   Claude Code, 掃描錢包 0x28C6c06298d31479934E3D29e2AA5bf86cA32e17
   Claude Code, 建立一個 1000 USDC 的關係鎖，為期 12 個月
   ```

## Development

### Build
```bash
npm run build
```

### Run Tests
```bash
npm run test
```

### Run in Development Mode
```bash
npm run dev scan <address>
```

## Architecture

### Core Modules
- **Agent CLI**: Command-line interface (src/agent/cli.ts)
- **Scanner**: Wallet scanning and data collection (src/agent/scanner.ts)
- **Scoring**: User scoring and tagging (src/agent/scoring.ts)
- **Calculator**: Compensation calculation (src/agent/calculator.ts)
- **Roast**: AI roast generation (src/agent/roast.ts)
- **Deployer**: Smart contract deployment (src/agent/deployer.ts)

### OnchainOS Skills
- **exchain**: Main skill for ExChain functionality (onchainos-skills/skills/exchain/SKILL.md)
- **Workflows**:
  - exchain-breakup-calculator.md: Breakup compensation calculation workflow
  - exchain-relationship-lock.md: Relationship lock workflow

## Smart Contracts

- **ExChainLock.sol**: Main relationship lock smart contract (contracts/contracts/ExChainLock.sol)
- **ExChainCertificate.sol**: ERC721 relationship certificate (contracts/contracts/ExChainCertificate.sol)

## Tests

- TypeScript tests: src/agent/*.test.ts
- Solidity tests: contracts/test/ExChainLock.js

## License

MIT
