#!/system/bin/sh
# action.sh — KernelSU action button / Magisk action
# Triggers manual deploy when WebUI is not available
# Compatible with BusyBox ash

MODDIR="${0%/*}"
HELPER="$MODDIR/scripts/helper.sh"

echo "Rime Update Helper - 手动更新"
echo "========================"

echo ""
echo "检测到的 Rime 应用:"
sh "$HELPER" detect | while IFS='|' read -r pkg label path uid dir_exists; do
    echo "  ✓ $label ($pkg)"
done

echo ""
echo "开始部署..."
sh "$HELPER" deploy-all
sh "$HELPER" config set last_update "$(date +%s)"

echo ""
echo "部署完成！"
