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
TASK_DIR="$PERSIST_DIR/tasks"
DOWNLOAD_TASK_STATUS_FILE="$TASK_DIR/download.status"
DOWNLOAD_TASK_PID_FILE="$TASK_DIR/download.pid"
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

download_task_now() {
    date '+%s'
}

download_task_sanitize() {
    printf '%s' "$*" | tr '\r\n' '  '
}

download_task_quote() {
    local value
    value=$(download_task_sanitize "$*")
    value=${value//\'/\'"\'"\'}
    printf "'%s'" "$value"
}

download_task_append_csv() {
    local current="$1" item="$2"
    if [ -z "$item" ]; then
        printf '%s' "$current"
    elif [ -z "$current" ]; then
        printf '%s' "$item"
    else
        printf '%s,%s' "$current" "$item"
    fi
}

download_task_default_state() {
    DOWNLOAD_TASK_STATE="idle"
    DOWNLOAD_TASK_MODE="single"
    DOWNLOAD_TASK_CURRENT_ID=""
    DOWNLOAD_TASK_CURRENT_STATE="idle"
    DOWNLOAD_TASK_CURRENT_DETAIL=""
    DOWNLOAD_TASK_COMPLETED_IDS=""
    DOWNLOAD_TASK_FAILED_IDS=""
    DOWNLOAD_TASK_ERROR=""
    DOWNLOAD_TASK_UPDATED_AT=$(download_task_now)
}

download_task_write_status() {
    mkdir -p "$TASK_DIR"
    DOWNLOAD_TASK_UPDATED_AT=$(download_task_now)
    cat > "$DOWNLOAD_TASK_STATUS_FILE" <<EOF
state=$(download_task_quote "$DOWNLOAD_TASK_STATE")
mode=$(download_task_quote "$DOWNLOAD_TASK_MODE")
current_id=$(download_task_quote "$DOWNLOAD_TASK_CURRENT_ID")
current_state=$(download_task_quote "$DOWNLOAD_TASK_CURRENT_STATE")
current_detail=$(download_task_quote "$DOWNLOAD_TASK_CURRENT_DETAIL")
completed_ids=$(download_task_quote "$DOWNLOAD_TASK_COMPLETED_IDS")
failed_ids=$(download_task_quote "$DOWNLOAD_TASK_FAILED_IDS")
error=$(download_task_quote "$DOWNLOAD_TASK_ERROR")
updated_at=$(download_task_quote "$DOWNLOAD_TASK_UPDATED_AT")
EOF
}

download_task_reset() {
    download_task_default_state
    DOWNLOAD_TASK_MODE="${1:-single}"
    download_task_write_status
}

download_task_load_status() {
    download_task_default_state
    [ -f "$DOWNLOAD_TASK_STATUS_FILE" ] && . "$DOWNLOAD_TASK_STATUS_FILE"
    DOWNLOAD_TASK_STATE="${state:-$DOWNLOAD_TASK_STATE}"
    DOWNLOAD_TASK_MODE="${mode:-$DOWNLOAD_TASK_MODE}"
    DOWNLOAD_TASK_CURRENT_ID="${current_id:-$DOWNLOAD_TASK_CURRENT_ID}"
    DOWNLOAD_TASK_CURRENT_STATE="${current_state:-$DOWNLOAD_TASK_CURRENT_STATE}"
    DOWNLOAD_TASK_CURRENT_DETAIL="${current_detail:-$DOWNLOAD_TASK_CURRENT_DETAIL}"
    DOWNLOAD_TASK_COMPLETED_IDS="${completed_ids:-$DOWNLOAD_TASK_COMPLETED_IDS}"
    DOWNLOAD_TASK_FAILED_IDS="${failed_ids:-$DOWNLOAD_TASK_FAILED_IDS}"
    DOWNLOAD_TASK_ERROR="${error:-$DOWNLOAD_TASK_ERROR}"
    DOWNLOAD_TASK_UPDATED_AT="${updated_at:-$DOWNLOAD_TASK_UPDATED_AT}"
}

download_task_status_output() {
    if [ -f "$DOWNLOAD_TASK_STATUS_FILE" ]; then
        download_task_load_status
    else
        download_task_default_state
    fi
    cat <<EOF
state=$(download_task_sanitize "$DOWNLOAD_TASK_STATE")
mode=$(download_task_sanitize "$DOWNLOAD_TASK_MODE")
current_id=$(download_task_sanitize "$DOWNLOAD_TASK_CURRENT_ID")
current_state=$(download_task_sanitize "$DOWNLOAD_TASK_CURRENT_STATE")
current_detail=$(download_task_sanitize "$DOWNLOAD_TASK_CURRENT_DETAIL")
completed_ids=$(download_task_sanitize "$DOWNLOAD_TASK_COMPLETED_IDS")
failed_ids=$(download_task_sanitize "$DOWNLOAD_TASK_FAILED_IDS")
error=$(download_task_sanitize "$DOWNLOAD_TASK_ERROR")
updated_at=$(download_task_sanitize "$DOWNLOAD_TASK_UPDATED_AT")
EOF
}

download_task_clear_pid() {
    rm -f "$DOWNLOAD_TASK_PID_FILE"
}

download_task_is_running() {
    local pid
    [ -f "$DOWNLOAD_TASK_PID_FILE" ] || return 1
    pid=$(cat "$DOWNLOAD_TASK_PID_FILE" 2>/dev/null)
    [ -n "$pid" ] || return 1
    kill -0 "$pid" 2>/dev/null
}

download_task_mark_progress() {
    DOWNLOAD_TASK_CURRENT_ID="$1"
    DOWNLOAD_TASK_CURRENT_STATE="$2"
    DOWNLOAD_TASK_CURRENT_DETAIL="$3"
    DOWNLOAD_TASK_STATE="running"
    download_task_write_status
}

download_task_mark_completed() {
    DOWNLOAD_TASK_COMPLETED_IDS=$(download_task_append_csv "$DOWNLOAD_TASK_COMPLETED_IDS" "$1")
}

download_task_mark_failed() {
    DOWNLOAD_TASK_FAILED_IDS=$(download_task_append_csv "$DOWNLOAD_TASK_FAILED_IDS" "$1")
}

download_task_finish_success() {
    DOWNLOAD_TASK_STATE="success"
    DOWNLOAD_TASK_CURRENT_STATE="done"
    DOWNLOAD_TASK_CURRENT_DETAIL="$1"
    DOWNLOAD_TASK_ERROR=""
    download_task_write_status
}

download_task_finish_error() {
    DOWNLOAD_TASK_STATE="error"
    DOWNLOAD_TASK_CURRENT_STATE="error"
    DOWNLOAD_TASK_CURRENT_DETAIL="$2"
    DOWNLOAD_TASK_ERROR="$2"
    [ -n "$1" ] && DOWNLOAD_TASK_CURRENT_ID="$1"
    download_task_write_status
}

github_http_get() {
    local url="$1"
    if has_cmd curl; then
        curl -fsSL --connect-timeout 15 --max-time 60 "$url"
    elif has_cmd wget; then
        wget -q -T 15 -O - "$url"
    else
        log_error "No HTTP client (curl/wget)"
        return 1
    fi
}

github_json_compact() {
    tr -d '\r\n\t' | sed 's/[[:space:]][[:space:]]*/ /g'
}

github_json_extract_first() {
    local key="$1"
    if has_cmd jq; then
        jq -er ".${key}"
        return $?
    fi
    awk -v key="$key" '
        {
            pat = "\"" key "\"[[:space:]]*:[[:space:]]*\"[^\"]*\""
            if (match($0, pat)) {
                value = substr($0, RSTART, RLENGTH)
                sub("^\"" key "\"[[:space:]]*:[[:space:]]*\"", "", value)
                sub("\"$", "", value)
                print value
                exit
            }
        }
        END {
            if (NR == 0 || !RSTART) exit 1
        }
    '
}

github_json_extract_all() {
    local key="$1"
    if has_cmd jq; then
        jq -er ".assets[]?.${key}"
        return $?
    fi
    awk -v key="$key" '
        {
            s = $0
            pat = "\"" key "\"[[:space:]]*:[[:space:]]*\"[^\"]*\""
            while (match(s, pat)) {
                value = substr(s, RSTART, RLENGTH)
                sub("^\"" key "\"[[:space:]]*:[[:space:]]*\"", "", value)
                sub("\"$", "", value)
                print value
                s = substr(s, RSTART + RLENGTH)
                found = 1
            }
        }
        END {
            if (!found) exit 1
        }
    '
}

github_release_json() {
    local repo="$1" tag="$2"
    local url body
    if [ -n "$tag" ]; then
        url="https://api.github.com/repos/${repo}/releases/tags/${tag}"
    else
        url="https://api.github.com/repos/${repo}/releases/latest"
    fi
    body=$(github_http_get "$url") || {
        log_error "Failed to fetch GitHub release JSON: $repo ${tag:-latest}"
        return 1
    }
    printf '%s' "$body" | github_json_compact
}

github_commit_sha() {
    local repo="$1" ref="$2" body sha
    body=$(github_http_get "https://api.github.com/repos/${repo}/commits/${ref}") || {
        log_error "Failed to fetch GitHub commit JSON: $repo $ref"
        return 1
    }
    sha=$(printf '%s' "$body" | github_json_compact | github_json_extract_first sha) || {
        log_error "Failed to parse GitHub commit SHA: $repo $ref"
        return 1
    }
    [ -n "$sha" ] || {
        log_error "GitHub commit SHA missing: $repo $ref"
        return 1
    }
    printf '%s' "$sha" | cut -c1-12
}

github_archive_url() {
    local repo="$1" ref="$2"
    printf 'https://api.github.com/repos/%s/zipball/%s' "$repo" "$ref"
}

resource_get_def() {
    local rid="$1"
    [ -f "$RESOURCES_CONF" ] || return 1
    awk -F'|' -v rid="$rid" '$1 == rid { line = $0 } END { if (line) print line; else exit 1 }' "$RESOURCES_CONF"
}

strategy_parse() {
    local raw="$1"
    STRATEGY_TYPE="zipball"
    STRATEGY_PATTERN=""
    STRATEGY_TAG=""

    [ -n "$raw" ] && [ "$raw" != "zipball" ] || return 0

    local type rest at_idx before after
    case "$raw" in
        *:*)
            type=${raw%%:*}
            rest=${raw#*:}
            ;;
        *)
            type="$raw"
            rest=""
            ;;
    esac

    if [ -n "$rest" ]; then
        case "$rest" in
            *@*)
                before=${rest%@*}
                after=${rest##*@}
                STRATEGY_PATTERN="$before"
                STRATEGY_TAG="$after"
                ;;
            *)
                STRATEGY_PATTERN="$rest"
                ;;
        esac
    else
        case "$type" in
            *@*)
                before=${type%@*}
                after=${type##*@}
                type="$before"
                STRATEGY_TAG="$after"
                ;;
        esac
    fi

    STRATEGY_TYPE="$type"
}

