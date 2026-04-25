# PRD: WillChain — 鏈上條件式資產自動轉移 Agent

> "When you can't be there, the chain speaks for you."

## 1. Overview

**WillChain** 是一個基於 OnchainOS 的鏈上條件式資產自動轉移工具。用戶可以設定條件式的資產分配合約——當鏈上條件觸發時（如時間鎖到期、心跳超時），自動執行資產轉移給指定受益人。

**定位聲明**：WillChain 是一個**鏈上資產自動轉移工具**，不是法律意義上的遺囑。它不替代法律遺囑、不處理法幣資產、不涵蓋遺產稅規劃。它的價值在於：當你無法操作錢包時，合約能按預設條件自動轉移鏈上資產。建議用戶同時制定法律遺囑，將鏈上資產納入整體繼承規劃。

**核心賣點**：嚴肅場景 + 鏈上信任。條件透明、執行確定、不可篡改。

## 2. Target Users

| Persona | Description | Pain Point |
|---------|-------------|------------|
| 加密資產持有者 | 持有大量鏈上資產，擔心意外後資產無人接管 | "如果我不在了，家人根本不知道我有這些錢，更不知道怎麼取" |
| 跨國家庭 | 資產和家庭成員分佈在不同國家 | "跨國遺產繼承手續太複雜，想用更簡單的方式" |
| DeFi 深度用戶 | 資產分散在多個鏈和 DeFi 協議中 | "我的資產散落在 Aave、Lido、各種鏈上，怎麼一次性規劃？" |
| 定期支付需求者 | 需要定期向特定地址轉帳（贍養費、定期捐贈等） | "每月手動轉帳太麻煩，想自動化" |

## 3. Core Features

### Feature 1: Asset Inventory（資產盤點）

**Input**: 用戶登入 OKX Agentic Wallet

**Output**: 跨鏈完整資產清單

| Data Point | OnchainOS Skill | Command |
|------------|----------------|---------|
| 總資產價值 | `okx-agentic-wallet` | `onchainos wallet balance` |
| 跨鏈持倉明細 | `okx-wallet-portfolio` | `onchainos portfolio all-balances --address <addr> --chains <chains>` |
| DeFi 持倉 | `okx-defi-portfolio` | `onchainos defi-portfolio positions` |
| 盈虧概覽 | `okx-dex-market` | `onchainos market portfolio-overview --address <addr> --chain <chain>` |

**呈現**：
- 按鏈分組展示所有資產
- 標註 DeFi 鎖倉中的資產，並標明贖回條件：
  - Aave：即時贖回，但有流動性風險（資金利用率過高時可能延遲）
  - Lido：unstake 需排隊，通常 1-5 天
  - 其他協議：顯示鎖定期和提前退出罰金
- 自動估算各資產的流動性風險，標記不適合自動清算的資產

### Feature 2: Will Builder（合約構建器）

用戶通過 CLI 交互創建鏈上資產轉移合約：

**步驟**：
1. 選擇要分配的資產（全部 / 部分）
2. 添加受益人地址和分配比例
3. 設定觸發條件
4. 設定備用條件（防止主條件失效）
5. 預覽並確認

**觸發條件類型**：

| Condition Type | Description | Example | Keeper 需求 |
|---------------|-------------|---------|------------|
| ⏰ 時間鎖 | 到達指定日期後可領取 | "2028-01-01 後可領取" | 無（受益人自行 claim） |
| 💓 心跳超時 | 錢包長期無活動後觸發 | "365 天無心跳即視為失聯" | 需要（見 Feature 4） |
| 🤝 多簽確認 | 指定見證人共同確認 | "3 個見證人中 2 個確認" | 無（見證人自行確認） |

**分配方式**：

| Distribution Type | Description |
|------------------|-------------|
| 一次性分配 | 觸發後受益人自行 claim |
| 分期分配 | 按月/季/年分期，受益人每期 claim |
| 比例分配 | 多個受益人按設定比例分配 |

### Feature 3: Contract Deployer（合約部署器）

將設定轉化為智能合約並部署上鏈。

**支持的合約模板**：

| Template | Description | Complexity |
|----------|-------------|-----------|
| 簡單時間鎖 | 1 個受益人，時間鎖觸發 | 低 |
| 多人分配 | N 個受益人，按比例分配 | 中 |
| 心跳轉移 | 心跳超時觸發，需定期打卡 | 中 |
| 分期信託 | 分期支付，含退出機制 | 高 |
| 多簽轉移 | 見證人確認後觸發 | 高 |

