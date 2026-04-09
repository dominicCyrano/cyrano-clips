@echo off
title Cyrano Clips Launcher
echo.
echo  ================================================
echo   Cyrano Clips - AI Video Editor
echo  ================================================
echo.

:: Check for Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js is not installed. Install it from https://nodejs.org
    pause
    exit /b 1
)

:: Check for Claude Code
where claude >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Claude Code CLI not found. Install it first:
    echo          npm install -g @anthropic-ai/claude-code
    echo          Then run: claude login
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo  Installing dependencies...
    call npm install
    echo.
)
if not exist "backend\node_modules" (
    echo  Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo.
)
if not exist "frontend\node_modules" (
    echo  Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo.
)

echo  Starting backend server...
start "Cyrano Backend" /min cmd /c "cd /d %~dp0backend && npx tsx src/index.ts"

echo  Starting frontend server...
start "Cyrano Frontend" /min cmd /c "cd /d %~dp0frontend && npx vite"

echo.
echo  Waiting for servers to start...
timeout /t 5 /nobreak >nul

echo  Opening Cyrano Clips in your browser...
start http://localhost:5173

echo.
echo  ================================================
echo   Cyrano Clips is running!
echo.
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo.
echo   Press any key to SHUT DOWN everything.
echo  ================================================
echo.
pause >nul

echo.
echo  Shutting down...
taskkill /fi "WINDOWTITLE eq Cyrano Backend" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq Cyrano Frontend" /f >nul 2>&1
:: Kill any remaining node processes on our ports
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /pid %%a /f >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /pid %%a /f >nul 2>&1
echo  All servers stopped. Goodbye!
timeout /t 2 /nobreak >nul
