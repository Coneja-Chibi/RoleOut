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
    exportCharactersAsZip,
    exportSingleChat,
    exportChatsAsZip,
    exportSinglePersona,
    exportPersonasAsZip
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
    $('#rolecall-panel-personas').on('click', () => toggleOptionsCard('personas'));
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

    // List item click handlers (expand/collapse or checkbox toggle)
    $(document).on('click', '.rolecall-list-item', function(e) {
        // Don't expand if clicking checkbox directly
        if ($(e.target).hasClass('rolecall-select-checkbox') || $(e.target).closest('.rolecall-item-checkbox').length) {
            return;
        }

        const itemWrapper = $(this).closest('.rolecall-item-wrapper');
        const listContainer = itemWrapper.closest('.rolecall-item-list');

        // In multi-select mode, clicking the item toggles the checkbox
        if (listContainer.hasClass('multi-select-mode')) {
            const checkbox = itemWrapper.find('.rolecall-select-checkbox');
            const isChecked = checkbox.prop('checked');

            // Toggle checkbox state
            checkbox.prop('checked', !isChecked);

            // Trigger change event to update visual state and export button
            checkbox.trigger('change');
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

    // Bundle checkbox handler - show/hide preset dropdown
    $(document).on('change', 'input[id^="chat_bundle_"]', function() {
        const itemId = $(this).attr('id').replace('chat_bundle_', '');
        const presetSelector = $(`#preset_selector_${itemId}`);
        const lorebookSelector = $(`#lorebook_selector_${itemId}`);

        if ($(this).prop('checked')) {
            presetSelector.slideDown(200);
            lorebookSelector.slideDown(200);
        } else {
            presetSelector.slideUp(200);
            lorebookSelector.slideUp(200);
        }
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
    // Update counts when character list changes
    $(document).on('characterSelected', updateStatusCounts);
    $(document).on('chatLoaded', updateStatusCounts);

    // Update counts when characters are initially loaded
    import('../../../extensions.js').then(({ eventSource, event_types }) => {
        if (eventSource && event_types) {
            eventSource.on(event_types.CHARACTER_PAGE_LOADED, () => {
                console.log('[RoleOut] Characters loaded, updating counts');
                updateStatusCounts();
            });
        }
    }).catch(err => {
        console.warn('[RoleOut] Could not bind to CHARACTER_PAGE_LOADED event:', err);
    });
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

    // For chats, also capture the selected preset and lorebooks
    if (type === 'chats') {
        const presetSelect = optionsPanel.find('select[id^="chat_preset_"]');
        if (presetSelect.length) {
            options.selectedPreset = presetSelect.val();
        }

        // Capture selected lorebooks (up to 10)
        const selectedLorebooks = [];
        optionsPanel.find('input[name^="chat_lorebook_"]:checked').each(function() {
            selectedLorebooks.push($(this).val());
        });
        options.selectedLorebooks = selectedLorebooks;
    }

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

    if (type === 'characters') {
        // Default format is JSON (RoleCall-compatible)
        const format = 'json';
        await exportSingleCharacter(id, format);
    } else if (type === 'chats') {
        // Get the chat data from the data provider
        const { getChatList } = await import('./data-providers.js');
        const chats = await getChatList();
        const chat = chats.find(c => c.id === id);

        if (!chat) {
            toastr.error('Chat not found', 'RoleOut');
            return;
        }

        // Map checkbox options to export options
        const exportOptions = {
            includeCharacter: options[`chat_character_${id}`] !== false,
            exportBundle: options[`chat_bundle_${id}`] || false,
            selectedPreset: options.selectedPreset || null,
            selectedLorebooks: options.selectedLorebooks || []
        };

        await exportSingleChat(chat, exportOptions);
    } else if (type === 'personas') {
        await exportSinglePersona(id);
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

    if (type === 'characters') {
        // Default format is JSON (RoleCall-compatible)
        const format = 'json';
        await exportCharactersAsZip(ids, format);
    } else if (type === 'chats') {
        // Get chat data and their individual options
        const { getChatList } = await import('./data-providers.js');
        const allChats = await getChatList();

        const chatExports = ids.map(id => {
            const chat = allChats.find(c => c.id === id);
            if (!chat) return null;

            // Get checkbox states for this specific chat
            const includeCharacterCheckbox = $(`#chat_character_${id}`);
            const includeCharacter = includeCharacterCheckbox.length ? includeCharacterCheckbox.prop('checked') : true;

            const exportBundleCheckbox = $(`#chat_bundle_${id}`);
            const exportBundle = exportBundleCheckbox.length ? exportBundleCheckbox.prop('checked') : false;

            return {
                chat,
                includeCharacter,
                exportBundle
            };
        }).filter(Boolean); // Remove nulls

        if (chatExports.length === 0) {
            toastr.error('No valid chats found to export', 'RoleOut');
            return;
        }

        await exportChatsAsZip(chatExports);
    } else if (type === 'personas') {
        await exportPersonasAsZip(ids);
    } else {
        toastr.info(`Batch export of ${ids.length} ${type} will be implemented soon!`, 'RoleOut');
    }
}
