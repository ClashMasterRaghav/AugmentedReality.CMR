// Wrapper module to re-export UI functions
import * as AR_UI from './ar_ui.js';

// Re-export the necessary functions
export const createButton = AR_UI.createButton;
export const createControlPanel = AR_UI.createControlPanel;
export const updateControlPanel = AR_UI.updateControlPanel;

// Export the module itself in case we need all functions
export default AR_UI; 