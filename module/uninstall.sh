#!/system/bin/sh
# uninstall.sh — Cleanup on module uninstall
# Compatible with BusyBox ash

PERSIST_DIR="/data/adb/rime_helper"

# Remove persistent data
rm -rf "$PERSIST_DIR"
