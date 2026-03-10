#!/system/bin/sh
# helper.sh — Unified shell helper for rime resource sync
# Single entry point replacing common/config/detect/download/deploy/update/cron
# All output is plain text (not JSON) — TypeScript handles formatting
# Compatible with BusyBox ash

MODDIR="${MODDIR:-$(dirname "$(dirname "$(readlink -f "$0")")")}"
MODID="rime_helper"
PERSIST_DIR="/data/adb/rime_helper"
RESOURCE_DIR="$PERSIST_DIR/resources"
VERSION_DIR="$PERSIST_DIR/versions"
STAGING_DIR="$PERSIST_DIR/staging"
LOG_DIR="$PERSIST_DIR/logs"
LOG_FILE="$LOG_DIR/rime_helper.log"
CONFIG_FILE="$PERSIST_DIR/config.prop"
DOWNLOAD_DIR="$PERSIST_DIR/downloads"
RESOURCES_CONF="$PERSIST_DIR/resources.conf"
DEFAULT_RESOURCES_CONF="$MODDIR/default-resources.conf"
TARGET_APPS_CONF="$MODDIR/target-apps.conf"
PRESERVE_PATTERNS_CONF="$MODDIR/preserve-patterns.conf"
MAX_LOG_SIZE=102400

# ── Helpers ──────────────────────────────────────────────────

is_ksu() { [ -n "$KSU" ]; }
has_cmd() { command -v "$1" >/dev/null 2>&1; }

log_rotate() {
    if [ -f "$LOG_FILE" ]; then
        local size
        size=$(wc -c < "$LOG_FILE" 2>/dev/null || echo 0)
        [ "$size" -gt "$MAX_LOG_SIZE" ] && mv "$LOG_FILE" "${LOG_FILE}.old"
    fi
}

log() {
    local level="$1"; shift
    local msg="[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $*"
    mkdir -p "$LOG_DIR"
    log_rotate
    echo "$msg" >> "$LOG_FILE"
    # Also print to stderr so stdout stays clean for callers
    echo "$msg" >&2
}

log_info() { log "INFO" "$@"; }
log_error() { log "ERROR" "$@"; }

is_resource_enabled() {
    local rid="$1"
    [ "$(do_config_get "resource_${rid}_enabled" "false")" = "true" ]
}

get_app_uid() {
    stat -c %u "/data/data/$1" 2>/dev/null || echo "0"
}