**部署流程**：
1. 使用 `okx-onchain-gateway` → `estimate-gas` 估算 gas
2. 使用 `okx-onchain-gateway` → `simulate-tx` 模擬交易
3. 使用 `okx-security` → `tx-scan` 安全掃描
4. 使用 `okx-agentic-wallet` → `contract-call` 部署合約
5. 使用 `okx-onchain-gateway` → `broadcast-tx` 廣播交易

### Feature 4: Heartbeat Monitor（心跳監測器）

**概念**：資產擁有者定期在鏈上「打卡」，證明自己仍在。如果超過設定時間未打卡，合約進入可領取狀態。

**默認間隔**：365 天（180 天太短，很多持幣者半年不操作是正常的。用戶可自定義，但不建議低於 180 天）

**打卡方式**：

| 方式 | 描述 | 可靠性 | 依賴 |
|------|------|--------|------|
| 手動打卡 | 使用 `wallet sign-message` 簽名 | 依賴用戶記得 | 無外部依賴 |
| Chainlink Automation | 註冊 Upkeep，自動執行 heartbeat | 高 | 需要 LINK 支付 |
| Agent 定時提醒 | WillChain Agent 定期提醒用戶打卡 | 中 | Agent 需持續運行 |
| 備用確認人 | 授權可信地址代為確認「仍在」 | 中 | 人為依賴 |

**Hackathon 階段**：僅實現手動打卡 + 備用確認人。Chainlink Automation 作為 Phase 2。

**監測邏輯**：
```
IF 當前時間 - 上次心跳時間 > 心跳間隔:
    → 進入寬限期（默認 30 天）
    → 通知所有受益人（鏈上事件）
    → 通知資產擁有者（Agent 推送提醒）
    IF 寬限期結束仍未心跳:
        IF 備用確認人確認失聯:
            → 合約進入可領取狀態
        ELSE IF 備用確認人確認仍在:
            → 重置心跳計時器
        ELSE 無確認:
            → 合約自動進入可領取狀態
```

### Feature 5: Asset Liquidator（資產清算器）

遺產觸發後，輔助將分散的資產清算為穩定幣並分配。

> ⚠️ 清算不是自動的，因為 DeFi 贖回存在延遲和流動性風險。Agent 會生成清算計劃，用戶或受益人逐步確認執行。

**清算流程（逐步確認）**：

| Step | Action | 風險提示 |
|------|--------|---------|
| 1 | `okx-defi-invest` → 贖回 DeFi 持倉 | Lido unstake 需排隊；Aave 資金利用率高時可能失敗 |
| 2 | 等待贖回到帳 | 顯示預計等待時間 |
| 3 | `okx-dex-swap` → 將代幣換成 USDC/USDT | 大額交易會有滑點，顯示預估滑點和最小接收量 |
| 4 | `okx-agentic-wallet` → `wallet send` 按比例轉帳 | 跨鏈資產需先 bridge，bridge 有額外風險 |
| 5 | `okx-onchain-gateway` → 廣播並追蹤每筆交易 | 確認每筆交易成功後再執行下一筆 |

**不適合自動清算的資產**：
- 流動性極低的長尾代幣（滑點 > 10%）
- 有鎖定期的 DeFi 持倉（未到解鎖時間）
- NFT 等非同質化資產（建議整體轉移，不換幣）

### Feature 6: Beneficiary Portal（受益人入口）

**受益人可以**：
- 查詢自己被指定為受益人的合約列表（通過合約地址）
- 查看合約狀態：活躍 / 寬限期 / 可領取
- 查看觸發條件是否已滿足
- 執行 `claim()` 領取資產

**受益人操作流程**：
1. 輸入合約地址（從證書或 owner 處獲得）
2. Agent 讀取合約狀態（`triggered`, `beneficiaries`, 各受益人比例）
3. 如果 `triggered = true` 且受益人尚未領取 → 引導執行 claim
4. 如果仍在活躍狀態 → 顯示預計可領取份額（不顯示具體金額以保護隱私）

**觸發者**：
- 時間鎖合約：受益人自行調用 `claim()`，無需外部觸發
- 心跳合約：任何人可以調用 `checkTrigger()` 檢查是否觸發（含寬限期檢查）；受益人調用 `claim()` 領取
- 多簽合約：見證人確認後受益人 claim

### Feature 7: Transfer Certificate（轉移證書）

