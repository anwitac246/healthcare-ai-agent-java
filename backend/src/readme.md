
run this in the terminal once per session to load the .env file in th root of your project folder.
Spring boot does not automatically load the .env file


```
Get-Content ..\.env | ForEach-Object {
  if ($_ -match "^(.*?)=(.*)$") {
    [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
  }
}

```