$repo = "TheusHen/Mineflared"
$exeName = "mineflared-windows.exe"
$tempPath = "$env:TEMP\$exeName"

$releaseApi = "https://api.github.com/repos/$repo/releases/latest"
$releaseInfo = Invoke-RestMethod -Uri $releaseApi -Headers @{ "User-Agent" = "PowerShell" }

$asset = $releaseInfo.assets | Where-Object { $_.name -eq $exeName }

if (-not $asset) {
    Write-Error "$exeName not found in the latest release."
    exit 1
}

$spinner = @('|','/','-','\')
$spinnerIndex = 0

$webClient = New-Object System.Net.WebClient

$webClient.DownloadProgressChanged += {
    param($sender, $e)
    $percent = $e.ProgressPercentage
    $spinnerChar = $spinner[$spinnerIndex % $spinner.Length]
    Write-Host -NoNewline ("`rDownloading $exeName... $spinnerChar $percent%   ")
    $spinnerIndex++
}

$downloadComplete = $false
$webClient.DownloadFileCompleted += {
    $downloadComplete = $true
}

$uri = $asset.browser_download_url

$webClient.DownloadFileAsync([Uri]$uri, $tempPath)

while (-not $downloadComplete) {
    Start-Sleep -Milliseconds 100
}

Write-Host "`nRunning $exeName..."
Start-Process -FilePath $tempPath -Wait