fix_permissions() {
    local path="$1" pkg="$2"
    local uid
    uid=$(get_app_uid "$pkg")

    case "$path" in
        /sdcard/*|/storage/*)
            # External storage: normalize mode bits so app can read/write deployed files
            find "$path" -type d -exec chmod 770 {} \; 2>/dev/null
            find "$path" -type f -exec chmod 660 {} \; 2>/dev/null
            return 0
            ;;
    esac

    if [ "$uid" != "0" ] && [ -n "$uid" ]; then
        chown -R "$uid:$uid" "$path"
        find "$path" -type d -exec chmod 700 {} \; 2>/dev/null
        find "$path" -type f -exec chmod 600 {} \; 2>/dev/null
        has_cmd restorecon && restorecon -RF "$path"
    fi
}

# ── config ───────────────────────────────────────────────────

do_config_get() {
    local key="$1" default="${2:-}"
    local val=""
    if is_ksu; then
        val=$(ksud module config get "$MODID" "$key" 2>/dev/null) || val=""
    elif [ -f "$CONFIG_FILE" ]; then
        val=$(sed -n "s/^${key}=//p" "$CONFIG_FILE" | tail -1)
    fi
    echo "${val:-$default}"
}

do_config_set() {
    local key="$1" value="$2"
    if is_ksu; then
        ksud module config set "$MODID" "$key" "$value" 2>/dev/null
    else
        mkdir -p "$(dirname "$CONFIG_FILE")"
        if [ -f "$CONFIG_FILE" ] && grep -q "^${key}=" "$CONFIG_FILE"; then
            sed -i "s|^${key}=.*|${key}=${value}|" "$CONFIG_FILE"
        else
            echo "${key}=${value}" >> "$CONFIG_FILE"
        fi
    fi
    log_info "Config set ${key}"
}

# ── version ──────────────────────────────────────────────────

do_version_get() {
    cat "$VERSION_DIR/${1}.version" 2>/dev/null || echo ""
}

do_version_set() {
    mkdir -p "$VERSION_DIR"
    printf '%s' "$2" > "$VERSION_DIR/${1}.version"
}

# ── detect ───────────────────────────────────────────────────

do_detect() {
    # Output: one line per installed app
    # Format: pkg|label|rime_path|uid|dir_exists
    while IFS='|' read -r pkg path label; do
        [ -n "$pkg" ] || continue
        if [ -d "/data/data/$pkg" ]; then
            local uid dir_exists
            uid=$(get_app_uid "$pkg")
            dir_exists="false"
            [ -d "$path" ] && dir_exists="true"
            echo "${pkg}|${label}|${path}|${uid}|${dir_exists}"
        fi
    done < "$TARGET_APPS_CONF"
}

# ── download ─────────────────────────────────────────────────

do_download() {
    local url="$1" dest="$2"
    mkdir -p "$(dirname "$dest")"
    log_info "Download start: $url -> $dest"
    if has_cmd curl; then
        if ! curl -fsSL --connect-timeout 15 --max-time 300 -o "$dest" "$url"; then
            log_error "Download failed: $url"
            return 1
        fi
    elif has_cmd wget; then
        if ! wget -q --timeout=15 -O "$dest" "$url"; then
            log_error "Download failed: $url"
            return 1
        fi
    else
        log_error "No HTTP client (curl/wget)"
        return 1
    fi
    log_info "Download complete: $dest"
}

# ── unzip ────────────────────────────────────────────────────

do_unzip() {
    local zipfile="$1" dest="$2"
    mkdir -p "$dest"
    local tmp="${dest}__tmp_$$"
    rm -rf "$tmp"
    mkdir -p "$tmp"
    log_info "Unzip start: $zipfile -> $dest"
    unzip -q -o "$zipfile" -d "$tmp" || { log_error "Unzip failed: $zipfile"; rm -rf "$tmp"; return 1; }

    # Strip single top-level directory (GitHub zipball convention)
    local count top_dir
    count=$(ls "$tmp" | wc -l)
    top_dir=$(ls "$tmp" | head -1)
    if [ "$count" -eq 1 ] && [ -d "$tmp/$top_dir" ]; then
        mv "$tmp/$top_dir"/* "$dest/" 2>/dev/null
        mv "$tmp/$top_dir"/.* "$dest/" 2>/dev/null
        log_info "Unzip complete (stripped top dir): $zipfile"
    else
        mv "$tmp"/* "$dest/" 2>/dev/null
        log_info "Unzip complete: $zipfile"
    fi
    rm -rf "$tmp"
}

# ── resources.conf ──────────────────────────────────────────

do_list_resources() {
    [ -f "$RESOURCES_CONF" ] || return 0
    grep -v '^#' "$RESOURCES_CONF" | grep -v '^$'
}

do_add_resource() {
    local id="$1" name="$2" repo="$3" strategy="${4:-zipball}" order="${5:-50}" category="${6:-}"
    [ -z "$id" ] || [ -z "$name" ] || [ -z "$repo" ] && {
        log_error "add-resource requires: id name repo [strategy] [order] [category]"
        return 1
    }
    # Remove existing entry with same id
    if [ -f "$RESOURCES_CONF" ]; then
        sed -i "/^${id}|/d" "$RESOURCES_CONF"
    fi
    mkdir -p "$(dirname "$RESOURCES_CONF")"
    echo "${id}|${name}|${repo}|${strategy}|${order}|${category}" >> "$RESOURCES_CONF"
    log_info "Resource added: ${id} (${repo})"
}

do_remove_resource() {
    local id="$1"
    [ -z "$id" ] && { log_error "remove-resource requires: id"; return 1; }
    [ -f "$RESOURCES_CONF" ] || return 0
    sed -i "/^${id}|/d" "$RESOURCES_CONF"
    log_info "Resource removed: ${id}"
}

do_reset_resources() {
    do_ensure_dirs
    if ! cp -f "$DEFAULT_RESOURCES_CONF" "$RESOURCES_CONF"; then
        log_error "Reset resources failed: cannot copy default resources.conf"
        return 1
    fi
    log_info "Resources reset to defaults"
}

# ── deploy ───────────────────────────────────────────────────

do_deploy() {
    local src="$1" dest="$2" pkg="$3"
    log_info "Deploying to $pkg ($dest)"

    # Backup user files
    local backup="${PERSIST_DIR}/backup_${pkg}"
    rm -rf "$backup"
    mkdir -p "$backup"
    if [ -d "$dest" ]; then
        while IFS= read -r pattern; do
            [ -n "$pattern" ] || continue
            find "$dest" -maxdepth 1 -name "$pattern" -exec cp -af {} "$backup/" \; 2>/dev/null
        done < "$PRESERVE_PATTERNS_CONF"
        find "$dest" -maxdepth 1 -name "*.userdb" -type d -exec cp -af {} "$backup/" \; 2>/dev/null
    fi

    # Create destination and clean managed files
    mkdir -p "$dest"
    if [ -d "$dest" ]; then
        find "$dest" -maxdepth 1 -type f \
            \( -name "*.yaml" -o -name "*.lua" -o -name "*.txt" \
               -o -name "*.gram" -o -name "*.bin" \) \
            ! -name "*.custom.yaml" ! -name "user.yaml" \
            ! -name "installation.yaml" \
            -exec rm -f {} \; 2>/dev/null
        rm -rf "$dest/opencc" "$dest/lua" 2>/dev/null
    fi

    # Copy source files
    cp -af "$src/"* "$dest/" 2>/dev/null

    # Restore user files (override staging conflicts)
    if [ -d "$backup" ] && [ "$(ls -A "$backup" 2>/dev/null)" ]; then
        cp -af "$backup/"* "$dest/" 2>/dev/null
        cp -af "$backup/"*.userdb "$dest/" 2>/dev/null
    fi

    # Fix permissions
    fix_permissions "$dest" "$pkg"
    rm -rf "$backup"
    log_info "Deploy to $pkg complete"
}

# ── deploy-all ───────────────────────────────────────────────
# Full pipeline: build staging from enabled resources → deploy to all target apps
# Used by action.sh, service.sh, and WebUI

do_deploy_all() {
    do_ensure_dirs
    log_info "Deploy-all start"

    # Build staging in order from resources.conf
    rm -rf "$STAGING_DIR"
    mkdir -p "$STAGING_DIR"
    do_list_resources | sort -t'|' -k5 -n | while IFS='|' read -r rid rname rrepo rstrategy rorder rcategory; do
        if is_resource_enabled "$rid" && [ -d "$RESOURCE_DIR/$rid" ]; then
            log_info "Staging $rid"
            cp -af "$RESOURCE_DIR/$rid/"* "$STAGING_DIR/" 2>/dev/null
        elif is_resource_enabled "$rid"; then
            log_info "Skip staging $rid: resource not downloaded"
        fi
    done
    rm -f "$STAGING_DIR/README.md" "$STAGING_DIR/LICENSE" 2>/dev/null
    rm -rf "$STAGING_DIR/.github" 2>/dev/null

    if [ ! "$(ls -A "$STAGING_DIR" 2>/dev/null)" ]; then
        log_info "Staging empty, nothing to deploy"
        return 0
    fi

    # Resolve target apps and deploy
    local target_apps
    target_apps=$(do_config_get "target_apps" "")
    do_detect | while IFS='|' read -r pkg label path uid dir_exists; do
        if [ -z "$target_apps" ] || echo "$target_apps" | grep -q "$pkg"; then
            log_info "Deploy target selected: $pkg"
            do_deploy "$STAGING_DIR" "$path" "$pkg"
        fi
    done

    rm -rf "$STAGING_DIR"
    log_info "Deploy-all complete"
}

# ── log ──────────────────────────────────────────────────────

do_log() {
    cat "$LOG_FILE" 2>/dev/null || echo ""
}

# ── ensure-dirs ──────────────────────────────────────────────

do_ensure_dirs() {
    mkdir -p "$RESOURCE_DIR" "$VERSION_DIR" "$STAGING_DIR" \
             "$LOG_DIR" "$DOWNLOAD_DIR"
}

# ── cache maintenance ───────────────────────────────────────

do_clear_download_cache() {
    mkdir -p "$DOWNLOAD_DIR"
    for item in "$DOWNLOAD_DIR"/* "$DOWNLOAD_DIR"/.[!.]* "$DOWNLOAD_DIR"/..?*; do
        [ -e "$item" ] || continue
        rm -rf "$item"
    done
    log_info "Download cache cleared"
}

# ── Main dispatch ────────────────────────────────────────────

case "${1:-}" in
    detect)
        do_detect
        ;;
    download)
        do_download "$2" "$3"
        ;;
    unzip)
        do_unzip "$2" "$3"
        ;;
    deploy)
        do_deploy "$2" "$3" "$4"
        ;;
    deploy-all)
        do_deploy_all
        ;;
    list-resources)
        do_list_resources
        ;;
    add-resource)
        do_add_resource "$2" "$3" "$4" "$5" "$6" "$7"
        ;;
    remove-resource)
        do_remove_resource "$2"
        ;;
    reset-resources)
        do_reset_resources
        ;;
    config)
        case "$2" in
            get) do_config_get "$3" "$4" ;;
            set) do_config_set "$3" "$4" ;;
        esac
        ;;
    version)
        case "$2" in
            get) do_version_get "$3" ;;
            set) do_version_set "$3" "$4" ;;
        esac
        ;;
    log)
        do_log
        ;;
    ensure-dirs)
        do_ensure_dirs
        ;;
    clear-download-cache)
        do_clear_download_cache
        ;;
    *)
        echo "Usage: helper.sh <command> [args...]"
        echo "Commands: detect download unzip deploy deploy-all list-resources add-resource remove-resource reset-resources config version log ensure-dirs clear-download-cache"
        exit 1
        ;;
esac
