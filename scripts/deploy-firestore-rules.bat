@echo off
echo Deploying Firestore rules to jewelbazaari...
firebase deploy --only firestore:rules --project jewelbazaari
if errorlevel 1 (
  echo.
  echo Deploy failed. Run: firebase login
  echo Then run this script again.
  pause
  exit /b 1
)
echo Firestore rules deployed successfully.
pause