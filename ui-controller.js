/**
 * UI Controller - Handles all UI updates and interactions
 * Separated concern: View layer
 */

import { getCharacterList, getChatList, getPresetList, getLorebookList, getPersonaList, getCounts } from './data-providers.js';

/**
 * Update status panel counts
 */
export async function updateStatusCounts() {
    try {
        const counts = await getCounts();

        console.log('[RoleOut] Updating counts:', counts);

        $('#rolecall-panel-characters .rolecall-status-value')
            .text(`${counts.characters} character${counts.characters !== 1 ? 's' : ''} detected`);

        $('#rolecall-panel-chats .rolecall-status-value')
            .text(`${counts.chats} chat${counts.chats !== 1 ? 's' : ''} detected`);

        $('#rolecall-panel-presets .rolecall-status-value')
            .text(`${counts.presets} preset${counts.presets !== 1 ? 's' : ''} detected`);

        $('#rolecall-panel-lorebooks .rolecall-status-value')
            .text(`${counts.lorebooks} lorebook${counts.lorebooks !== 1 ? 's' : ''} detected`);

        $('#rolecall-panel-personas .rolecall-status-value')
            .text(`${counts.personas} persona${counts.personas !== 1 ? 's' : ''} detected`);
    } catch (error) {
        console.error('[RoleOut] Error updating counts:', error);
    }
}

/**
 * Populate item list in options card
 * @param {string} type - Content type (characters, chats, presets, lorebooks, personas)
 */
export async function populateItemList(type) {
    const listContainer = $(`#rolecall-list-${type}`);
    if (!listContainer.length) {
        console.warn(`[RoleOut] List container not found for type: ${type}`);
        return;
    }

    listContainer.empty();

    try {
        let items = [];

        switch (type) {
            case 'characters':
                items = getCharacterList();
                break;
            case 'chats':
                items = await getChatList();
                break;
            case 'presets':
                items = getPresetList();
                break;
            case 'lorebooks':
                items = getLorebookList();
                break;
            case 'personas':
                items = getPersonaList();
                break;
            default:
                console.error(`[RoleOut] Unknown type: ${type}`);
                return;
        }

        if (items.length === 0) {
            listContainer.html('<div class="rolecall-empty-list">No items found</div>');
            return;
        }

        items.forEach(item => {
            const itemEl = createListItemElement(type, item);
            listContainer.append(itemEl);
        });
    } catch (error) {
        console.error(`[RoleOut] Error populating ${type} list:`, error);
        listContainer.html('<div class="rolecall-empty-list">Error loading items</div>');
    }
}

/**
 * Create a list item element
 * @param {string} type - Content type
 * @param {{id: number, name: string, avatar?: string, character?: string, lastMessage?: string, messageCount?: number, fileSize?: string}} item - Item data
 * @returns {jQuery} List item element
 */
