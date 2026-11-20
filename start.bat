@echo off
cd /d "%~dp0"
echo Building dist\craftkit-ui.css ...
node build.mjs || goto :eof
start "" http://localhost:5173
node serve.mjs 5173
