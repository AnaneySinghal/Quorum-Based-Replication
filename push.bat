@echo off
git add .
set /p msg=What did you change? 
git commit -m "%msg%"
git push origin main
echo.
echo Done! Code is now on GitHub!
pause