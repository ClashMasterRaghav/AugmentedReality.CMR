import { create } from 'zustand';
import { Vector3 } from 'three';

export const useScreenStore = create((set, get) => ({
  screens: [],
  selectedScreenId: null,
  
  // Add a new screen of specified type
  addScreen: (type, position = [0, 0, -1.5]) => {
    const newScreen = {
      id: Date.now().toString(),
      type,
      position: position instanceof Vector3 ? position.toArray() : position,
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      isSelected: false,
      createdAt: Date.now()
    };
    
    // Deselect any selected screen
    const updatedScreens = get().screens.map(screen => ({
      ...screen,
      isSelected: false
    }));
    
    set({
      screens: [...updatedScreens, { ...newScreen, isSelected: true }],
      selectedScreenId: newScreen.id
    });
    
    return newScreen.id;
  },
  
  // Select a screen by ID
  selectScreen: (id) => {
    set(state => ({
      screens: state.screens.map(screen => ({
        ...screen,
        isSelected: screen.id === id
      })),
      selectedScreenId: id
    }));
  },
  
  // Update screen position
  updateScreenPosition: (id, position) => {
    set(state => ({
      screens: state.screens.map(screen => 
        screen.id === id 
          ? { ...screen, position: position instanceof Vector3 ? position.toArray() : position } 
          : screen
      )
    }));
  },
  
  // Update screen rotation
  updateScreenRotation: (id, rotation) => {
    set(state => ({
      screens: state.screens.map(screen => 
        screen.id === id 
          ? { ...screen, rotation } 
          : screen
      )
    }));
  },
  
  // Update screen scale
  updateScreenScale: (id, scale) => {
    set(state => ({
      screens: state.screens.map(screen => 
        screen.id === id 
          ? { ...screen, scale } 
          : screen
      )
    }));
  },
  
  // Remove a screen by ID
  removeScreen: (id) => {
    const { screens, selectedScreenId } = get();
    const newScreens = screens.filter(screen => screen.id !== id);
    
    // If deleted the selected screen, select another one if available
    const newSelectedId = id === selectedScreenId
      ? newScreens.length > 0 ? newScreens[newScreens.length - 1].id : null
      : selectedScreenId;
    
    set({
      screens: newScreens,
      selectedScreenId: newSelectedId
    });
    
    // If we have a new selected screen, mark it as selected
    if (newSelectedId) {
      set(state => ({
        screens: state.screens.map(screen => ({
          ...screen,
          isSelected: screen.id === newSelectedId
        }))
      }));
    }
  },
  
  // Remove all screens
  clearScreens: () => {
    set({
      screens: [],
      selectedScreenId: null
    });
  },
  
  // Get selected screen
  getSelectedScreen: () => {
    const { screens, selectedScreenId } = get();
    return screens.find(screen => screen.id === selectedScreenId) || null;
  }
})); 