resource_match_urls() {
    local pattern="$1"
    while IFS= read -r url; do
        [ -n "$url" ] || continue
        local name
        name=${url##*/}
        if printf '%s\n' "$name" | grep -E -q "$pattern"; then
            printf '%s\n' "$url"
        fi
    done
}

resource_download_one() {
    local rid="$1"
    local def
    def=$(resource_get_def "$rid")
    [ -n "$def" ] || {
        download_task_mark_failed "$rid"
        download_task_finish_error "$rid" "Unknown resource: $rid"
        return 1
    }

    local _name repo strategy _order _category
    IFS='|' read -r _rid _name repo strategy _order _category <<EOF
$def
EOF

    strategy_parse "$strategy"
    local extract_dir="$RESOURCE_DIR/$rid"
    local current detail release_json tag ref sha dl_file urls first_url url filename

    download_task_mark_progress "$rid" "checking" ""

    if [ "$STRATEGY_TYPE" = "archive" ]; then
        ref="${STRATEGY_TAG:-HEAD}"
        sha=$(github_commit_sha "$repo" "$ref") || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "检查归档版本失败"
            return 1
        }

        current=$(do_version_get "$rid")
        if [ "$current" = "$sha" ] && [ -n "$sha" ]; then
            download_task_mark_progress "$rid" "done" "Already up to date ($sha)"
            download_task_mark_completed "$rid"
            return 0
        fi

        dl_file="$DOWNLOAD_DIR/${rid}.zip"
        download_task_mark_progress "$rid" "downloading" "$ref"
        do_download "$(github_archive_url "$repo" "$ref")" "$dl_file" || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "下载失败"
            return 1
        }

        download_task_mark_progress "$rid" "extracting" "$ref"
        do_unzip "$dl_file" "$extract_dir" || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "解压失败"
            return 1
        }

        do_version_set "$rid" "$sha"
        download_task_mark_progress "$rid" "done" "$sha"
        download_task_mark_completed "$rid"
        return 0
    fi

    release_json=$(github_release_json "$repo" "$STRATEGY_TAG") || {
        download_task_mark_failed "$rid"
        download_task_finish_error "$rid" "获取发布信息失败"
        return 1
    }
    tag=$(printf '%s' "$release_json" | github_json_extract_first tag_name) || {
        download_task_mark_failed "$rid"
        download_task_finish_error "$rid" "解析发布版本失败"
        return 1
    }
    [ -n "$tag" ] || {
        download_task_mark_failed "$rid"
        download_task_finish_error "$rid" "发布版本为空"
        return 1
    }
    current=$(do_version_get "$rid")
    if [ "$current" = "$tag" ] && [ -n "$tag" ]; then
        download_task_mark_progress "$rid" "done" "Already up to date ($tag)"
        download_task_mark_completed "$rid"
        return 0
    fi

    download_task_mark_progress "$rid" "downloading" "$tag"

    if [ "$STRATEGY_TYPE" = "asset" ] && [ -n "$STRATEGY_PATTERN" ]; then
        urls=$(printf '%s' "$release_json" | github_json_extract_all browser_download_url) || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "解析资源列表失败"
            return 1
        }
        urls=$(printf '%s\n' "$urls" | resource_match_urls "$STRATEGY_PATTERN")
        first_url=$(printf '%s\n' "$urls" | head -1)
        [ -n "$first_url" ] || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "No matching asset for $STRATEGY_PATTERN"
            return 1
        }
        dl_file="$DOWNLOAD_DIR/${rid}.zip"
        do_download "$first_url" "$dl_file" || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "下载失败"
            return 1
        }
        download_task_mark_progress "$rid" "extracting" "$tag"
        do_unzip "$dl_file" "$extract_dir" || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "解压失败"
            return 1
        }
    elif [ "$STRATEGY_TYPE" = "asset-files" ] && [ -n "$STRATEGY_PATTERN" ]; then
        urls=$(printf '%s' "$release_json" | github_json_extract_all browser_download_url) || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "解析资源列表失败"
            return 1
        }
        urls=$(printf '%s\n' "$urls" | resource_match_urls "$STRATEGY_PATTERN")
        [ -n "$urls" ] || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "No matching asset for $STRATEGY_PATTERN"
            return 1
        }
        mkdir -p "$extract_dir"
        printf '%s\n' "$urls" | while IFS= read -r url; do
            [ -n "$url" ] || continue
            filename=${url##*/}
            do_download "$url" "$extract_dir/$filename" || exit 1
        done
        [ "$?" -eq 0 ] || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "下载失败"
            return 1
        }
    else
        dl_file="$DOWNLOAD_DIR/${rid}.zip"
        first_url=$(printf '%s' "$release_json" | github_json_extract_first zipball_url) || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "解析压缩包地址失败"
            return 1
        }
        [ -n "$first_url" ] || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "获取压缩包地址失败"
            return 1
        }
        do_download "$first_url" "$dl_file" || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "下载失败"
            return 1
        }
        download_task_mark_progress "$rid" "extracting" "$tag"
        do_unzip "$dl_file" "$extract_dir" || {
            download_task_mark_failed "$rid"
            download_task_finish_error "$rid" "解压失败"
            return 1
        }
    fi

    do_version_set "$rid" "$tag"
    download_task_mark_progress "$rid" "done" "$tag"
    download_task_mark_completed "$rid"
    return 0
}

