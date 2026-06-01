@echo off
REM =============================================================
REM Lucky Star Casino — Claude Skills 安裝腳本 (Windows)
REM 用途：將 docs\skills\ 內的 skill 安裝到本機 Claude skills 目錄
REM 使用：在專案根目錄雙擊執行，或命令列執行 docs\skills\install-skills.bat
REM =============================================================

setlocal enabledelayedexpansion
echo === Lucky Star Casino Skill Installer ===
echo.

REM ── 自動找出本機 Claude skills 目錄 ──────────────────────────
REM 策略：用 where 搜尋 wrap-up\SKILL.md，反推 skills 根目錄

set "SKILLS_DIR="

REM 搜尋常見安裝路徑
for /d %%A in (
  "%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\local-agent-mode-sessions"
  "%APPDATA%\Claude\local-agent-mode-sessions"
) do (
  if exist "%%~A" (
    for /r "%%~A" %%B in (wrap-up\SKILL.md) do (
      if "!SKILLS_DIR!"=="" (
        set "SKILLS_DIR=%%~dpB"
        REM 去掉最後的 wrap-up\ 得到 skills 根目錄
        set "SKILLS_DIR=!SKILLS_DIR:~0,-9!"
      )
    )
  )
)

if "!SKILLS_DIR!"=="" (
  echo [ERROR] 找不到 Claude skills 目錄。
  echo         請確認 Claude 已安裝並至少開啟過一次。
  pause
  exit /b 1
)

echo [INFO]  Skills 目錄：!SKILLS_DIR!
echo.

REM ── 安裝 docs\skills\ 底下每個含 SKILL.md 的目錄 ─────────────
set SCRIPT_DIR=%~dp0
set INSTALLED=0
set SKIPPED=0

for /d %%S in ("%SCRIPT_DIR%*") do (
  if exist "%%S\SKILL.md" (
    set "SKILL_NAME=%%~nxS"
    set "TARGET=!SKILLS_DIR!\!SKILL_NAME!"

    if exist "!TARGET!" (
      echo [SKIP]  !SKILL_NAME! 已存在，略過
      set /a SKIPPED+=1
    ) else (
      xcopy /e /i /q "%%S" "!TARGET!" >nul
      echo [OK]    !SKILL_NAME! 安裝完成
      set /a INSTALLED+=1
    )
  )
)

echo.
echo === 完成：安裝 %INSTALLED% 個，略過 %SKIPPED% 個 ===
echo.
echo 請重新啟動 Claude 讓 skill 生效。
echo 測試：在對話框輸入「幫我寫 T-010 的提示詞」
echo.
pause