- 生成鏈上轉移證書（合約地址 + 觸發條件摘要 + 受益人列表）
- 可分享給受益人，讓他們知道有這份合約存在
- 不暴露具體金額，僅提供合約地址供查詢

## 4. User Flow

### Owner 流程

```
┌──────────────┐     ┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│ 登入錢包      │ ──▶ │ Asset        │ ──▶ │ Will Builder   │ ──▶ │ Contract     │
│ 盤點資產      │     │ Inventory    │     │ 設定轉移條件    │     │ Deployer     │
└──────────────┘     └──────────────┘     └────────────────┘     └──────┬───────┘
                                                                         │
                                                    ┌────────────────────┼──────────────────┐
                                                    ▼                    ▼                  ▼
                                          ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                                          │ Heartbeat    │    │ Transfer     │    │ Beneficiary  │
                                          │ Monitor      │    │ Certificate  │    │ Portal       │
                                          │ 定期打卡      │    │ 轉移證書      │    │ 受益人查詢    │
                                          └──────────────┘    └──────────────┘    └──────────────┘
```

### Beneficiary 流程

```
┌──────────────┐     ┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│ 輸入合約地址   │ ──▶ │ 查詢合約狀態  │ ──▶ │ 確認條件已滿足  │ ──▶ │ claim()      │
│              │     │ 活躍/寬限/可領 │     │                │     │ 領取資產     │
└──────────────┘     └──────────────┘     └────────────────┘     └──────────────┘
```

## 5. OnchainOS Skill Map

| Agent Action | OnchainOS Skill | Command |
|-------------|----------------|---------|
| 查詢資產總覽 | `okx-agentic-wallet` | `onchainos wallet balance` |
| 查詢跨鏈持倉 | `okx-wallet-portfolio` | `onchainos portfolio all-balances` |
| 查詢 DeFi 持倉 | `okx-defi-portfolio` | `onchainos defi-portfolio positions` |
| 贖回 DeFi | `okx-defi-invest` | `onchainos defi withdraw` |
| 代幣兌換 | `okx-dex-swap` | `onchainos swap quote` / `swap execute` |
| 部署/調用合約 | `okx-agentic-wallet` | `onchainos wallet contract-call` |
| 執行轉帳 | `okx-agentic-wallet` | `onchainos wallet send` |
| 簽名打卡 | `okx-agentic-wallet` | `onchainos wallet sign-message` |
| Gas 估算 | `okx-onchain-gateway` | `onchainos gateway estimate-gas` |
| 交易模擬 | `okx-onchain-gateway` | `onchainos gateway simulate-tx` |
| 交易廣播 | `okx-onchain-gateway` | `onchainos gateway broadcast-tx` |
| 安全掃描 | `okx-security` | `onchainos security tx-scan` |

## 6. Smart Contract Design

