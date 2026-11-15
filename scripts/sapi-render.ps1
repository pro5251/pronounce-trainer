# Renders IPA strings to WAV with the Windows speech engine.
# Input: a UTF-8 JSON file of [{ "ipa": "...", "out": "C:\\...\\x.wav" }, ...]
param([Parameter(Mandatory = $true)][string]$ListPath, [string]$Voice = 'Microsoft Zira Desktop')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$jobs = Get-Content -Raw -Encoding UTF8 $ListPath | ConvertFrom-Json
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice($Voice)
$s.Rate = -2
$fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$fail = 0
foreach ($j in $jobs) {
  $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><phoneme alphabet='ipa' ph='$($j.ipa)'>x</phoneme></speak>"
  try {
    $s.SetOutputToWaveFile($j.out, $fmt); $s.SpeakSsml($ssml); $s.SetOutputToNull()
  } catch {
    $s.SetOutputToNull(); if (Test-Path $j.out) { Remove-Item $j.out -Confirm:$false }
    Write-Output "FAIL $($j.ipa)"; $fail++
  }
}
Write-Output "rendered $($jobs.Count - $fail) / $($jobs.Count)"
if ($fail) { exit 1 }
