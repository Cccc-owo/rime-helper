#!/system/bin/sh
# service.sh — Boot service script
# Started by KernelSU/Magisk at boot
# Compatible with BusyBox ash

MODDIR="${0%/*}"
HELPER="$MODDIR/scripts/helper.sh"

sh "$HELPER" ensure-dirs
