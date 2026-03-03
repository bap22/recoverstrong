# RecoverStrong - Workout Tracker PWA

A minimalist daily workout tracker designed for patellar tendon recovery and general health. No weights required, 30-minute daily routine.

## Features

- **Daily Workout Tracking**: Mark completion, track streaks, weekly consistency
- **Patellar-Safe Exercises**: Quad-building routine without weights
- **Weight Tracking**: Log weight with history chart
- **30-Minute Timer**: Built-in workout timer
- **PWA Installable**: Works offline, install to home screen
- **Daily Reminders**: Set custom reminder times
- **Minimalist Design**: Clean, modern interface

## Exercises Included

### Warm-up (5 min)
- Neck Circles, Arm Swings, Leg Swings, March in Place

### Quad Building (15 min)
- Wall Sits, Straight Leg Raises, Mini Squats, Step-ups

### Upper Body & Cardio (5 min)
- Push-ups (knee/wall modifications)
- Standing Jumps (consult PT first)

### Core & Fat Loss (5 min)
- Planks, Bird-Dogs, Bicycle Crunches

### Cool-down (5 min)
- Quad/Hamstring Stretches, Deep Breathing

## Installation on iPhone

1. **Open in Safari**: Navigate to the app URL
2. **Tap Share Button**: The share icon at the bottom of Safari
3. **Scroll Down**: Find "Add to Home Screen"
4. **Name & Add**: Name it "RecoverStrong" and tap Add
5. **Launch**: Open from your home screen like a native app

## Local Development

Serve the app locally:
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000` in your browser.

## Data Storage

All data is stored locally in your browser using LocalStorage. No data leaves your device.

## Safety Notice

This app is designed for patellar tendon recovery but is not medical advice. Always consult with your physical therapist before starting any exercise program, especially for the standing jumps and any exercise that causes pain.

## Technologies

- HTML5, CSS3, JavaScript (ES6)
- PWA: Service Workers, Web App Manifest
- LocalStorage for data persistence