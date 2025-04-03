# AR Web Screens

An augmented reality application that allows users to create and interact with web content screens in AR using WebXR.

## Features

- Create virtual web browser screens in AR
- View YouTube videos in augmented reality
- Browse maps and search engines in your physical space
- Interactive controls (drag, rotate, scale screens)
- Support for touch interactions and XR controllers
- Visual feedback and animations for intuitive user experience

## Requirements

- A WebXR-compatible device (AR-capable smartphone or headset)
- A modern browser with WebXR support (Chrome 79+ on Android)
- For the best experience, an AR-capable device with:
  - Accelerometer, gyroscope
  - Touch screen
  - Camera access

## Technology Stack

- Three.js for 3D rendering
- WebXR for augmented reality capabilities
- CSS3DRenderer for web content in 3D space
- JavaScript modules for modular code organization

## Project Structure

```
ar-web-screens/
├── index.html         # Main entry point
├── package.json       # Dependencies
├── src/               # Source code
│   ├── app.js         # Main application
│   └── core/          # Core modules
│       ├── ar_screens.js     # Screen creation and management
│       ├── ar_interaction.js # User interaction handling
│       ├── ar_scene.js       # Scene setup and management
│       ├── ar_ui.js          # User interface elements
│       ├── ar_media.js       # Media handling (video, audio)
│       ├── ar_utils.js       # Utility functions
│       ├── ar_audio.js       # Audio system
│       └── ar_environment.js # Environment setup
```

## Getting Started

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/ar-web-screens.git
   cd ar-web-screens
```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open the provided URL on your AR-capable device.

5. Grant camera permissions when prompted.

6. Tap "Start AR" to begin the augmented reality experience.

## Usage

- **Creating Screens**: Tap the "+" button to create a new screen
- **Moving Screens**: Drag the top bar of any screen to move it
- **Rotating Screens**: Use the rotate gesture (two fingers) on the screen
- **Closing Screens**: Tap the "X" button in the top-right corner of any screen

## Development Notes

- The app uses the device camera for AR tracking
- Test on actual AR-capable devices for the best experience
- For desktop testing, the app will fall back to a non-AR mode
- When contributing, maintain the modular structure of the codebase

## License

MIT
