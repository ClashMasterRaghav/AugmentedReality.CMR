import { create } from 'zustand';
import { Vector3 } from 'three';

// Generate a unique ID for each screen
const generateId = () => `screen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/**
 * Store for managing screens in AR
 */
export const useScreenStore = create((set, get) => ({
  // Array of screen objects
  screens: [],
  
  // ID of the currently selected screen
  selectedScreenId: null,
  
  // Add a new screen
  addScreen: (type, position = [0, 0, -1.5]) => {
    // Create screen object
    const newScreen = {
      id: generateId(),
      type,
      position: position instanceof Vector3 ? [position.x, position.y, position.z] : position,
      createdAt: Date.now()
    };
    
    console.log(`Adding screen: ${type} at position:`, position);
    
    // Add to screens array
    set(state => ({ 
      screens: [...state.screens, newScreen],
      selectedScreenId: newScreen.id // Automatically select new screen
    }));
    
    return newScreen.id;
  },
  
  // Remove a screen by ID
  removeScreen: (id) => {
    console.log(`Removing screen: ${id}`);
    
    set(state => {
      const updatedScreens = state.screens.filter(screen => screen.id !== id);
      
      // Update selected screen if needed
      let newSelectedId = state.selectedScreenId;
      
      if (state.selectedScreenId === id) {
        // If the removed screen was selected, select another screen or null
        newSelectedId = updatedScreens.length > 0 ? updatedScreens[0].id : null;
      }
      
      return { 
        screens: updatedScreens,
        selectedScreenId: newSelectedId
      };
    });
  },
  
  // Update position of a screen
  updateScreenPosition: (id, position) => {
    set(state => ({
      screens: state.screens.map(screen => 
        screen.id === id 
          ? { ...screen, position } 
          : screen
      )
    }));
  },
  
  // Set the selected screen
  setSelectedScreenId: (id) => {
    set({ selectedScreenId: id });
  },
  
  // Get a screen by ID
  getScreenById: (id) => {
    return get().screens.find(screen => screen.id === id);
  },
  
  // Clear all screens
  clearScreens: () => {
    console.log('Clearing all screens');
    set({ screens: [], selectedScreenId: null });
  }
})); 