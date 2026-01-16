/**
 * RoleOut - Main Entry Point
 *
 * A SillyTavern extension to export characters, chats, presets, and lorebooks
 * for import into RoleCall web app.
 *
 * Architecture:
 * - data-providers.js: Data access layer
 * - ui-controller.js: View layer
 * - event-handlers.js: Controller layer
 * - settings-manager.js: Configuration management
 */

import { renderExtensionTemplateAsync } from '../../../extensions.js';
import { initializeSettings, loadSettings } from './settings-manager.js';
import { bindEventHandlers } from './event-handlers.js';
import { updateStatusCounts } from './ui-controller.js';

const extensionName = 'RoleOut';
const extensionFolderPath = `third-party/${extensionName}`;

/**
 * Initialize the extension
 */
async function init() {
    try {
        console.log('[RoleOut] Starting initialization...');

        // Initialize settings first
        initializeSettings();

        // Load and render the settings template
        const settingsHtml = $(await renderExtensionTemplateAsync(extensionFolderPath, 'settings'));

        // Find the extensions settings container
        const extensionsSettings = document.getElementById('extensions_settings2');
        if (!extensionsSettings) {
            throw new Error('Extensions settings container not found');
        }

        // Append our settings panel
        extensionsSettings.appendChild(settingsHtml[0]);

        // Load settings into UI
        loadSettings();

        // Bind all event handlers
        bindEventHandlers();

        // Update counts on initialization
        updateStatusCounts();

        // Also update counts after a delay to catch late-loading data
        setTimeout(() => {
            console.log('[RoleOut] Delayed count update');
            updateStatusCounts();
        }, 1000);

        // Another delayed update for slower-loading data (like OpenAI presets)
        setTimeout(() => {
            console.log('[RoleOut] Second delayed count update');
            updateStatusCounts();
        }, 3000);

        console.log('[RoleOut] Extension initialized successfully');
        toastr.success('RoleOut loaded', 'Extension Ready');
    } catch (error) {
        console.error('[RoleOut] Failed to initialize:', error);
        console.error('[RoleOut] Error stack:', error.stack);
        toastr.error(`Failed to load RoleOut: ${error.message}`, 'Extension Error');
    }
}

// Run initialization
init();
