Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$logoPath = Join-Path $root "public\brand\logo-mark.png"
$qrPath = Join-Path $root "public\brand\qr-svetaine-black.png"
$outPath = Join-Path $root "public\brand\qr-svetaine-juodas.png"

$W = 1000
$H = 1560

$cream = [System.Drawing.Color]::FromArgb(255, 255, 248, 240)
$red = [System.Drawing.Color]::FromArgb(255, 139, 38, 53)
$dark = [System.Drawing.Color]::FromArgb(255, 17, 17, 17)
$gold = [System.Drawing.Color]::FromArgb(255, 201, 169, 98)

$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

function New-RoundedRect($x, $y, $w, $h, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  return $path
}

$g.Clear($dark)

$framePen = New-Object System.Drawing.Pen $gold, 4
$frame = New-RoundedRect 30 30 ($W - 60) ($H - 60) 40
$g.DrawPath($framePen, $frame)

$logo = [System.Drawing.Bitmap]::FromFile($logoPath)
$whiteLogo = New-Object System.Drawing.Bitmap $logo.Width, $logo.Height
for ($y = 0; $y -lt $logo.Height; $y++) {
  for ($x = 0; $x -lt $logo.Width; $x++) {
    $p = $logo.GetPixel($x, $y)
    if ($p.A -gt 20) {
      $whiteLogo.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($p.A, 255, 255, 255))
    } else {
      $whiteLogo.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    }
  }
}

$logoW = 540
$logoH = [int]($logo.Height * ($logoW / $logo.Width))
$logoX = [int](($W - $logoW) / 2)
$logoY = 105
$g.DrawImage($whiteLogo, $logoX, $logoY, $logoW, $logoH)
$logoBottom = $logoY + $logoH

$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center

$linePen = New-Object System.Drawing.Pen $gold, 2
$g.DrawLine($linePen, 310, ($logoBottom + 40), 690, ($logoBottom + 40))

$subFont = New-Object System.Drawing.Font "Georgia", 22, ([System.Drawing.FontStyle]::Italic)
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$mutedBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(210, 255, 255, 255))
$g.DrawString("Autentiskos italiskos picos", $subFont, $mutedBrush, ($W / 2), ($logoBottom + 60), $sf)

$cardSize = 650
$cardX = [int](($W - $cardSize) / 2)
$cardY = $logoBottom + 135
$shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(90, 0, 0, 0))
$shadowPath = New-RoundedRect ($cardX + 10) ($cardY + 12) $cardSize $cardSize 44
$g.FillPath($shadowBrush, $shadowPath)

$cardBrush = New-Object System.Drawing.SolidBrush $cream
$cardPath = New-RoundedRect $cardX $cardY $cardSize $cardSize 44
$g.FillPath($cardBrush, $cardPath)

$qr = [System.Drawing.Bitmap]::FromFile($qrPath)
$qrSize = 540
$qrX = [int](($W - $qrSize) / 2)
$qrY = $cardY + [int](($cardSize - $qrSize) / 2)
$g.DrawImage($qr, $qrX, $qrY, $qrSize, $qrSize)

$pillW = 330
$pillH = 84
$pillX = [int](($W - $pillW) / 2)
$pillY = $cardY + $cardSize + 55
$redBrush = New-Object System.Drawing.SolidBrush $red
$pillPath = New-RoundedRect $pillX $pillY $pillW $pillH 42
$g.FillPath($redBrush, $pillPath)

$pillFont = New-Object System.Drawing.Font "Segoe UI", 30, ([System.Drawing.FontStyle]::Bold)
$g.DrawString("Staliukas 1", $pillFont, $whiteBrush, ($W / 2), ($pillY + 18), $sf)

$ctaFont = New-Object System.Drawing.Font "Segoe UI Semibold", 31, ([System.Drawing.FontStyle]::Bold)
$stepsFont = New-Object System.Drawing.Font "Segoe UI", 20, ([System.Drawing.FontStyle]::Regular)
$goldBrush = New-Object System.Drawing.SolidBrush $gold

$g.DrawString("Nuskenuok ir uzsisakyk", $ctaFont, $whiteBrush, ($W / 2), ($pillY + 130), $sf)
$g.DrawString("Rinkis picas  .  Irasyk staliuka  .  Apmokek kortele", $stepsFont, $goldBrush, ($W / 2), ($pillY + 182), $sf)

$g.Dispose()
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$logo.Dispose()
$whiteLogo.Dispose()
$qr.Dispose()

Write-Output "Juodas svetaines plakatas issaugotas: $outPath"
