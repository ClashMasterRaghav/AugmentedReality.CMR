// Electron app screen component for AR
import * as THREE from "three";
import { scene } from "./ar_core.js";
import { selectScreen } from "./ar_screens.js";
import { enhancedCreateScreen, addDropShadow, animateScreenEntrance } from "./ar_default_screen.js";

// Create an Electron app screen
export function createElectronAppScreen(position = new THREE.Vector3(0, 0, -1.5), screenId) {
    // Screen dimensions
    const screenWidth = 1.0;
    const screenHeight = 0.75;
    const size = { x: screenWidth, y: screenHeight };
    const title = `Electron App ${screenId || ""}`;
    
    console.log("Creating Electron App screen");
    
    // Create Electron app texture
    const electronTexture = createElectronAppTexture();
    
    // Create the screen container
    const electronScreen = enhancedCreateScreen(
        position,
        size,
        title,
        electronTexture
    );
    
    // Add electron-specific identification data
    electronScreen.userData = { 
        type: "screen",
        id: screenId,
        isSelected: false,
        isInteractive: true,
        originalScale: new THREE.Vector3(1, 1, 1),
        contentType: "electron"
    };
    
    // Add shadow for depth
    addDropShadow(electronScreen, screenWidth, screenHeight);
    
    // Add Electron app-branded border
    const borderGeometry = new THREE.PlaneGeometry(
        screenWidth + 0.02,
        screenHeight + 0.02
    );
    const borderMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x2F3241, // Electron dark blue color
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
        depthTest: true
    });
    const borderPanel = new THREE.Mesh(borderGeometry, borderMaterial);
    borderPanel.position.z = -0.001;
    borderPanel.renderOrder = 990;
    electronScreen.add(borderPanel);
    
    // Set up drag handle
    const topBar = electronScreen.children.find(
        (child) => child.userData && child.userData.type === "dragHandle"
    );
    
    if (topBar) {
        topBar.userData.screen = electronScreen;
        electronScreen.userData.dragHandle = topBar;
    }
    
    // Add entrance animation
    animateScreenEntrance(electronScreen);
    
    console.log("Created Electron App screen with ID:", electronScreen.userData.id);
    
    return electronScreen;
}

