Add-Type -AssemblyName System.Drawing

$root = Split-Path $PSScriptRoot -Parent
$logoPath = Join-Path $root "public\brand\logo-mark.png"
$qrPath   = Join-Path $root "public\brand\qr-raw.png"
$outPath  = Join-Path $root "public\brand\qr-plakatas.png"

$W = 1000
$H = 1560

$cream = [System.Drawing.Color]::FromArgb(255, 255, 248, 240)
$red   = [System.Drawing.Color]::FromArgb(255, 139, 38, 53)
$dark  = [System.Drawing.Color]::FromArgb(255, 17, 17, 17)
$gold  = [System.Drawing.Color]::FromArgb(255, 201, 169, 98)
$sand  = [System.Drawing.Color]::FromArgb(255, 245, 233, 218)

$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background
$g.Clear($cream)

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

# Outer border frame (gold, subtle)
$goldPen = New-Object System.Drawing.Pen $gold, 4
$frame = New-RoundedRect 30 30 ($W-60) ($H-60) 40
$g.DrawPath($goldPen, $frame)

# Logo (black) centered top
$logo = [System.Drawing.Bitmap]::FromFile($logoPath)
$logoW = 560
$logoH = [int]($logo.Height * ($logoW / $logo.Width))
$g.DrawImage($logo, [int](($W - $logoW)/2), 100, $logoW, $logoH)
$logoBottom = 100 + $logoH

# Divider line
$linePen = New-Object System.Drawing.Pen $gold, 2
$g.DrawLine($linePen, 300, ($logoBottom + 40), 700, ($logoBottom + 40))

# Subtitle: "Autentiskos italiskos picos"
$subFont = New-Object System.Drawing.Font "Georgia", 22, ([System.Drawing.FontStyle]::Italic)
$subBrush = New-Object System.Drawing.SolidBrush $dark
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("Autentiskos italiskos picos", $subFont, $subBrush, ($W/2), ($logoBottom + 60), $sf)

# White card for QR
$cardSize = 640
$cardX = [int](($W - $cardSize)/2)
$cardY = $logoBottom + 130
$shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(30,0,0,0))
$shadowPath = New-RoundedRect ($cardX+8) ($cardY+10) $cardSize $cardSize 40
$g.FillPath($shadowBrush, $shadowPath)
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$cardPath = New-RoundedRect $cardX $cardY $cardSize $cardSize 40
$g.FillPath($whiteBrush, $cardPath)

# QR inside card
$qr = [System.Drawing.Bitmap]::FromFile($qrPath)
$qrSize = 540
$qrX = [int](($W - $qrSize)/2)
$qrY = $cardY + [int](($cardSize - $qrSize)/2)
$g.DrawImage($qr, $qrX, $qrY, $qrSize, $qrSize)

# "Staliukas 1" pill under card
$pillW = 320
$pillH = 84
$pillX = [int](($W - $pillW)/2)
$pillY = $cardY + $cardSize + 45
$redBrush = New-Object System.Drawing.SolidBrush $red
$pillPath = New-RoundedRect $pillX $pillY $pillW $pillH 42
$g.FillPath($redBrush, $pillPath)
$pillFont = New-Object System.Drawing.Font "Segoe UI", 30, ([System.Drawing.FontStyle]::Bold)
$whiteText = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.DrawString("Staliukas 1", $pillFont, $whiteText, ($W/2), ($pillY + 18), $sf)

# Call to action text
$ctaFont = New-Object System.Drawing.Font "Segoe UI Semibold", 30, ([System.Drawing.FontStyle]::Bold)
$ctaBrush = New-Object System.Drawing.SolidBrush $dark
$g.DrawString("Nuskenuok ir uzsisakyk", $ctaFont, $ctaBrush, ($W/2), ($pillY + 130), $sf)

$stepsFont = New-Object System.Drawing.Font "Segoe UI", 20, ([System.Drawing.FontStyle]::Regular)
$stepsBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255,120,110,100))
$g.DrawString("Skenuok  .  Rinkis picas  .  Megaukis", $stepsFont, $stepsBrush, ($W/2), ($pillY + 180), $sf)

$g.Dispose()
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$logo.Dispose()
$qr.Dispose()
Write-Output "Plakatas issaugotas: $outPath"
