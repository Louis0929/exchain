#!/bin/bash

# Wrapper script to allow onchainos to interact with exchain CLI
# Usage: onchainos exchain <command> [args]

EXCHAIN_BIN="exchain"

# Check if exchain is installed
if ! command -v $EXCHAIN_BIN &> /dev/null
then
    echo "exchain command not found. Please install it using 'npm install -g'."
    exit 1
fi

# Parse command
case "$1" in
    "scan")
        shift
        $EXCHAIN_BIN scan "$@"
        ;;
    "lock")
        shift
        $EXCHAIN_BIN lock "$@"
        ;;
    "help"|"--help"|"-h")
        echo "ExChain commands:"
        echo "  scan <address> [--chain <chain>] [--from <date>] [--to <date>]  Scan ex's wallet and calculate compensation"
        echo "  lock --amount <usdc> --duration <months> --template <peace|negotiate|punish|custom> [--custom-ratio <bps>]  Create relationship lock"
        echo "  help  Show this help message"
        ;;
    *)
        echo "Unknown exchain command: $1"
        echo "Use 'onchainos exchain help' for available commands"
        exit 1
        ;;
esac