### 心跳資產轉移合約（修復版）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title HeartbeatWill - 條件式鏈上資產自動轉移合約
/// @notice 這不是法律遺囑，而是一個鏈上自動轉移工具
contract HeartbeatWill {
    struct Beneficiary {
        address wallet;
        uint256 percentage;  // basis points, 5000 = 50%
        bool claimed;
    }

    address public owner;
    uint256 public heartbeatInterval;  // 默認 365 天
    uint256 public lastHeartbeat;
    uint256 public gracePeriod;        // 默認 30 天
    Beneficiary[] public beneficiaries;
    uint256 public totalPercentage;    // 追蹤總比例，防止超過 100%
    bool public triggered;

    address public backupConfirmer;
    bool public backupConfirmedLoss;   // 備用確認人是否已確認失聯

    // 退出機制
    uint256 public constant WITHDRAW_DELAY = 7 days;
    uint256 public withdrawRequestTime;
    bool public withdrawRequested;

    event HeartbeatReceived(uint256 timestamp);
    event WillTriggered(uint256 timestamp, string reason);
    event AssetsClaimed(address indexed beneficiary, uint256 amount);
    event GracePeriodStarted(uint256 deadline);
    event WithdrawRequested(uint256 executeTime);
    event WithdrawExecuted(uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyBackupConfirmer() {
        require(msg.sender == backupConfirmer, "Not backup confirmer");
        _;
    }

    constructor(
        uint256 _heartbeatInterval,
        uint256 _gracePeriod,
        address _backupConfirmer
    ) payable {
        require(_heartbeatInterval >= 180 days, "Interval too short (min 180 days)");
        require(_gracePeriod >= 7 days, "Grace period too short (min 7 days)");
        owner = msg.sender;
        heartbeatInterval = _heartbeatInterval;
        gracePeriod = _gracePeriod;
        backupConfirmer = _backupConfirmer;
        lastHeartbeat = block.timestamp;
    }

    function heartbeat() external onlyOwner {
        require(!triggered, "Will already triggered");
        lastHeartbeat = block.timestamp;
        backupConfirmedLoss = false;
        // 取消待執行的退出請求
        withdrawRequested = false;
        emit HeartbeatReceived(block.timestamp);
    }

    function addBeneficiary(address _wallet, uint256 _percentage) external onlyOwner {
        require(!triggered, "Will already triggered");
        require(_percentage > 0, "Percentage must be > 0");
        require(totalPercentage + _percentage <= 10000, "Total percentage exceeds 100%");

        beneficiaries.push(Beneficiary({
            wallet: _wallet,
            percentage: _percentage,
            claimed: false
        }));
        totalPercentage += _percentage;
    }

    function removeBeneficiary(uint256 _index) external onlyOwner {
        require(!triggered, "Will already triggered");
        require(_index < beneficiaries.length, "Invalid index");

        totalPercentage -= beneficiaries[_index].percentage;
        // Swap and pop
        beneficiaries[_index] = beneficiaries[beneficiaries.length - 1];
        beneficiaries.pop();
    }

    /// @notice 任何人都可以檢查是否該觸發
    function checkTrigger() external {
        require(!triggered, "Will already triggered");

        bool heartbeatMissed = block.timestamp - lastHeartbeat > heartbeatInterval;
        bool graceExpired = block.timestamp - lastHeartbeat > heartbeatInterval + gracePeriod;

        if (heartbeatMissed && !graceExpired) {
            emit GracePeriodStarted(lastHeartbeat + heartbeatInterval + gracePeriod);
            return;
        }

        if (graceExpired) {
            triggered = true;
            emit WillTriggered(block.timestamp, "Heartbeat timeout + grace period expired");
        }
    }

    /// @notice 備用確認人可以確認失聯（僅在心跳超時後）
    function confirmLoss() external onlyBackupConfirmer {
        require(!triggered, "Will already triggered");
        require(
            block.timestamp - lastHeartbeat > heartbeatInterval,
            "Heartbeat not missed yet"
        );
        backupConfirmedLoss = true;

        // 備用確認人確認後，仍需等待寬限期
        if (block.timestamp - lastHeartbeat > heartbeatInterval + gracePeriod) {
            triggered = true;
            emit WillTriggered(block.timestamp, "Backup confirmer confirmed loss + grace expired");
        } else {
            emit GracePeriodStarted(lastHeartbeat + heartbeatInterval + gracePeriod);
        }
    }

    /// @notice 備用確認人可以確認 owner 仍在，重置觸發
    function confirmAlive() external onlyBackupConfirmer {
        require(!triggered, "Will already triggered");
        backupConfirmedLoss = false;
        // 不重置 lastHeartbeat，只有 owner 自己能 heartbeat
    }

    /// @notice 受益人領取資產
    function claim() external {
        require(triggered, "Will not triggered yet");
        require(beneficiaries.length > 0, "No beneficiaries");

        // 找到調用者的受益人索引
        uint256 beneficiaryIndex = type(uint256).max;
        for (uint i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i].wallet == msg.sender && !beneficiaries[i].claimed) {
                beneficiaryIndex = i;
                break;
            }
        }
        require(beneficiaryIndex != type(uint256).max, "Not a beneficiary or already claimed");

        Beneficiary storage b = beneficiaries[beneficiaryIndex];
        b.claimed = true;

        uint256 share = (address(this).balance * b.percentage) / 10000;

        // 使用 call 而非 transfer，避免 2300 gas 限制
        (bool success, ) = payable(b.wallet).call{value: share}("");
        require(success, "Transfer failed");

        emit AssetsClaimed(b.wallet, share);
    }

    /// @notice Owner 退出 — 7 天延遲，保護受益人信任
    function requestWithdraw() external onlyOwner {
        require(!triggered, "Will already triggered");
        withdrawRequested = true;
        withdrawRequestTime = block.timestamp;
        emit WithdrawRequested(block.timestamp + WITHDRAW_DELAY);
    }

    function executeWithdraw() external onlyOwner {
        require(!triggered, "Will already triggered");
        require(withdrawRequested, "No withdraw request pending");
        require(
            block.timestamp - withdrawRequestTime >= WITHDRAW_DELAY,
            "Withdraw delay not met"
        );

        uint256 amount = address(this).balance;
        withdrawRequested = false;

        (bool success, ) = payable(owner).call{value: amount}("");
        require(success, "Transfer failed");

        emit WithdrawExecuted(amount);
    }

    function cancelWithdraw() external onlyOwner {
        withdrawRequested = false;
    }

    /// @notice 查詢合約狀態（供受益人入口使用）
    function getStatus() external view returns (
        bool _triggered,
        bool _inGracePeriod,
        uint256 _graceDeadline,
        uint256 _beneficiaryCount,
        uint256 _balance
    ) {
        _triggered = triggered;
        _balance = address(this).balance;
        _beneficiaryCount = beneficiaries.length;

        if (!triggered && block.timestamp - lastHeartbeat > heartbeatInterval) {
            _inGracePeriod = block.timestamp - lastHeartbeat <= heartbeatInterval + gracePeriod;
            _graceDeadline = lastHeartbeat + heartbeatInterval + gracePeriod;
        }
    }

    /// @notice 受益人查詢自己的份額
    function getBeneficiaryShare(address _wallet) external view returns (
        uint256 percentage,
        bool claimed,
        uint256 estimatedAmount
    ) {
        for (uint i = 0; i < beneficiaries.length; i++) {
            if (beneficiaries[i].wallet == _wallet) {
                percentage = beneficiaries[i].percentage;
                claimed = beneficiaries[i].claimed;
                estimatedAmount = (address(this).balance * beneficiaries[i].percentage) / 10000;
                break;
            }
        }
    }

    receive() external payable {}
}
```

### 分期信託合約（含退出機制）

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PeriodicTrust {
    address public grantor;
    address public beneficiary;
    uint256 public periodAmount;
    uint256 public periodInterval;
    uint256 public lastPayment;
    uint256 public totalRemaining;
    uint256 public maxPeriods;
    uint256 public periodsPaid;

    // 退出機制
    uint256 public constant REVOKE_DELAY = 30 days;
    uint256 public revokeRequestTime;
    bool public revokeRequested;

    event PaymentMade(uint256 amount, uint256 period);
    event TrustDepleted();
    event RevokeRequested(uint256 executeTime);
    event TrustRevoked(uint256 refundAmount);

    modifier onlyGrantor() {
        require(msg.sender == grantor, "Not grantor");
        _;
    }

    constructor(
        address _beneficiary,
        uint256 _periodAmount,
        uint256 _periodInterval,
        uint256 _maxPeriods
    ) payable {
        grantor = msg.sender;
        beneficiary = _beneficiary;
        periodAmount = _periodAmount;
        periodInterval = _periodInterval;
        maxPeriods = _maxPeriods;
        totalRemaining = msg.value;
        lastPayment = block.timestamp;
    }

    function claim() external {
        require(msg.sender == beneficiary, "Not beneficiary");
        require(!revokeRequested || block.timestamp < revokeRequestTime + REVOKE_DELAY,
                "Trust pending revocation");
        require(periodsPaid < maxPeriods, "All periods paid");
        require(
            block.timestamp - lastPayment >= periodInterval,
            "Too early for next payment"
        );
        require(totalRemaining >= periodAmount, "Insufficient funds");

        // 使用 call 而非 transfer
        (bool success, ) = payable(beneficiary).call{value: periodAmount}("");
        require(success, "Transfer failed");

        totalRemaining -= periodAmount;
        periodsPaid++;
        lastPayment = block.timestamp;

        emit PaymentMade(periodAmount, periodsPaid);

        if (periodsPaid >= maxPeriods || totalRemaining < periodAmount) {
            emit TrustDepleted();
        }
    }

    function topUp() external payable onlyGrantor {
        totalRemaining += msg.value;
    }

    /// @notice Grantor 申請終止信託 — 30 天延遲
    function requestRevoke() external onlyGrantor {
        revokeRequested = true;
        revokeRequestTime = block.timestamp;
        emit RevokeRequested(block.timestamp + REVOKE_DELAY);
    }

    function executeRevoke() external onlyGrantor {
        require(revokeRequested, "No revoke request");
        require(
            block.timestamp - revokeRequestTime >= REVOKE_DELAY,
            "Revoke delay not met"
        );

        uint256 refund = address(this).balance;
        revokeRequested = false;

        (bool success, ) = payable(grantor).call{value: refund}("");
        require(success, "Transfer failed");

        emit TrustRevoked(refund);
    }

    function cancelRevoke() external onlyGrantor {
        revokeRequested = false;
    }

    /// @notice 查詢信託狀態
    function getStatus() external view returns (
        uint256 _remaining,
        uint256 _periodsPaid,
        uint256 _maxPeriods,
        bool _pendingRevoke,
        uint256 _revokeDeadline
    ) {
        _remaining = totalRemaining;
        _periodsPaid = periodsPaid;
        _maxPeriods = maxPeriods;
        _pendingRevoke = revokeRequested;
        _revokeDeadline = revokeRequested ? revokeRequestTime + REVOKE_DELAY : 0;
    }
}
```

