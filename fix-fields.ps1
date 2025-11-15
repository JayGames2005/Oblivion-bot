$files = Get-ChildItem -Path "src" -Filter "*.ts" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Fix field names
    $content = $content -replace "guildId:", "guild_id:"
    $content = $content -replace "userId:", "user_id:"
    $content = $content -replace "moderatorId:", "moderator_id:"
    $content = $content -replace "caseId:", "case_id:"
    $content = $content -replace "expiresAt:", "expires_at:"
    $content = $content -replace "createdAt:", "created_at:"
    
    # Fix property access
    $content = $content -replace "\.createdAt", ".created_at"
    $content = $content -replace "\.moderatorId", ".moderator_id"
    $content = $content -replace "\.userId", ".user_id"
    $content = $content -replace "\.guildId", ".guild_id"
    $content = $content -replace "\.caseId", ".case_id"
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "✅ Fixed all field names!"
