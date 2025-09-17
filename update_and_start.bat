@echo off
TITLE My Study Hub - Server

:: =================================================================
:: STEP 1: UPDATE THE LECTURE DATA (data.json)
:: =================================================================
ECHO [STEP 1 of 2] Updating lecture data (data.json)...
python generate_json.py
ECHO.

:: =================================================================
:: STEP 2: START THE LOCAL WEB SERVER
:: =================================================================
ECHO [STEP 2 of 2] Starting the local web server...
ECHO.
ECHO Your website is running at: http://localhost:8000
ECHO (Press CTRL+C in this window to stop the server)
ECHO =================================================================
python -m http.server

pause