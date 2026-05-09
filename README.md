<div align="center">

# ExChain

### 💔 分手鏈上計算器 & 鏈上關係鎖
### 💔 Breakup On-Chain Calculator & Relationship Lock

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by OnchainOS](https://img.shields.io/badge/Powered%20by-OnchainOS-00f0ff)](https://web3.okx.com)

**Your ex said they're broke. The blockchain disagrees.**

**前任說沒錢？區塊鏈不同意。**

</div>

---

## 🌐 English

ExChain is a Web3 breakup calculator that analyzes your ex's on-chain wallet activity and calculates fair compensation. Deploy relationship locks with USDC deposits on-chain. Built on [OnchainOS](https://web3.okx.com) with OKX Web3 API.

### ✨ Features

- **🔍 Wallet Scan** — Analyze ex's on-chain assets, PnL, and trading patterns across 8+ chains
- **💰 Compensation Calculator** — Calculate breakup compensation based on assets, profits, and emotional damage
- **🕵️ Lie Index** — Detect how much they lied about being "broke"
- **🔥 AI Roast** — AI-generated verdict based on wallet behavior
- **⚔️ On-Chain Summons** — Send USDC on-chain as legal proof (Base chain)
- **⛓️ Relationship Lock** — Deploy smart contracts with USDC deposits (peace / negotiate / punish / custom)
- **🎮 Cyberpunk UI** — Glitch effects, scanlines, neon glow, holographic text

### 🚀 Quick Start

```bash
# Clone
git clone https://github.com/Louis0929/exchain.git
cd exchain

# Install
npm install

# Start web app
cd web && npm run dev

# Or use CLI
npx tsx src/agent/cli.ts scan 0x28C6c06298d31479934E3D29e2AA5bf86cA32e17
```

### 📖 CLI Commands

```bash
# Scan ex's wallet
exchain scan <address> [--from 2023-01-01] [--to 2025-05-01] [--chains ethereum,base,bsc]

# Send on-chain summons (requires wallet login)
exchain summons <address> --amount 6227 --chain base

# Refresh live data
exchain refresh <address>

# Deploy relationship lock
exchain lock --amount 1000 --duration 12 --template peace
```

### 🏗 Architecture

```
exchain/
├── src/
│   ├── agent/          # Core logic (scanner, scoring, calculator, roast, deployer)
│   ├── server/         # Express API (scan, summons endpoints)
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # OnchainOS integration layer
│   └── reports/        # Formatted output
├── web/                # Cyberpunk React frontend (Vite + Tailwind)
├── contracts/          # Solidity smart contracts (ExChainLock, ExChainCertificate)
└── onchainos-skills/   # Claude Code / OnchainOS skill definitions
```

### 🔐 OKX Wallet Setup

```bash
# Install OnchainOS CLI (Windows)
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/okx/onchainos-skills/main/install.ps1" -OutFile "$env:TEMP\onchainos-install.ps1"
& "$env:TEMP\onchainos-install.ps1"

# Login
onchainos wallet login your@email.com --locale zh-CN
onchainos wallet verify <code>
```

Or set environment variables:
```bash
OKX_API_KEY=your_key
OKX_SECRET_KEY=your_secret
OKX_PASSPHRASE=your_passphrase
```

---

## 🀄 中文

ExChain 是一個 Web3 分手計算器，分析前任的鏈上錢包活動，計算合理補償金。還能部署鏈上關係鎖智能合約，用 USDC 作為承諾保證。基於 [OnchainOS](https://web3.okx.com) 及 OKX Web3 API 打造。

### ✨ 功能

- **🔍 錢包掃描** — 跨 8+ 條鏈分析前任的鏈上資產、盈虧、交易習慣
- **💰 補償金計算** — 根據資產、收益、精神損失算出分手補償金
- **🕵️ 說謊指數** — 偵測前任「裝窮」的程度
- **🔥 AI 吐槽** — 根據錢包行為生成 AI 法官感言
- **⚔️ 鏈上存證** — 發送 USDC 到前任錢包作為鏈上法律存證（Base 鏈）
- **⛓️ 關係鎖** — 部署智能合約，雙方鎖入 USDC（和平 / 協商 / 懲罰 / 自訂）
- **🎮 賽博龐克 UI** — 故障效果、掃描線、霓虹光暈、全息文字

### 🚀 快速開始

```bash
# 複製
git clone https://github.com/Louis0929/exchain.git
cd exchain

# 安裝
npm install

# 啟動網頁
cd web && npm run dev

# 或用 CLI
npx tsx src/agent/cli.ts scan 0x28C6c06298d31479934E3D29e2AA5bf86cA32e17
```

### 📖 CLI 指令

```bash
# 掃描前任錢包
exchain scan <地址> [--from 2023-01-01] [--to 2025-05-01] [--chains ethereum,base,bsc]

# 發送鏈上存證（需先登入錢包）
exchain summons <地址> --amount 6227 --chain base

# 刷新即時數據
exchain refresh <地址>

# 部署關係鎖
exchain lock --amount 1000 --duration 12 --template peace
```

### 🔐 OKX 錢包設定

```bash
# 安裝 OnchainOS CLI（Windows）
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/okx/onchainos-skills/main/install.ps1" -OutFile "$env:TEMP\onchainos-install.ps1"
& "$env:TEMP\onchainos-install.ps1"

# 登入
onchainos wallet login 你的@email.com --locale zh-CN
onchainos wallet verify 驗證碼
```

或設定環境變數：
```bash
OKX_API_KEY=你的KEY
OKX_SECRET_KEY=你的SECRET
OKX_PASSPHRASE=你的密碼
```

---

## 📜 Smart Contracts

| Contract | Description |
|----------|-------------|
| `ExChainLock.sol` | Relationship lock with USDC deposits and template-based penalties |
| `ExChainCertificate.sol` | ERC721 relationship certificate NFT |

## 🧪 Tests

```bash
npm run test           # TypeScript unit tests
cd contracts && npx hardhat test  # Solidity tests
```

## 📄 License

MIT