download_task_enabled_ids() {
    do_list_resources | while IFS='|' read -r rid _name _repo _strategy _order _category; do
        [ -n "$rid" ] || continue
        if is_resource_enabled "$rid"; then
            printf '%s\n' "$rid"
        fi
    done
}

download_task_run_bulk() {
    local any_failed=0 detail=""
    while [ "$#" -gt 0 ]; do
        if ! resource_download_one "$1"; then
            any_failed=1
        fi
        shift
    done

    if [ "$any_failed" -eq 0 ]; then
        detail="Bulk download complete"
        download_task_finish_success "$detail"
        return 0
    fi

    detail="$DOWNLOAD_TASK_ERROR"
    [ -n "$detail" ] || detail="Bulk download failed"
    download_task_finish_error "$DOWNLOAD_TASK_CURRENT_ID" "$detail"
    return 1
}

download_task_run() {
    local mode="$1"
    shift

    do_ensure_dirs
    download_task_load_status
    DOWNLOAD_TASK_MODE="$mode"
    DOWNLOAD_TASK_STATE="running"
    download_task_write_status

    if [ "$mode" = "bulk" ]; then
        download_task_run_bulk "$@"
    else
        if resource_download_one "$1"; then
            download_task_finish_success "Download complete"
        fi
    fi

    download_task_clear_pid
}