## 7. Technical Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    WillChain Agent                        │
│                                                          │
│  ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Asset    │ │  Will     │ │ Heartbeat│ │Beneficiary│  │
│  │ Inventory │ │  Builder  │ │ Monitor  │ │  Portal   │  │
│  │ (資產盤點)│ │ (合約構建)│ │ (心跳監測)│ │ (受益人)  │  │
│  └─────┬─────┘ └─────┬─────┘ └────┬─────┘ └────┬─────┘  │
│        │             │            │             │        │
│  ┌─────▼─────────────▼────────────▼─────────────▼──────┐  │
│  │           OnchainOS CLI / MCP Server                │  │
│  │  wallet | portfolio | defi | swap | gateway | security│  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │                                  │
│  ┌────────────────────▼───────────────────────────────┐  │
│  │               OKX Web3 API                          │  │
│  │      (20+ chains, DeFi protocols, DEX)             │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## 8. MVP Scope

### Phase 1 — Hackathon Demo（2-3 天）

| Feature | Priority | Effort | Notes |
|---------|----------|--------|-------|
| 心跳資產轉移合約部署 | P0 | 高 | 核心功能，必須可演示 |
| 手動心跳打卡 | P0 | 低 | `wallet sign-message` |
| 受益人 claim 流程 | P0 | 中 | 演示完整生命週期 |
| CLI 輸入構建合約參數 | P0 | 低 | 非對話式 UI，直接 CLI 參數 |
| 合約狀態查詢 | P1 | 低 | `getStatus()` + `getBeneficiaryShare()` |

