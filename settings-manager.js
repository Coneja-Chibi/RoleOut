/**
 * Settings Manager - Handles loading and saving extension settings
 * Separated concern: Configuration management
 */

import { extension_settings } from '../../../extensions.js';

const extensionName = 'RoleOut';

// Default settings (empty - all options are now per-item)
const defaultSettings = {};

/**
 * Initialize extension settings
 */
export function initializeSettings() {
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = {};
    }

    // Merge with defaults
    extension_settings[extensionName] = {
        ...defaultSettings,
        ...extension_settings[extensionName]
    };

    console.log('[RoleOut] Settings initialized:', extension_settings[extensionName]);
}

/**
 * Load settings into UI
 */
export function loadSettings() {
    // No global settings to load - all options are now per-item
    console.log('[RoleOut] Settings initialized (no global options)');
}
