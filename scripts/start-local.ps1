param(
    [ValidateSet('production', 'dev')]
    [string]$Mode = 'production',
    [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw 'Cần cài Node.js 24 để chạy MaKeng.' }
$nodeMajor = & $nodeCommand.Source -p "process.versions.node.split('.')[0]"
if ($nodeMajor -ne '24') { throw 'MaKeng yêu cầu Node.js 24.x.' }
$nextCommand = Join-Path $projectRoot 'apps\web\node_modules\next\dist\bin\next'
if (-not (Test-Path -LiteralPath $nextCommand)) {
    throw 'Chưa có dependency. Cài theo README bằng pnpm install --frozen-lockfile trước.'
}
$webRoot = Join-Path $projectRoot 'apps\web'
if ($env:NEXT_PUBLIC_MAKENG_DEMO -eq 'false') {
    throw 'Lệnh này chạy toàn bộ app ở chế độ trình duyệt. Bỏ NEXT_PUBLIC_MAKENG_DEMO=false theo README trước.'
}
Push-Location $projectRoot
try {
    if ($Rebuild) {
        & $nodeCommand.Source $nextCommand build $webRoot
        if ($LASTEXITCODE -ne 0) { throw 'Build chưa thành công. Xem lỗi bên trên.' }
    }
    if ($Mode -eq 'production' -and -not (Test-Path -LiteralPath (Join-Path $webRoot '.next\BUILD_ID'))) {
        throw 'Chưa có production build. Chạy lại với -Rebuild hoặc -Mode dev.'
    }
    Write-Host 'MaKeng: http://127.0.0.1:3000 — giữ cửa sổ này mở, Ctrl+C để dừng.'
    $nextMode = if ($Mode -eq 'dev') { 'dev' } else { 'start' }
    & $nodeCommand.Source $nextCommand $nextMode $webRoot --hostname 127.0.0.1 --port 3000
    if ($LASTEXITCODE -ne 0) { throw 'App chưa khởi động được. Kiểm tra lỗi bên trên hoặc port 3000 đang dùng.' }
}
finally { Pop-Location }
