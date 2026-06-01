#!/usr/bin/env bash
# =============================================================
# Lucky Star Casino — Claude Skills 安裝腳本
# 用途：將 docs/skills/ 內的 skill 安裝到本機 Claude skills 目錄
# 使用：在專案根目錄執行  bash docs/skills/install-skills.sh
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_SOURCE="$SCRIPT_DIR"

echo "=== Lucky Star Casino Skill Installer ==="
echo ""

# ── 自動找出本機的 Claude skills 目錄 ──────────────────────────
# 策略：搜尋已知一定存在的 wrap-up skill，反推 skills 根目錄

find_skills_dir() {
  local search_roots=(
    "$APPDATA/Claude/local-agent-mode-sessions"
    "$LOCALAPPDATA/Packages/Claude_pzs8sxrjxfjjc/LocalCache/Roaming/Claude/local-agent-mode-sessions"
    "$HOME/Library/Application Support/Claude/local-agent-mode-sessions"
    "$HOME/.config/Claude/local-agent-mode-sessions"
  )

  for root in "${search_roots[@]}"; do
    if [ -d "$root" ]; then
      # 找包含 wrap-up 的 skills 目錄（wrap-up 是官方內建，一定存在）
      local found
      found=$(find "$root" -type d -name "wrap-up" 2>/dev/null | head -1)
      if [ -n "$found" ]; then
        dirname "$found"
        return 0
      fi
    fi
  done
  return 1
}

SKILLS_DIR=$(find_skills_dir)

if [ -z "$SKILLS_DIR" ]; then
  echo "[ERROR] 找不到 Claude skills 目錄。"
  echo "        請確認 Claude 已安裝並至少開啟過一次。"
  exit 1
fi

echo "[INFO]  Skills 目錄：$SKILLS_DIR"
echo ""

# ── 安裝 docs/skills/ 底下每個 skill ───────────────────────────
INSTALLED=0
SKIPPED=0

for skill_dir in "$SKILLS_SOURCE"/*/; do
  skill_name=$(basename "$skill_dir")

  # 跳過非 skill 目錄（沒有 SKILL.md 的）
  if [ ! -f "$skill_dir/SKILL.md" ]; then
    continue
  fi

  target="$SKILLS_DIR/$skill_name"

  if [ -d "$target" ]; then
    echo "[SKIP]  $skill_name 已存在，略過（如需更新請手動刪除後重新執行）"
    SKIPPED=$((SKIPPED + 1))
  else
    cp -r "$skill_dir" "$target"
    echo "[OK]    $skill_name 安裝完成"
    INSTALLED=$((INSTALLED + 1))
  fi
done

echo ""
echo "=== 完成：安裝 $INSTALLED 個，略過 $SKIPPED 個 ==="
echo ""
echo "請重新啟動 Claude 讓 skill 生效。"
echo "測試：在對話框輸入「幫我寫 T-010 的提示詞」"
