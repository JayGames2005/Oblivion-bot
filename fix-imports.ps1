$files = Get-ChildItem -Path "src" -Filter "*.ts" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    # Fix ModCase imports
    $content = $content -replace "import \{ ModCase \} from '\.\./models/ModCase'.*;", "import { ModCaseModel } from '../models/ModCase';"
    
    # Fix Warning imports
    $content = $content -replace "import \{ Warning \} from '\.\./models/Warning'.*;", "import { WarningModel } from '../models/Warning';"
    
    # Fix Mute imports  
    $content = $content -replace "import \{ Mute \} from '\.\./models/Mute'.*;", "import { MuteModel } from '../models/Mute';"
    
    # Replace usage in code
    $content = $content -replace "ModCase\.([a-zA-Z]+)", "ModCaseModel.`$1"
    $content = $content -replace "Warning\.([a-zA-Z]+)", "WarningModel.`$1"
    $content = $content -replace "Mute\.([a-zA-Z]+)", "MuteModel.`$1"
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}

Write-Host "✅ Fixed all model imports!"
