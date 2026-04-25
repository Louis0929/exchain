// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ExChainLock is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public partyA;
    address public partyB;
    uint256 public amountA;      // USDC amount party A deposits (6 decimals)
    uint256 public amountB;      // USDC amount party B deposits (6 decimals)
    uint256 public deadline;     // Lock expiry timestamp
    uint256 public splitRatio;   // Party A's share in basis points (10000 = 100%)
    bool public isActive;

    IERC20 public immutable usdc;

    uint256 public depositDeadline;  // 24h window for both parties to deposit
    bool public aDeposited;
    bool public bDeposited;

    event Deposited(address indexed party, uint256 amount);
    event Renewed(uint256 newDeadline);
    event Withdrawn(address indexed party, uint256 amount);
    event Breakup(address indexed initiator, uint256 amountA, uint256 amountB);
    event Refunded(address indexed party, uint256 amount);

    error NotParty();
    error AlreadyDeposited();
    error LockActive();
    error LockNotActive();
    error DeadlineNotPassed();
    error BothPartiesRequired();
    error DepositWindowExpired();
    error DepositWindowOpen();
    error TransferFailed();

    constructor(
        address _partyA,
        address _partyB,
        uint256 _amountA,
        uint256 _amountB,
        uint256 _durationSeconds,
        uint256 _splitRatio,
        address _usdc
    ) {
        require(_partyA != address(0) && _partyB != address(0), "Zero address");
        require(_partyA != _partyB, "Same address");
        require(_splitRatio <= 10000, "Invalid split ratio");
        require(_usdc != address(0), "Zero USDC address");

        partyA = _partyA;
        partyB = _partyB;
        amountA = _amountA;
        amountB = _amountB;
        deadline = block.timestamp + _durationSeconds;
        splitRatio = _splitRatio;
        usdc = IERC20(_usdc);
        depositDeadline = block.timestamp + 24 hours;
    }

    function depositA() external nonReentrant {
        if (msg.sender != partyA) revert NotParty();
        if (aDeposited) revert AlreadyDeposited();
        if (block.timestamp > depositDeadline) revert DepositWindowExpired();

        usdc.safeTransferFrom(msg.sender, address(this), amountA);
        aDeposited = true;
        emit Deposited(partyA, amountA);

        if (aDeposited && bDeposited) {
            isActive = true;
        }
    }

    function depositB() external nonReentrant {
        if (msg.sender != partyB) revert NotParty();
        if (bDeposited) revert AlreadyDeposited();
        if (block.timestamp > depositDeadline) revert DepositWindowExpired();

        usdc.safeTransferFrom(msg.sender, address(this), amountB);
        bDeposited = true;
        emit Deposited(partyB, amountB);

        if (aDeposited && bDeposited) {
            isActive = true;
        }
    }

    function refund() external nonReentrant {
        // Only available if deposit window expired and both haven't deposited
        if (block.timestamp <= depositDeadline) revert DepositWindowOpen();
        if (isActive) revert LockActive();

        if (aDeposited) {
            uint256 refundAmount = amountA;
            aDeposited = false;
            usdc.safeTransfer(partyA, refundAmount);
            emit Refunded(partyA, refundAmount);
        }
        if (bDeposited) {
            uint256 refundAmount = amountB;
            bDeposited = false;
            usdc.safeTransfer(partyB, refundAmount);
            emit Refunded(partyB, refundAmount);
        }
    }

    function withdraw() external nonReentrant {
        if (!isActive) revert LockNotActive();
        if (block.timestamp <= deadline) revert DeadlineNotPassed();
        if (splitRatio != 10000) revert BothPartiesRequired();

        // Peace mode: each party gets back exactly what they deposited
        isActive = false;

        usdc.safeTransfer(partyA, amountA);
        emit Withdrawn(partyA, amountA);

        usdc.safeTransfer(partyB, amountB);
        emit Withdrawn(partyB, amountB);
    }

    function breakup() external nonReentrant {
        if (msg.sender != partyA && msg.sender != partyB) revert NotParty();
        if (!isActive) revert LockNotActive();

        isActive = false;

        uint256 total = amountA + amountB;
        uint256 shareA = (total * splitRatio) / 10000;
        uint256 shareB = total - shareA;

        if (shareA > 0) {
            usdc.safeTransfer(partyA, shareA);
        }
        if (shareB > 0) {
            usdc.safeTransfer(partyB, shareB);
        }

        emit Breakup(msg.sender, shareA, shareB);
    }

    function renew(uint256 newDeadline) external {
        if (msg.sender != partyA && msg.sender != partyB) revert NotParty();
        if (!isActive) revert LockNotActive();
        require(newDeadline > block.timestamp, "Deadline must be future");

        // Both parties must call renew to confirm (simplified: each call extends deadline)
        // In production, use a 2/2 multisig pattern
        deadline = newDeadline;
        emit Renewed(newDeadline);
    }

    function earlyExit() external nonReentrant {
        if (msg.sender != partyA && msg.sender != partyB) revert NotParty();
        if (!isActive) revert LockNotActive();

        // Both parties must agree: simplified as both calling this function
        // In production, implement a consent mechanism
        isActive = false;

        usdc.safeTransfer(partyA, amountA);
        usdc.safeTransfer(partyB, amountB);

        emit Withdrawn(partyA, amountA);
        emit Withdrawn(partyB, amountB);
    }
}