// Create an Electron app texture simulating the app interface
function createElectronAppTexture() {
    // Use canvas to simulate Electron app
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');
    
    // Load Electron logo
    const logo = new Image();
    logo.src = 'examples/textures/ar_icons/electron_app.png';
    
    // Draw Electron app interface
    function drawElectronInterface() {
        // App background (dark theme)
        ctx.fillStyle = '#2F3241';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Title bar
        ctx.fillStyle = '#1F2232';
        ctx.fillRect(0, 0, canvas.width, 40);
        
        // Window controls
        // Close button
        ctx.fillStyle = '#FF5F57';
        ctx.beginPath();
        ctx.arc(20, 20, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Minimize button
        ctx.fillStyle = '#FFBD2E';
        ctx.beginPath();
        ctx.arc(40, 20, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Maximize button
        ctx.fillStyle = '#28CA42';
        ctx.beginPath();
        ctx.arc(60, 20, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // App title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Electron Demo App', canvas.width / 2, 20);
        
        // Sidebar
        ctx.fillStyle = '#252830';
        ctx.fillRect(0, 40, 200, canvas.height - 40);
        
        // Sidebar menu items
        const menuItems = ['Dashboard', 'Projects', 'Tasks', 'Calendar', 'Settings'];
        menuItems.forEach((item, index) => {
            const y = 80 + index * 40;
            
            // Selected item highlight
            if (index === 0) {
                ctx.fillStyle = 'rgba(74, 144, 226, 0.3)';
                ctx.fillRect(0, y - 10, 200, 40);
                ctx.fillStyle = '#4A90E2';
                ctx.fillRect(0, y - 10, 4, 40);
            }
            
            // Menu item text
            ctx.fillStyle = index === 0 ? '#FFFFFF' : '#A0A0A0';
            ctx.font = index === 0 ? 'bold 14px Arial' : '14px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(item, 30, y);
        });
        
        // Main content area
        
        // Dashboard title
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 22px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Dashboard', 220, 60);
        
        // Summary cards
        drawCard(220, 100, 250, 120, '#4A90E2', 'Projects', '12');
        drawCard(490, 100, 250, 120, '#50E3C2', 'Tasks', '36');
        drawCard(760, 100, 250, 120, '#F5A623', 'Completed', '24');
        
        // Recent activity section
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Recent Activity', 220, 240);
        
        // Activity list
        const activities = [
            { title: 'Updated Project: AR Interface', time: '10 minutes ago' },
            { title: 'Completed Task: Button Component', time: '2 hours ago' },
            { title: 'Created New Project: VR Experience', time: '1 day ago' },
            { title: 'Shared Project with Team', time: '2 days ago' },
            { title: 'Merged Pull Request #42', time: '3 days ago' }
        ];
        
        activities.forEach((activity, index) => {
            const y = 280 + index * 60;
            
            // Activity item background
            ctx.fillStyle = '#252830';
            ctx.fillRect(220, y, 790, 50);
            
            // Activity title
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '14px Arial';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(activity.title, 240, y + 10);
            
            // Activity time
            ctx.fillStyle = '#A0A0A0';
            ctx.font = '12px Arial';
            ctx.fillText(activity.time, 240, y + 30);
        });
        
        // Project progress section
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('Project Progress', 220, 600);
        
        // Progress bars
        drawProgressBar(220, 640, 'AR Interface', 75);
        drawProgressBar(220, 680, 'VR Experience', 30);
        drawProgressBar(220, 720, 'Mobile App', 90);
        
        // Draw Electron logo in top-right if available
        if (logo.complete) {
            const logoSize = 120;
            ctx.drawImage(
                logo, 
                canvas.width - logoSize - 20, 
                canvas.height - logoSize - 20,
                logoSize, 
                logoSize
            );
        } else {
            // Placeholder Electron logo
            ctx.fillStyle = '#9FEAF9';
            ctx.beginPath();
            ctx.arc(canvas.width - 80, canvas.height - 80, 40, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#2F3241';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('E', canvas.width - 80, canvas.height - 80);
        }
    }
    
    // Helper function to draw a summary card
    function drawCard(x, y, width, height, color, title, value) {
        // Card background
        ctx.fillStyle = '#252830';
        ctx.fillRect(x, y, width, height);
        
        // Color indicator
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 5, height);
        
        // Title
        ctx.fillStyle = '#A0A0A0';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(title, x + 20, y + 20);
        
        // Value
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px Arial';
        ctx.fillText(value, x + 20, y + 50);
    }
    
    // Helper function to draw a progress bar
    function drawProgressBar(x, y, label, progress) {
        // Label
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(label, x, y);
        
        // Progress text
        ctx.fillStyle = '#A0A0A0';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${progress}%`, x + 790, y);
        
        // Progress bar background
        ctx.fillStyle = '#252830';
        ctx.fillRect(x, y + 25, 790, 10);
        
        // Progress indicator
        let barColor;
        if (progress < 40) barColor = '#F5A623'; // Yellow
        else if (progress < 70) barColor = '#4A90E2'; // Blue
        else barColor = '#50E3C2'; // Green
        
        ctx.fillStyle = barColor;
        ctx.fillRect(x, y + 25, 790 * (progress / 100), 10);
    }
    
    // Draw initial app interface
    drawElectronInterface();
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    
    // Add metadata and methods
    texture.userData = {
        isElectronApp: true,
        canvas: canvas,
        ctx: ctx,
        updateDashboard: function() {
            // This function could be used to update the dashboard data
            // For demonstration we'll just redraw the interface
            drawElectronInterface();
            texture.needsUpdate = true;
        }
    };
    
    return texture;
} 