### Phase 2 — Post-Hackathon

| Feature | Description |
|---------|-------------|
| 分期信託合約 | 含退出機制的分期支付 |
| 多簽確認 | 見證人機制 |
| 輔助清算 | 觸發後逐步確認的 DeFi 贖回 + 換幣 |
| Chainlink Automation | 自動化心跳檢測 |
| 跨鏈支持 | 一份合約覆蓋多鏈資產 |
| 對話式 UI | 更友好的 Will Builder |

## 9. Risk & Compliance

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **法律定位** | 高 | 定位為「鏈上資產自動轉移工具」，非法律遺囑。首屏顯示免責聲明。建議用戶同時制定法律遺囑。 |
| 合約漏洞 | 高 | 使用 `okx-security` 安全掃描；合約使用 `call` 而非 `transfer`；加入比例溢出檢查；退出需延遲 |
| 誤觸發 | 高 | 默認 365 天心跳間隔 + 30 天寬限期 + 備用確認人雙重確認 |
| Owner 惡意退出 | 中 | `emergencyWithdraw` 改為 7 天延遲退出，受益人有時間反應 |
| Gas 耗盡 | 中 | 建議使用 X Layer（零 gas）部署合約 |
| DeFi 贖回延遲 | 中 | 清算流程改為逐步確認，顯示每步風險和預計等待時間 |
| 大額滑點 | 中 | swap 前顯示預估滑點，超過閾值需確認 |
| 跨鏈 bridge 風險 | 中 | 標注 bridge 風險，建議在目標鏈直接部署獨立合約 |
| 私鑰丟失 | 中 | 建議設置備用確認人；心跳合約的寬限期提供緩衝 |
| 資金鎖死 | 低 | 延遲退出機制確保 owner 最終可取回資金 |

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Hackathon Demo 完成度 | 心跳合約完整生命週期可演示（部署→打卡→超時→觸發→claim） |
| 合約部署成功率 | > 95% |
| 心跳打卡響應時間 | < 5 秒 |
| OnchainOS Skills 使用覆蓋率 | > 50%（至少 6 個 skill） |
| 安全性 | 合約無已知漏洞，所有轉帳使用 `call` |

---

*"Your assets, on-chain. Conditional, transparent, trustless." — WillChain*