function createListItemElement(type, item) {
    const itemWrapper = $('<div class="rolecall-item-wrapper"></div>');
    itemWrapper.attr('data-id', item.id);
    itemWrapper.attr('data-type', type);

    const itemEl = $('<div class="rolecall-list-item"></div>');

    // Checkbox for multi-select (hidden by default)
    const checkboxEl = $('<div class="rolecall-item-checkbox"></div>');
    const checkbox = $('<input type="checkbox" class="rolecall-select-checkbox">');
    checkbox.attr('data-id', item.id);
    checkboxEl.append(checkbox);
    checkboxEl.hide(); // Hidden unless in multi-select mode
    itemEl.append(checkboxEl);

    // For characters, add avatar thumbnail
    if (type === 'characters' && item.avatar) {
        const avatarEl = createAvatarElement(item);
        itemEl.append(avatarEl);

        const nameEl = $('<div class="rolecall-item-name"></div>');
        nameEl.text(item.name);
        itemEl.append(nameEl);
    } else if (type === 'chats' && item.character) {
        // For chats, show avatar, chat name, character name, stats, and last message

        // Add character avatar thumbnail if available
        if (item.avatar) {
            const avatarEl = $('<div class="rolecall-item-avatar"></div>');
            const imgEl = $('<img>');
            imgEl.attr('src', `/characters/${item.avatar}`);
            imgEl.attr('alt', item.character);
            imgEl.on('error', function() {
                $(this).attr('src', 'scripts/extensions/third-party/RoleOut/icons/user-circle.svg');
            });
            avatarEl.append(imgEl);
            itemEl.append(avatarEl);
        }

        const contentWrapper = $('<div class="rolecall-chat-content"></div>');

        const nameEl = $('<div class="rolecall-item-name"></div>');
        nameEl.text(item.name);
        contentWrapper.append(nameEl);

        const metaRow = $('<div class="rolecall-chat-meta-row"></div>');

        const characterEl = $('<span class="rolecall-item-meta"></span>');
        characterEl.text(item.character);
        metaRow.append(characterEl);

        if (item.messageCount !== undefined) {
            const messageCountEl = $('<span class="rolecall-chat-stat"></span>');
            messageCountEl.text(`${item.messageCount} msg${item.messageCount !== 1 ? 's' : ''}`);
            metaRow.append(messageCountEl);
        }

        if (item.fileSize) {
            const fileSizeEl = $('<span class="rolecall-chat-stat"></span>');
            fileSizeEl.text(item.fileSize);
            metaRow.append(fileSizeEl);
        }

        contentWrapper.append(metaRow);

        if (item.lastMessage) {
            const messageEl = $('<div class="rolecall-item-preview"></div>');
            // Truncate long messages (will show ~2 lines with CSS line-clamp)
            const preview = item.lastMessage.length > 150
                ? item.lastMessage.substring(0, 150) + '...'
                : item.lastMessage;
            messageEl.text(preview);
            contentWrapper.append(messageEl);
        }

        itemEl.append(contentWrapper);
    } else if (type === 'personas' && item.avatar) {
        // For personas, show avatar and name (similar to characters)
        const avatarEl = $('<div class="rolecall-item-avatar"></div>');
        const imgEl = $('<img>');
        imgEl.attr('src', `/User Avatars/${item.avatar}`);
        imgEl.attr('alt', item.name);
        imgEl.on('error', function() {
            $(this).attr('src', 'scripts/extensions/third-party/RoleOut/icons/user-circle.svg');
        });
        avatarEl.append(imgEl);
        itemEl.append(avatarEl);

        const nameEl = $('<div class="rolecall-item-name"></div>');
        nameEl.text(item.name);
        if (item.isDefault) {
            nameEl.append(' <span style="color: var(--rolecall-accent); font-size: 0.8em;">★ DEFAULT</span>');
        }
        itemEl.append(nameEl);
    } else {
        const nameEl = $('<div class="rolecall-item-name"></div>');
        nameEl.text(item.name);
        itemEl.append(nameEl);
    }

    // Expand indicator
    const expandIcon = $('<div class="rolecall-expand-icon"><i class="fa-solid fa-chevron-down"></i></div>');
    itemEl.append(expandIcon);

    itemWrapper.append(itemEl);

    // Create expandable options panel (same structure as global options)
    const optionsPanel = createItemOptionsPanel(type, item);
    itemWrapper.append(optionsPanel);

    return itemWrapper;
}

/**
 * Create avatar element for character
 * @param {{name: string, avatar: string}} item - Character data
 * @returns {jQuery} Avatar element
 */
function createAvatarElement(item) {
    const avatarEl = $('<div class="rolecall-item-avatar"></div>');
    const imgEl = $('<img>');
    imgEl.attr('src', `/characters/${item.avatar}`);
    imgEl.attr('alt', item.name);
    imgEl.on('error', function() {
        console.log('[RoleOut] Avatar failed to load:', `/characters/${item.avatar}`);
        $(this).attr('src', 'scripts/extensions/third-party/RoleOut/icons/user-circle.svg');
    });
    avatarEl.append(imgEl);
    return avatarEl;
}

/**
 * Create expandable options panel for a single item
 * @param {string} type - Content type
 * @param {Object} item - Item data with conditional properties
 * @returns {jQuery} Options panel element
 */
