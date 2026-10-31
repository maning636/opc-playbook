$ErrorActionPreference = "Stop"
$env:PYTHONIOENCODING = "utf-8"
$sandbox = Join-Path $env:TEMP ("bizid-test-" + [guid]::NewGuid().ToString("N").Substring(0,8))
New-Item -ItemType Directory -Force -Path $sandbox | Out-Null
Write-Output "SANDBOX: $sandbox"

$root = "D:\opc-playbook"
$bizid = Join-Path $root "skills\opc-business-registry\scripts\bizid.mjs"
$state = Join-Path $root "skills\idea-to-cash\scripts\state.mjs"

Write-Output "`n=== 1. alloc ==="
node $bizid alloc --cwd $sandbox --title "HyperFrames AI 视频创作工作站"

Write-Output "`n=== 2. alloc 幂等（再跑一次不应重新分配）==="
node $bizid alloc --cwd $sandbox --title "改名了"

Write-Output "`n=== 3. get ==="
node $bizid get --cwd $sandbox

Write-Output "`n=== 4. 三层建目录 ==="
New-Item -ItemType Directory -Force -Path (Join-Path $sandbox "opc-doc\outputs") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $sandbox "docs") | Out-Null
Set-Content -Path (Join-Path $sandbox "opc-doc\outputs\03-价值主张.md") -Value "# REQ-2026-0001 · 价值主张`n占位`n" -Encoding UTF8
Set-Content -Path (Join-Path $sandbox "PROGRESS.md") -Value "# 进度`n- [ ] REQ-2026-0001 任务 1`n" -Encoding UTF8

Write-Output "`n=== 5. 产品层 init（不传 --biz-id，应自动读 business.json）==="
node $state init --cwd $sandbox --form-factor web --has-server false --idea "AI 视频创作工作站"

Write-Output "`n=== 6. 产品层 status ==="
node $state status --cwd $sandbox

Write-Output "`n=== 7. link 两层指针 ==="
node $bizid link opc "opc-doc/state/current-stage.json" --cwd $sandbox
node $bizid link idea ".vibe/state.json" --cwd $sandbox
node $bizid link engineering "PROGRESS.md" --cwd $sandbox
node $state link opc "opc-doc/state/current-stage.json" --cwd $sandbox
node $state link engineering "PROGRESS.md" --cwd $sandbox

Write-Output "`n=== 8. bizid status（巡检）==="
node $bizid status --cwd $sandbox

Write-Output "`n=== 9. set biz_id 校验（应报错）==="
node $state set biz_id "WRONG-ID" --cwd $sandbox
Write-Output "exit=$LASTEXITCODE"

Write-Output "`n=== 10. v1 → v2 迁移 ==="
$legacy = Join-Path $sandbox "legacy"
New-Item -ItemType Directory -Force -Path (Join-Path $legacy ".vibe") | Out-Null
Copy-Item -LiteralPath (Join-Path $root "tools\fixtures\state-v1.json") -Destination (Join-Path $legacy ".vibe\state.json")
node $state status --cwd $legacy
Write-Output "`n--- 迁移后的 state.json ---"
Get-Content -LiteralPath (Join-Path $legacy ".vibe\state.json") -Encoding UTF8

Write-Output "`n=== 11. 撞号测试（预置 REQ-2026-0007 再 alloc，应得 0008）==="
$hit = Join-Path $sandbox "hit"
New-Item -ItemType Directory -Force -Path $hit | Out-Null
Set-Content -Path (Join-Path $hit "note.md") -Value "见 REQ-2026-0007" -Encoding UTF8
node $bizid alloc --cwd $hit --title "撞号测试"

Write-Output "`n=== 12. 清理 ==="
Remove-Item -Recurse -Force $sandbox
Write-Output "done"