download_task_spawn() {
    local mode="$1"
    shift

    do_ensure_dirs
    if download_task_is_running; then
        log_error "Download task already running"
        return 1
    fi

    download_task_reset "$mode"
    DOWNLOAD_TASK_STATE="running"
    download_task_write_status

    sh "$0" download-task run "$mode" "$@" >/dev/null 2>&1 &
    printf '%s' "$!" > "$DOWNLOAD_TASK_PID_FILE"
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
        awk -F'|' -v id="$id" '$1 != id' "$RESOURCES_CONF" > "$RESOURCES_CONF.tmp" && mv "$RESOURCES_CONF.tmp" "$RESOURCES_CONF"
    fi
    mkdir -p "$(dirname "$RESOURCES_CONF")"
    echo "${id}|${name}|${repo}|${strategy}|${order}|${category}" >> "$RESOURCES_CONF"
    log_info "Resource added: ${id} (${repo})"
}

do_remove_resource() {
    local id="$1"
    [ -z "$id" ] && { log_error "remove-resource requires: id"; return 1; }
    [ -f "$RESOURCES_CONF" ] || return 0
    awk -F'|' -v id="$id" '$1 != id' "$RESOURCES_CONF" > "$RESOURCES_CONF.tmp" && mv "$RESOURCES_CONF.tmp" "$RESOURCES_CONF"
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
             "$LOG_DIR" "$DOWNLOAD_DIR" "$TASK_DIR"
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
    download-task)
        case "$2" in
            start)
                [ -n "$3" ] || { log_error "download-task start requires resource id"; exit 1; }
                download_task_spawn single "$3"
                ;;
            start-enabled)
                set -- $(download_task_enabled_ids)
                download_task_spawn bulk "$@"
                ;;
            status)
                download_task_status_output
                ;;
            run)
                shift 2
                download_task_run "$@"
                ;;
            *)
                log_error "Usage: helper.sh download-task <start|start-enabled|status>"
                exit 1
                ;;
        esac
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
        echo "Commands: detect download unzip download-task deploy deploy-all list-resources add-resource remove-resource reset-resources config version log ensure-dirs clear-download-cache"
        exit 1
        ;;
esac