function createItemOptionsPanel(type, item) {
    const panel = $('<div class="rolecall-item-options"></div>');
    panel.attr('data-item-id', item.id);
    panel.hide(); // Hidden by default

    // Create checkboxes based on type
    const optionsGroup = $('<div class="rolecall-option-group"></div>');

    switch (type) {
        case 'characters':
            // Only show checkboxes for features that actually exist
            if (item.hasAvatar) {
                optionsGroup.append(createOptionCheckbox(`char_avatar_${item.id}`, 'Include Avatar', true));
            }
            if (item.hasAltGreetings) {
                optionsGroup.append(createOptionCheckbox(`char_greetings_${item.id}`, 'Alternate Greetings', true));
            }
            if (item.hasLorebook) {
                const lorebookLabel = `Attached Lorebook: ${item.lorebookName}`;
                optionsGroup.append(createOptionCheckbox(`char_lorebook_${item.id}`, lorebookLabel, true));
            }
            break;
        case 'chats':
            optionsGroup.append(createOptionCheckbox(`chat_character_${item.id}`, 'Include Character', true));
            break;
        case 'presets':
            optionsGroup.append(createOptionCheckbox(`preset_config_${item.id}`, 'Include Current Configuration (enabled/disabled prompts)', false));
            optionsGroup.append($('<div class="rolecall-no-options">Presets export with all prompts and settings</div>'));
            break;
        case 'lorebooks':
            // No options needed - lorebooks always export with all their entries
            optionsGroup.append($('<div class="rolecall-no-options">Lorebooks export with all entries</div>'));
            break;
        case 'personas':
            // No options needed - personas export as PNG with embedded metadata
            optionsGroup.append($('<div class="rolecall-no-options">Personas export as PNG with embedded metadata (like character cards)</div>'));
            break;
    }

    panel.append(optionsGroup);

    // Export button for this specific item
    const exportBtn = $('<button class="rolecall-export-btn rolecall-export-single"></button>');
    exportBtn.attr('data-type', type);
    exportBtn.attr('data-id', item.id);
    exportBtn.html('<img src="scripts/extensions/third-party/RoleOut/icons/download.svg" alt="" width="16" height="16"> Export This Item');
    panel.append(exportBtn);

    return panel;
}

/**
 * Create a checkbox option element
 * @param {string} id - Checkbox ID
 * @param {string} label - Label text
 * @param {boolean} checked - Default checked state
 * @returns {jQuery} Checkbox element
 */
function createOptionCheckbox(id, label, checked) {
    const checkboxWrapper = $('<label class="rolecall-checkbox"></label>');
    const checkbox = $('<input type="checkbox">');
    checkbox.attr('id', id);
    checkbox.prop('checked', checked);
    checkboxWrapper.append(checkbox);
    checkboxWrapper.append($('<span></span>').text(label));
    return checkboxWrapper;
}

/**
 * Setup search filter for item list
 * @param {string} type - Content type
 */
export function setupSearchFilter(type) {
    const searchInput = $(`#rolecall-search-${type}`);
    const listContainer = $(`#rolecall-list-${type}`);

    searchInput.off('input').on('input', function() {
        const searchTerm = $(this).val().toLowerCase().trim();
        const items = listContainer.find('.rolecall-item-wrapper');
        let visibleCount = 0;

        items.each(function() {
            const nameEl = $(this).find('.rolecall-item-name');
            const metaEl = $(this).find('.rolecall-item-meta');

            // Build searchable text from name and metadata
            let searchableText = '';
            if (nameEl.length > 0) {
                searchableText += nameEl.text().toLowerCase();
                // Include metadata (character name for chats)
                if (metaEl.length > 0) {
                    searchableText += ' ' + metaEl.text().toLowerCase();
                }
            } else {
                searchableText = $(this).text().toLowerCase();
            }

            if (searchableText.includes(searchTerm)) {
                $(this).show();
                visibleCount++;
            } else {
                $(this).hide();
            }
        });

        // Show/hide empty state message
        updateEmptyState(listContainer, visibleCount, items.length);
    });
}

/**
 * Update empty state message
 * @param {jQuery} container - List container
 * @param {number} visibleCount - Number of visible items
 * @param {number} totalCount - Total number of items
 */
