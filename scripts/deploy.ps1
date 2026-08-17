# Deploy Script for MediSetu React App
# Usage: .\scripts\deploy.ps1

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Deployment Process..." -ForegroundColor Cyan

# 1. Install Dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to install dependencies."
}

# 2. Build Project
Write-Host "`n🔨 Building project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed."
}

# 3. Verify Build
if (Test-Path "dist\index.html") {
    Write-Host "`n✅ Build Successful!" -ForegroundColor Green
    Write-Host "The 'dist' folder is ready for deployment."
    
    # Optional: Preview
    Write-Host "`nTo preview the build, run: npm run preview" -ForegroundColor Gray
} else {
    Write-Error "Build failed: dist\index.html not found."
}
