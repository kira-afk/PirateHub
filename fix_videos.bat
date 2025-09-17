@echo off
TITLE Smart Video Optimizer

ECHO.
ECHO =================================================================
ECHO Checking for new or un-optimized videos...
ECHO This will be quick if most videos are already optimized.
ECHO =================================================================
ECHO.

FOR /R "lectures" %%i IN (*.mp4) DO (
    REM Check if a ".optimized" marker file already exists for this video.
    IF NOT EXIST "%%i.optimized" (
        ECHO [Processing] Optimizing "%%~nxi"...
        
        REM Run ffmpeg to create a temporary optimized video.
        ffmpeg -i "%%i" -c copy -movflags +faststart "%%~dpi_temp_%%~nxi" >nul 2>&1
        
        REM Check if the temp video was created successfully.
        IF EXIST "%%~dpi_temp_%%~nxi" (
            del "%%i"
            ren "%%~dpi_temp_%%~nxi" "%%~nxi"
            
            REM Create an empty marker file to mark this video as optimized.
            echo. > "%%i.optimized"
            ECHO [Success] "%%~nxi" is now optimized.
        ) ELSE (
            ECHO [Error] Failed to optimize "%%~nxi".
        )
    ) ELSE (
        REM If the marker file exists, just skip the video.
        ECHO [Skipping] "%%~nxi" is already optimized.
    )
)

ECHO.
ECHO =================================================================
ECHO All new videos have been optimized! You can close this window.
ECHO =================================================================
ECHO.
pause