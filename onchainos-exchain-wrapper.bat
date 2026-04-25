@echo off

REM Wrapper script to allow onchainos to interact with exchain CLI
REM Usage: onchainos exchain <command> [args]

set EXCHAIN_BIN=exchain

REM Check if exchain is installed
where %EXCHAIN_BIN% >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo exchain command not found. Please install it using 'npm install -g'.
    exit /b 1
)

REM Parse command
if "%1"=="scan" (
    shift
    %EXCHAIN_BIN% scan %*
) else if "%1"=="lock" (
    shift
    %EXCHAIN_BIN% lock %*
) else if "%1"=="help" (
    echo ExChain commands:
    echo   scan ^<address^> [--chain ^<chain^>] [--from ^<date^>] [--to ^<date^>]  Scan ex's wallet and calculate compensation
    echo   lock --amount ^<usdc^> --duration ^<months^> --template ^<peace^|negotiate^|punish^|custom^> [--custom-ratio ^<bps^>]  Create relationship lock
    echo   help  Show this help message
) else (
    echo Unknown exchain command: %1
    echo Use 'onchainos exchain help' for available commands
    exit /b 1
)
