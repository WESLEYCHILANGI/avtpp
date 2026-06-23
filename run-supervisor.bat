@echo off
REM Self-restarting launcher for the AVTPP supervisor.
REM Keeps the supervisor alive across crashes; the supervisor in turn keeps
REM the backend + tunnel alive. Survives reboots via the Startup-folder shortcut.
cd /d "C:\Users\wesle\OneDrive\Desktop\Final Year Project\avtpp"
:loop
"C:\Program Files\nodejs\node.exe" supervisor.js
echo [%date% %time%] supervisor exited; restarting in 5s >> "logs\launcher.log"
timeout /t 5 /nobreak >nul
goto loop
