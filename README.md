# AR Control Management and Rendering (CMR)

An advanced Augmented Reality application built with Three.js that enables interactive control and management of AR screens in 3D space.

## Features

- **Dynamic Screen Management**
  - Create and position multiple AR screens in 3D space
  - Intuitive drag-and-drop screen positioning
  - Delete unwanted screens with a single click
  - Automatic screen orientation facing the user

- **Modern Control Panel**
  - Sleek, minimalist design with Material Design influences
  - Draggable interface for optimal positioning
  - High-contrast buttons with visual feedback
  - Fully opaque panel to prevent interference with background content

- **Video Playback Controls**
  - Play/Pause functionality
  - Mute/Unmute audio
  - Seamless video texture mapping
  - Automatic video state management

- **Interactive Features**
  - Touch and controller-based interaction
  - Haptic feedback for enhanced user experience
  - Visual indicators for all interactions
  - Double-tap screen resizing

- **Advanced Rendering**
  - High-performance 3D rendering with Three.js
  - Optimized raycasting for precise interactions
  - Smooth animations and transitions
  - Proper depth and render order management

## Requirements

- Modern web browser with WebXR support
- AR-capable device (Android with ARCore or iOS with ARKit)
- Node.js (for development)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ClashMasterRaghav/AugmentedReality.CMR.git
cd AugmentedReality.CMR
```

2. Install dependencies:
```bash
npm install three
```

3. Start a local development server (e.g., using Python):
```bash
python -m http.server 8000
```

## Usage

1. Open the application on an AR-capable device
2. Grant necessary permissions for camera and motion sensors
3. Use the control panel to:
   - Create new screens with the "+" button
   - Delete screens with the trash button
   - Drag screens to position them in space
   - Interact with video controls on each screen

## Technical Details

### Core Components

- `ar_core.js`: Core AR functionality and scene management
- `ar_ui.js`: User interface elements and control panel
- `ar_interaction.js`: Event handling and user interaction logic
- `ar_media.js`: Video and audio management
- `ar_screens.js`: Screen creation and management
- `ar_utils.js`: Utility functions and helpers

### Key Technologies

- Three.js for 3D rendering
- WebXR for AR capabilities
- Custom raycasting system for precise interactions
- Canvas-based UI rendering for optimal performance

### Project Structure

```
ar-cmr/
├── examples/
│   ├── ar_core.js
│   ├── ar_ui.js
│   ├── ar_interaction.js
│   ├── ar_media.js
│   ├── ar_screens.js
│   ├── ar_utils.js
│   └── ar_web.html
├── build/
│   └── three.module.js
├── textures/
│   └── ar_videos/
└── README.md
```

## Features in Detail

### Screen Management
- Create multiple AR screens in your space
- Drag screens to any position
- Screens automatically face the user
- Double-tap to resize screens
- Delete screens with the trash button

### Control Panel
- Modern, minimalist design
- Fully draggable interface
- High-contrast buttons
- Opaque panel to prevent see-through issues
- Positioned below screens for easy access

### Video Controls
- Play/Pause video playback
- Mute/Unmute audio
- Video texture mapping on screens
- Automatic state management

### Interaction System
- Touch-based interaction
- Controller support
- Haptic feedback
- Visual feedback for all actions
- Precise raycasting for button interactions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Three.js team for the excellent 3D library
- WebXR community for AR capabilities
- Material Design for UI inspiration

## Contact

Your Name - [@yourtwitter](https://twitter.com/yourtwitter)
Project Link: [https://github.com/yourusername/ar-cmr](https://github.com/yourusername/ar-cmr)
