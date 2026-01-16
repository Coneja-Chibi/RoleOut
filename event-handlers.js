/**
 * Event Handlers - Manages all user interactions
 * Separated concern: Controller layer
 */

import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';
import {
    updateStatusCounts,
    toggleOptionsCard,
    toggleMultiSelectMode,
    toggleItemExpand,
    getSelectedItems,
    updateExportSelectedButton
} from './ui-controller.js';
import {
    exportSingleCharacter,
    exportCharactersAsZip
} from './export-manager.js';

const extensionName = 'RoleOut';

/**
 * Bind all event handlers
 */
export function bindEventHandlers() {
    bindStatusPanelHandlers();
    bindOptionsCardHandlers();
    bindSettingsHandlers();
    bindExportHandlers();
    bindGlobalEvents();
}

/**
 * Bind status panel click handlers
 */
function bindStatusPanelHandlers() {
    $('#rolecall-panel-characters').on('click', () => toggleOptionsCard('characters'));
    $('#rolecall-panel-chats').on('click', () => toggleOptionsCard('chats'));
    $('#rolecall-panel-presets').on('click', () => toggleOptionsCard('presets'));
    $('#rolecall-panel-lorebooks').on('click', () => toggleOptionsCard('lorebooks'));
}

/**
 * Bind options card handlers
 */
function bindOptionsCardHandlers() {
    $('.rolecall-close-options').on('click', function() {
        const target = $(this).data('target');
        $(`#rolecall-options-${target}`).slideUp(300);
    });

    // Multi-select toggle buttons
    $(document).on('click', '.rolecall-multi-select-btn', function() {
        const type = $(this).attr('data-type');
        toggleMultiSelectMode(type);
    });

    // List item click handlers (expand/collapse)
    $(document).on('click', '.rolecall-list-item', function(e) {
        // Don't expand if clicking checkbox
        if ($(e.target).hasClass('rolecall-select-checkbox') || $(e.target).closest('.rolecall-item-checkbox').length) {
            return;
        }

        const itemWrapper = $(this).closest('.rolecall-item-wrapper');
        const listContainer = itemWrapper.closest('.rolecall-item-list');

        // In multi-select mode, clicking the item shouldn't expand
        if (listContainer.hasClass('multi-select-mode')) {
            return;
        }

        toggleItemExpand(itemWrapper);
    });

    // Checkbox change handlers
    $(document).on('change', '.rolecall-select-checkbox', function() {
        const itemWrapper = $(this).closest('.rolecall-item-wrapper');
        const type = itemWrapper.attr('data-type');

        if ($(this).prop('checked')) {
            itemWrapper.addClass('selected');
        } else {
            itemWrapper.removeClass('selected');
        }

        updateExportSelectedButton(type);
    });

    // Export single item button
    $(document).on('click', '.rolecall-export-single', function() {
        const type = $(this).attr('data-type');
        const id = parseInt($(this).attr('data-id'));
        const itemWrapper = $(this).closest('.rolecall-item-wrapper');

        // Get checked options for this item
        const options = getItemExportOptions(itemWrapper, type);

        exportSingleItem(type, id, options);
    });

    // Export selected items button
    $(document).on('click', '.rolecall-export-selected-btn', function() {
        const type = $(this).attr('data-type');
        const selectedIds = getSelectedItems(type);

        if (selectedIds.length > 0) {
            exportSelectedItems(type, selectedIds);
        }
    });
}

/**
 * Bind settings change handlers
 */
function bindSettingsHandlers() {
    // No global settings to bind - all options are now per-item
}

/**
 * Bind export button handlers
 */
function bindExportHandlers() {
    // All export functionality now handled through:
    // - Per-item expand panels (handled in bindOptionsCardHandlers)
    // - Multi-select batch export (handled in bindOptionsCardHandlers)
}

/**
 * Bind global event listeners
 */
function bindGlobalEvents() {
    $(document).on('characterSelected', updateStatusCounts);
    $(document).on('chatLoaded', updateStatusCounts);
}


/**
 * Get export options for a specific item
 * @param {jQuery} itemWrapper - Item wrapper element
 * @param {string} type - Content type
 * @returns {Object} Export options
 */
function getItemExportOptions(itemWrapper, type) {
    const options = {};
    const optionsPanel = itemWrapper.find('.rolecall-item-options');

    optionsPanel.find('input[type="checkbox"]').each(function() {
        const id = $(this).attr('id');
        const checked = $(this).prop('checked');
        options[id] = checked;
    });

    return options;
}

/**
 * Export single item
 * @param {string} type - Content type
 * @param {number} id - Item ID
 * @param {Object} options - Export options
 */
async function exportSingleItem(type, id, options = {}) {
    console.log(`[RoleOut] Exporting ${type} item:`, id, 'with options:', options);

    // For now, only characters are implemented
    if (type === 'characters') {
        // Default format is JSON (RoleCall-compatible)
        const format = 'json';
        await exportSingleCharacter(id, format);
    } else {
        toastr.info(`Exporting ${type} will be implemented soon!`, 'RoleOut');
    }
}

/**
 * Export selected items
 * @param {string} type - Content type
 * @param {number[]} ids - Array of item IDs
 */
async function exportSelectedItems(type, ids) {
    console.log(`[RoleOut] Exporting ${ids.length} ${type} items:`, ids);

    // For now, only characters are implemented
    if (type === 'characters') {
        // Default format is JSON (RoleCall-compatible)
        const format = 'json';
        await exportCharactersAsZip(ids, format);
    } else {
        toastr.info(`Batch export of ${ids.length} ${type} will be implemented soon!`, 'RoleOut');
    }
}
