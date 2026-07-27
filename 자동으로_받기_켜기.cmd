@echo off
chcp 65001 >nul
setlocal

REM ============================================================================
REM  자동으로_받기_켜기.cmd — 한 번만 더블클릭하면, 그 뒤로는 아무것도 안 해도 된다.
REM
REM  하는 일: 윈도우 «작업 스케줄러»에 HEALO 동기화 작업을 등록한다.
REM           · 컴퓨터에 로그인할 때
REM           · 그리고 3시간마다
REM           자동으로 `npm run sync` 가 조용히(창 없이) 돌아 최신 파일을 받아둔다.
REM
REM  기록: 이 폴더의 sync-auto.log 에 실행 결과가 쌓인다(문제 생기면 이 파일을 보여줄 것).
REM  끄기: 같은 폴더의 «자동으로_받기_끄기.cmd» 를 더블클릭.
REM
REM  안전: 등록되는 건 sync 하나뿐이고, sync 는 본판(main)에서 «내려받기만» 한다.
REM        저장 안 된 남의 변경이 있으면 손대지 않고 멈춘다. 자동으로 뭘 올리지 않는다.
REM ============================================================================

set TASKNAME=HEALO 자동 동기화
set FOLDER=%~dp0
if "%FOLDER:~-1%"=="\" set FOLDER=%FOLDER:~0,-1%

echo.
echo  ============================================
echo   자동으로 받기 - 켜기
echo  ============================================
echo   대상 폴더: %FOLDER%
echo.

where schtasks >nul 2>nul
if errorlevel 1 (
  echo  [실패] 이 윈도우에서는 작업 스케줄러를 쓸 수 없습니다.
  echo         대신 «동기화.cmd» 를 그때그때 더블클릭해 주세요.
  echo.
  pause
  exit /b 1
)

set RUNCMD=cmd /c cd /d "%FOLDER%" ^&^& npm run sync ^>^> "%FOLDER%\sync-auto.log" 2^>^&1

schtasks /create /tn "%TASKNAME%" /tr "%RUNCMD%" /sc onlogon /rl limited /f >nul 2>nul
if errorlevel 1 goto failed

schtasks /create /tn "%TASKNAME% (3시간마다)" /tr "%RUNCMD%" /sc hourly /mo 3 /rl limited /f >nul 2>nul

echo  [완료] 자동으로 받기를 켰습니다.
echo.
echo    - 로그인할 때마다 자동으로 최신 파일을 받습니다.
echo    - 켜져 있는 동안에는 3시간마다 한 번 더 받습니다.
echo    - 창은 뜨지 않습니다. 기록은 sync-auto.log 에 쌓입니다.
echo.
echo    지금 한 번 바로 받으려면 «동기화.cmd» 를 더블클릭하세요.
echo    끄고 싶으면 «자동으로_받기_끄기.cmd» 를 더블클릭하세요.
echo.
pause
exit /b 0

:failed
echo  [실패] 작업 등록에 실패했습니다.
echo         이 파일을 «마우스 오른쪽 클릭 - 관리자 권한으로 실행» 해 보시고,
echo         그래도 안 되면 이 화면을 그대로 클로드에게 보여주세요.
echo.
pause
exit /b 1