function updateEmptyState(container, visibleCount, totalCount) {
    const emptyMessage = container.find('.rolecall-empty-list');

    if (visibleCount === 0 && totalCount > 0) {
        if (emptyMessage.length === 0) {
            container.append('<div class="rolecall-empty-list rolecall-search-empty">No matching items found</div>');
        } else {
            emptyMessage.show();
        }
    } else {
        emptyMessage.hide();
    }
}

/**
 * Toggle options card visibility
 * @param {string} type - Content type
 */
export async function toggleOptionsCard(type) {
    const targetCard = $(`#rolecall-options-${type}`);
    const isVisible = targetCard.is(':visible');

    // Hide all options cards
    $('.rolecall-options-card').slideUp(300);

    // If the clicked card wasn't visible, show it
    if (!isVisible) {
        // Clear search input
        $(`#rolecall-search-${type}`).val('');

        // Populate list and setup search
        await populateItemList(type);
        setupSearchFilter(type);

        targetCard.slideDown(300);
    }
}

/**
 * Toggle multi-select mode for a content type
 * @param {string} type - Content type
 */
export function toggleMultiSelectMode(type) {
    const listContainer = $(`#rolecall-list-${type}`);
    const toggleBtn = $(`#rolecall-multi-select-${type}`);
    const exportSelectedBtn = $(`#rolecall-export-selected-${type}`);
    const isMultiSelect = listContainer.hasClass('multi-select-mode');

    if (isMultiSelect) {
        // Exit multi-select mode
        listContainer.removeClass('multi-select-mode');
        toggleBtn.removeClass('active');
        exportSelectedBtn.hide();

        // Hide all checkboxes
        listContainer.find('.rolecall-item-checkbox').hide();

        // Uncheck all items
        listContainer.find('.rolecall-select-checkbox').prop('checked', false);
        listContainer.find('.rolecall-item-wrapper').removeClass('selected');
    } else {
        // Enter multi-select mode
        listContainer.addClass('multi-select-mode');
        toggleBtn.addClass('active');
        exportSelectedBtn.show();

        // Show all checkboxes
        listContainer.find('.rolecall-item-checkbox').show();

        // Collapse all expanded items
        listContainer.find('.rolecall-item-wrapper.expanded').each(function() {
            $(this).removeClass('expanded');
            $(this).find('.rolecall-item-options').slideUp(200);
            $(this).find('.rolecall-expand-icon i').removeClass('fa-chevron-up').addClass('fa-chevron-down');
        });
    }
}

/**
 * Toggle expand/collapse for a single item
 * @param {jQuery} itemWrapper - The item wrapper element
 */
export function toggleItemExpand(itemWrapper) {
    const isExpanded = itemWrapper.hasClass('expanded');
    const optionsPanel = itemWrapper.find('.rolecall-item-options');
    const expandIcon = itemWrapper.find('.rolecall-expand-icon i');

    if (isExpanded) {
        itemWrapper.removeClass('expanded');
        optionsPanel.slideUp(200);
        expandIcon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    } else {
        itemWrapper.addClass('expanded');
        optionsPanel.slideDown(200);
        expandIcon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    }
}

/**
 * Get selected item IDs in multi-select mode
 * @param {string} type - Content type
 * @returns {number[]} Array of selected item IDs
 */
export function getSelectedItems(type) {
    const listContainer = $(`#rolecall-list-${type}`);
    const selectedIds = [];

    listContainer.find('.rolecall-select-checkbox:checked').each(function() {
        const id = parseInt($(this).attr('data-id'));
        selectedIds.push(id);
    });

    return selectedIds;
}

/**
 * Update export selected button text with count
 * @param {string} type - Content type
 */
export function updateExportSelectedButton(type) {
    const selectedCount = getSelectedItems(type).length;
    const btn = $(`#rolecall-export-selected-${type}`);

    if (selectedCount > 0) {
        btn.text(`Export Selected (${selectedCount})`);
        btn.prop('disabled', false);
    } else {
        btn.text('Export Selected');
        btn.prop('disabled', true);
    }
}
