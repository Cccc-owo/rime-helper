#!/system/bin/sh
# customize.sh — Module installation script
# Runs during KernelSU/Magisk module installation
# Compatible with BusyBox ash

# KernelSU provides: MODPATH
# Magisk provides: MODPATH, ZIPFILE, etc.

SKIPUNZIP=1

# ============================================================
# Helper functions (standalone, no dependency on scripts/)
# ============================================================
ui_print() {
    if [ -n "$KSU" ]; then
        echo "[*] $1"
    else
        echo "ui_print $1" > /proc/self/fd/$OUTFD
    fi
}

abort() {
    ui_print "$1"
    exit 1
}

# ============================================================
# Installation
# ============================================================
ui_print "==============================="
ui_print "  Rime Update Helper"
ui_print "  Rime 输入法资源更新与同步"
ui_print "==============================="

# Extract module files
ui_print "- 解压模块文件..."
unzip -o "$ZIPFILE" -x 'META-INF/*' -d "$MODPATH" >/dev/null 2>&1

# Set script permissions
ui_print "- 设置脚本权限..."
if [ -d "$MODPATH/scripts" ]; then
    chmod 755 "$MODPATH/scripts/"*.sh 2>/dev/null
fi
for f in service.sh action.sh uninstall.sh; do
    [ -f "$MODPATH/$f" ] && chmod 755 "$MODPATH/$f"
done

# Create persistent data directory
PERSIST_DIR="/data/adb/rime_helper"
ui_print "- 创建持久化存储..."
mkdir -p "$PERSIST_DIR/resources"
mkdir -p "$PERSIST_DIR/versions"
mkdir -p "$PERSIST_DIR/staging"
mkdir -p "$PERSIST_DIR/logs"
mkdir -p "$PERSIST_DIR/downloads"

# Write default resources.conf if not present
RESOURCES_CONF="$PERSIST_DIR/resources.conf"
if [ ! -f "$RESOURCES_CONF" ]; then
    ui_print "- 初始化资源列表..."
    cat > "$RESOURCES_CONF" << 'RESEOF'
rime-ice|雾凇拼音|iDvel/rime-ice|asset:full\.zip|0|schema
rime-frost|白霜拼音|gaboolic/rime-frost|asset:rime-frost-schemas\.zip|1|schema
oh-my-rime|oh-my-rime|Mintimate/oh-my-rime|archive|2|schema
moegirl|萌娘百科词库|outloudvi/mw2fcitx|asset-files:moegirl\.dict\.yaml$|3|dict
wanxiang|万象拼音|amzxyz/rime_wanxiang|asset:rime-wanxiang-base\.zip|5|schema
zhwiki|维基百科词库|felixonmars/fcitx5-pinyin-zhwiki|asset-files:^zhwiki-.*\.dict\.yaml$|10|dict
wanxiang-gram|万象语法模型|amzxyz/RIME-LMDG|asset-files:[Ll][Tt][Ss].*\.gram$@LTS|20|model
RESEOF
fi

# Detect installed Rime apps
ui_print "- 检测已安装的 Rime 应用..."
if [ -d "/sdcard/Android/data/org.fcitx.fcitx5.android" ]; then
    ui_print "  - fcitx5-android ✓"
fi
if [ -d "/data/data/com.osfans.trime" ]; then
    ui_print "  - Trime ✓"
fi
if [ ! -d "/sdcard/Android/data/org.fcitx.fcitx5.android" ] && [ ! -d "/data/data/com.osfans.trime" ]; then
    ui_print "  ! 未检测到 Rime 输入法应用"
    ui_print "  ! 请安装 fcitx5-android 或 Trime 后重新配置"
fi

# Set default config if first install
if [ ! -f "$PERSIST_DIR/config.prop" ] && [ -z "$KSU" ]; then
    ui_print "- 初始化默认配置..."
    echo "resource_rime-ice_enabled=true" > "$PERSIST_DIR/config.prop"
fi

# For KSU, initialize default config via ksud
if [ -n "$KSU" ]; then
    ui_print "- KernelSU 模式：初始化配置..."
    # Only set defaults if not already configured
    ksud module config get rime_helper resource_rime-ice_enabled >/dev/null 2>&1 || \
        ksud module config set rime_helper resource_rime-ice_enabled true 2>/dev/null
fi

# Set module permissions
ui_print "- 设置文件权限..."
set_perm_recursive "$MODPATH" 0 0 0755 0644
if [ -d "$MODPATH/scripts" ]; then
    set_perm_recursive "$MODPATH/scripts" 0 0 0755 0755
fi
if [ -d "$MODPATH/webroot" ]; then
    set_perm_recursive "$MODPATH/webroot" 0 0 0755 0644
fi

ui_print "- 安装完成！"
if [ -n "$KSU" ]; then
    ui_print "- 请在 KernelSU 管理器中打开 WebUI 进行配置"
else
    ui_print "- 请使用支持 WebUI 的管理器 (如 MMRL) 进行配置"
    ui_print "  或按下操作按钮手动更新"
fi
ui_print "==============================="
