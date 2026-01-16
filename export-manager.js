/**
 * Export Manager - Handles character export functionality
 * Separated concern: Export business logic
 */

import { getRequestHeaders, user_avatar } from '../../../../script.js';
import { getCharacterList, getPersonaList } from './data-providers.js';
import { embedMetadataInPNG } from './png-metadata.js';
import { power_user } from '../../../power-user.js';
import { openai_setting_names } from '../../../openai.js';

const MODULE_NAME = 'RoleOut-Export';
const MAX_CONCURRENT_EXPORTS = 5; // Don't hammer the server

/**
 * Load JSZip library dynamically
 * @returns {Promise<JSZip>}
 */
async function loadJSZip() {
    if (window.JSZip) {
        return window.JSZip;
    }
    return (await import('/lib/jszip.min.js')).default;
}

/**
 * Download a blob as a file
 * @param {Blob} blob - The blob to download
 * @param {string} filename - The filename to save as
 */
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

/**
 * Get safe filename from character avatar path
 * Handles edge cases like uppercase extensions, multiple dots, etc.
 * @param {string} avatarPath - Original avatar path (e.g., "character.png")
 * @param {string} newExtension - New extension without dot (e.g., "json")
 * @returns {string} Safe filename
 */
function getSafeFilename(avatarPath, newExtension) {
    if (!avatarPath) {
        return `character_${Date.now()}.${newExtension}`;
    }

    // Extract just the filename, handle paths
    const filename = avatarPath.split('/').pop().split('\\').pop();

    // Remove extension (case-insensitive)
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

    // Sanitize the name
    const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');

    return `${safeName}.${newExtension}`;
}

/**
 * Prepare export request body for a character
 * @param {Object} character - Character object with avatar property
 * @param {string} format - Export format ('json' or 'png')
 * @returns {Object} Request body
 */
function prepareExportRequest(character, format) {
    return {
        format: format,
        avatar_url: character.avatar
    };
}

/**
 * Export a single character from SillyTavern
 * @param {number} characterId - The character index
 * @param {string} format - Export format ('json' or 'png')
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function exportSingleCharacter(characterId, format = 'json') {
    try {
        console.log(`[${MODULE_NAME}] Exporting character ${characterId} as ${format}`);

        // Use data provider instead of raw window access
        const characters = getCharacterList();
        const character = characters.find(c => c.id === characterId);

        if (!character) {
            throw new Error(`Character with ID ${characterId} not found in character list`);
        }

        const body = prepareExportRequest(character, format);

        // Call ST's export endpoint
        const response = await fetch('/api/characters/export', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const statusText = response.statusText || 'Unknown error';
            throw new Error(`Export failed: HTTP ${response.status} - ${statusText}`);
        }

        // Download the file
        const blob = await response.blob();
        const filename = getSafeFilename(character.avatar, format);
        downloadBlob(blob, filename);

        console.log(`[${MODULE_NAME}] Successfully exported ${filename}`);
        toastr.success(`Exported ${character.name}`, 'RoleOut');
        return { success: true };

    } catch (error) {
        console.error(`[${MODULE_NAME}] Export failed for character ${characterId}:`, error);
        toastr.error(`Failed to export: ${error.message}`, 'RoleOut');
        return { success: false, error: error.message };
    }
}

/**
 * Export a single character (helper for batch export)
 * @param {Object} character - Character object
 * @param {string} format - Export format
 * @returns {Promise<{success: boolean, filename?: string, blob?: Blob, error?: string}>}
 */
async function exportSingleCharacterToBlob(character, format) {
    try {
        const body = prepareExportRequest(character, format);

        const response = await fetch('/api/characters/export', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        const filename = getSafeFilename(character.avatar, format);

        return { success: true, filename, blob };
    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to export ${character.name}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Batch export characters with concurrency limit
 * @param {Array<Object>} characters - Array of character objects
 * @param {string} format - Export format
 * @returns {Promise<Array<{success: boolean, character: Object, filename?: string, blob?: Blob, error?: string}>>}
 */
async function batchExportCharacters(characters, format) {
    const results = [];
    const queue = [...characters];
    const inProgress = new Set();

    while (queue.length > 0 || inProgress.size > 0) {
        // Fill up to max concurrent exports
        while (inProgress.size < MAX_CONCURRENT_EXPORTS && queue.length > 0) {
            const character = queue.shift();
            const promise = exportSingleCharacterToBlob(character, format)
                .then(result => {
                    inProgress.delete(promise);
                    return { ...result, character };
                });
            inProgress.add(promise);
        }

        // Wait for at least one to complete
        if (inProgress.size > 0) {
            const result = await Promise.race(inProgress);
            results.push(result);
        }
    }

    return results;
}

/**
 * Get current timestamp in safe filename format
 * Format: YYYY-MM-DD_HH-MM-SS
 * @returns {string}
 */
function getTimestampForFilename() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

/**
 * Export multiple characters as a ZIP file
 * @param {number[]} characterIds - Array of character indices
 * @param {string} format - Export format ('json' or 'png')
 * @returns {Promise<{success: boolean, exported: number, failed: number, errors?: Array}>}
 */
export async function exportCharactersAsZip(characterIds, format = 'json') {
    let progressToast = null;

    try {
        console.log(`[${MODULE_NAME}] Bulk export: ${characterIds.length} characters as ${format}`);

        // Use data provider to get characters
        const allCharacters = getCharacterList();
        const charactersToExport = characterIds
            .map(id => allCharacters.find(c => c.id === id))
            .filter(Boolean); // Remove any undefined entries

        if (charactersToExport.length === 0) {
            throw new Error('No valid characters found to export');
        }

        // Show progress toast
        progressToast = toastr.info(
            `Preparing ${charactersToExport.length} character${charactersToExport.length > 1 ? 's' : ''}...`,
            'RoleOut',
            { timeOut: 0, extendedTimeOut: 0 }
        );

        // Load JSZip
        const JSZip = await loadJSZip();
        const zip = new JSZip();

        // Batch export with concurrency control
        const results = await batchExportCharacters(charactersToExport, format);

        let exported = 0;
        let failed = 0;
        const errors = [];

        // Add successful exports to ZIP
        for (const result of results) {
            if (result.success && result.blob && result.filename) {
                zip.file(result.filename, result.blob);
                exported++;
                console.log(`[${MODULE_NAME}] Added ${result.filename} to ZIP (${exported}/${charactersToExport.length})`);
            } else {
                failed++;
                const errorMsg = `${result.character.name}: ${result.error || 'Unknown error'}`;
                errors.push(errorMsg);
                console.warn(`[${MODULE_NAME}] ${errorMsg}`);
            }
        }

        if (exported === 0) {
            throw new Error('No characters were exported successfully');
        }

        // Generate ZIP file
        if (progressToast) {
            toastr.clear(progressToast);
        }
        progressToast = toastr.info('Creating ZIP file...', 'RoleOut', { timeOut: 0, extendedTimeOut: 0 });

        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Download ZIP
        const timestamp = getTimestampForFilename();
        const zipFilename = `RoleOut_Characters_${timestamp}.zip`;
        downloadBlob(zipBlob, zipFilename);

        console.log(`[${MODULE_NAME}] Successfully created ${zipFilename} (${exported} files)`);

        // Show success message with details
        const message = failed > 0
            ? `Exported ${exported} character${exported > 1 ? 's' : ''} (${failed} failed)`
            : `Exported ${exported} character${exported > 1 ? 's' : ''}`;

        toastr.success(message, zipFilename, { timeOut: 5000 });

        return { success: true, exported, failed, errors: failed > 0 ? errors : undefined };

    } catch (error) {
        console.error(`[${MODULE_NAME}] Bulk export failed:`, error);
        toastr.error(`Bulk export failed: ${error.message}`, 'RoleOut');
        return { success: false, exported: 0, failed: characterIds.length, errors: [error.message] };
    } finally {
        // Always clear progress toast
        if (progressToast) {
            toastr.clear(progressToast);
        }
    }
}

/**
 * Export a single chat from SillyTavern
 * @param {Object} chat - Chat object with file_name and avatar properties
 * @param {Object} options - Export options (includeCharacter, etc.)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function exportSingleChat(chat, options = {}) {
    try {
        console.log(`[${MODULE_NAME}] Exporting chat: ${chat.file_name}`, options);

        const includeCharacter = options.includeCharacter !== false; // Default true
        const exportBundle = options.exportBundle || false; // Bundle includes preset + persona + character

        // If exporting as bundle, create comprehensive ZIP
        if (exportBundle && chat.avatar) {
            const JSZip = await loadJSZip();
            const zip = new JSZip();

            // 1. Export chat as JSONL
            const chatResponse = await fetch('/api/chats/export', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    file: chat.file_name,
                    avatar_url: chat.avatar,
                    format: 'jsonl',
                    exportfilename: `${chat.file_name}.jsonl`
                }),
            });

            if (!chatResponse.ok) {
                throw new Error(`Chat export failed: HTTP ${chatResponse.status}`);
            }

            const chatData = await chatResponse.json();
            if (!chatData.result) {
                throw new Error('Chat export returned no data');
            }

            const chatFilename = getSafeFilename(chat.file_name, 'jsonl');
            zip.file(`chat/${chatFilename}`, chatData.result);

            // 2. Export character as PNG
            const charResponse = await fetch('/api/characters/export', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    format: 'png',
                    avatar_url: chat.avatar
                }),
            });

            if (!charResponse.ok) {
                throw new Error(`Character export failed: HTTP ${charResponse.status}`);
            }

            const charBlob = await charResponse.blob();
            const charFilename = getSafeFilename(chat.avatar, 'png');
            zip.file(`character/${charFilename}`, charBlob);

            // 3. Export current preset as JSON
            const currentPresetName = power_user?.preset_settings || power_user?.main_api;
            if (currentPresetName && openai_setting_names?.includes(currentPresetName)) {
                try {
                    const presetResponse = await fetch('/api/presets/get', {
                        method: 'POST',
                        headers: getRequestHeaders(),
                        body: JSON.stringify({ name: currentPresetName }),
                    });

                    if (presetResponse.ok) {
                        const presetData = await presetResponse.json();
                        const presetFilename = getSafeFilename(currentPresetName, 'json');
                        zip.file(`preset/${presetFilename}`, JSON.stringify(presetData, null, 2));
                        console.log(`[${MODULE_NAME}] Added preset to bundle: ${currentPresetName}`);
                    }
                } catch (presetError) {
                    console.warn(`[${MODULE_NAME}] Could not export preset:`, presetError);
                    // Continue without preset - not critical
                }
            }

            // 4. Export current persona as PNG with embedded metadata
            if (user_avatar) {
                try {
                    const avatarResponse = await fetch(`/User Avatars/${user_avatar}`);
                    if (avatarResponse.ok) {
                        const avatarBlob = await avatarResponse.blob();
                        const avatarBuffer = await avatarBlob.arrayBuffer();
                        const pngData = new Uint8Array(avatarBuffer);

                        // Get persona metadata from power_user
                        const personaMetadata = {
                            name: power_user?.persona_description || 'User',
                            description: power_user?.persona_description || '',
                            avatar: user_avatar,
                            exportedAt: new Date().toISOString(),
                            exportedBy: 'RoleOut'
                        };

                        // Embed metadata into PNG
                        const pngWithMetadata = embedMetadataInPNG(pngData, 'persona', personaMetadata);
                        const personaFilename = getSafeFilename(user_avatar, 'png');
                        zip.file(`persona/${personaFilename}`, pngWithMetadata);
                        console.log(`[${MODULE_NAME}] Added persona to bundle: ${user_avatar}`);
                    }
                } catch (personaError) {
                    console.warn(`[${MODULE_NAME}] Could not export persona:`, personaError);
                    // Continue without persona - not critical
                }
            }

            // Generate and download bundle ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const timestamp = getTimestampForFilename();
            const zipFilename = `RoleOut_ChatBundle_${getSafeFilename(chat.file_name, '')}_${timestamp}.zip`;
            downloadBlob(zipBlob, zipFilename);

            console.log(`[${MODULE_NAME}] Successfully exported chat bundle: ${zipFilename}`);
            toastr.success(`Exported complete chat bundle`, 'RoleOut');
            return { success: true };

        } else if (includeCharacter && chat.avatar) {
            const JSZip = await loadJSZip();
            const zip = new JSZip();

            // Export chat as JSONL
            const chatResponse = await fetch('/api/chats/export', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    file: chat.file_name,
                    avatar_url: chat.avatar,
                    format: 'jsonl',
                    exportfilename: `${chat.file_name}.jsonl`
                }),
            });

            if (!chatResponse.ok) {
                throw new Error(`Chat export failed: HTTP ${chatResponse.status}`);
            }

            const chatData = await chatResponse.json();
            if (!chatData.result) {
                throw new Error('Chat export returned no data');
            }

            // Add chat to ZIP
            const chatFilename = getSafeFilename(chat.file_name, 'jsonl');
            zip.file(chatFilename, chatData.result);

            // Export character as PNG (V2 card with embedded image)
            const charResponse = await fetch('/api/characters/export', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    format: 'png',
                    avatar_url: chat.avatar
                }),
            });

            if (!charResponse.ok) {
                throw new Error(`Character export failed: HTTP ${charResponse.status}`);
            }

            const charBlob = await charResponse.blob();
            const charFilename = getSafeFilename(chat.avatar, 'png');
            zip.file(charFilename, charBlob);

            // Generate and download ZIP
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const timestamp = getTimestampForFilename();
            const zipFilename = `RoleOut_Chat_${getSafeFilename(chat.file_name, '')}_${timestamp}.zip`;
            downloadBlob(zipBlob, zipFilename);

            console.log(`[${MODULE_NAME}] Successfully exported chat with character: ${zipFilename}`);
            toastr.success(`Exported chat with character`, 'RoleOut');
            return { success: true };

        } else {
            // Export just the chat as JSONL
            const response = await fetch('/api/chats/export', {
                method: 'POST',
                headers: getRequestHeaders(),
                body: JSON.stringify({
                    file: chat.file_name,
                    avatar_url: chat.avatar,
                    format: 'jsonl',
                    exportfilename: `${chat.file_name}.jsonl`
                }),
            });

            if (!response.ok) {
                throw new Error(`Chat export failed: HTTP ${response.status}`);
            }

            const data = await response.json();
            if (!data.result) {
                throw new Error('Chat export returned no data');
            }

            // Download as JSONL file
            const blob = new Blob([data.result], { type: 'application/jsonl' });
            const filename = getSafeFilename(chat.file_name, 'jsonl');
            downloadBlob(blob, filename);

            console.log(`[${MODULE_NAME}] Successfully exported chat: ${filename}`);
            toastr.success(`Exported ${chat.file_name}`, 'RoleOut');
            return { success: true };
        }

    } catch (error) {
        console.error(`[${MODULE_NAME}] Chat export failed:`, error);
        toastr.error(`Failed to export chat: ${error.message}`, 'RoleOut');
        return { success: false, error: error.message };
    }
}

/**
 * Export a single chat to blob (helper for batch export)
 * @param {Object} chat - Chat object
 * @param {boolean} includeCharacter - Whether to include character
 * @returns {Promise<{success: boolean, chatFilename?: string, chatBlob?: Blob, charFilename?: string, charBlob?: Blob, error?: string}>}
 */
async function exportSingleChatToBlob(chat, includeCharacter) {
    try {
        // Export chat as JSONL
        const chatResponse = await fetch('/api/chats/export', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                file: chat.file_name,
                avatar_url: chat.avatar,
                format: 'jsonl',
                exportfilename: `${chat.file_name}.jsonl`
            }),
        });

        if (!chatResponse.ok) {
            throw new Error(`HTTP ${chatResponse.status}`);
        }

        const chatData = await chatResponse.json();
        if (!chatData.result) {
            throw new Error('No data returned');
        }

        const chatBlob = new Blob([chatData.result], { type: 'application/jsonl' });
        const chatFilename = getSafeFilename(chat.file_name, 'jsonl');

        // If not including character or no avatar, just return chat
        if (!includeCharacter || !chat.avatar) {
            return {
                success: true,
                chatFilename,
                chatBlob,
                avatarUrl: chat.avatar // For deduplication
            };
        }

        // Export character as PNG
        const charResponse = await fetch('/api/characters/export', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                format: 'png',
                avatar_url: chat.avatar
            }),
        });

        if (!charResponse.ok) {
            // Character export failed, still return chat but log warning
            console.warn(`[${MODULE_NAME}] Character export failed for ${chat.avatar}, exporting chat only`);
            return {
                success: true,
                chatFilename,
                chatBlob,
                avatarUrl: chat.avatar
            };
        }

        const charBlob = await charResponse.blob();
        const charFilename = getSafeFilename(chat.avatar, 'png');

        return {
            success: true,
            chatFilename,
            chatBlob,
            charFilename,
            charBlob,
            avatarUrl: chat.avatar // For deduplication
        };

    } catch (error) {
        console.error(`[${MODULE_NAME}] Failed to export chat ${chat.file_name}:`, error);
        return {
            success: false,
            error: error.message,
            chatName: chat.file_name
        };
    }
}

/**
 * Batch export chats with concurrency limit and per-chat character inclusion options
 * @param {Array<{chat: Object, includeCharacter: boolean}>} chatExports - Array of chat export configs
 * @returns {Promise<{success: boolean, exported: number, failed: number, errors?: Array}>}
 */
export async function exportChatsAsZip(chatExports) {
    let progressToast = null;

    try {
        console.log(`[${MODULE_NAME}] Batch export: ${chatExports.length} chats`);

        if (chatExports.length === 0) {
            throw new Error('No chats selected for export');
        }

        // Show progress toast
        progressToast = toastr.info(
            `Preparing ${chatExports.length} chat${chatExports.length > 1 ? 's' : ''}...`,
            'RoleOut',
            { timeOut: 0, extendedTimeOut: 0 }
        );

        // Load JSZip
        const JSZip = await loadJSZip();
        const zip = new JSZip();

        // Batch export with concurrency control
        const results = [];
        const queue = [...chatExports];
        const inProgress = new Set();

        while (queue.length > 0 || inProgress.size > 0) {
            while (inProgress.size < MAX_CONCURRENT_EXPORTS && queue.length > 0) {
                const { chat, includeCharacter, exportBundle } = queue.shift();

                // If bundle export is requested, export directly (not as blob for batch)
                if (exportBundle) {
                    const promise = exportSingleChat(chat, { includeCharacter, exportBundle: true })
                        .then(result => {
                            inProgress.delete(promise);
                            return { ...result, isBundleExport: true };
                        });
                    inProgress.add(promise);
                } else {
                    const promise = exportSingleChatToBlob(chat, includeCharacter)
                        .then(result => {
                            inProgress.delete(promise);
                            return result;
                        });
                    inProgress.add(promise);
                }
            }

            if (inProgress.size > 0) {
                const result = await Promise.race(inProgress);
                results.push(result);
            }
        }

        let exported = 0;
        let failed = 0;
        let bundleExported = 0;
        const errors = [];
        const includedCharacters = new Set(); // Track which characters we've already added

        // Add successful exports to ZIP
        for (const result of results) {
            // Skip bundle exports (they were downloaded directly)
            if (result.isBundleExport) {
                if (result.success) {
                    bundleExported++;
                    console.log(`[${MODULE_NAME}] Bundle exported directly (${bundleExported} bundles)`);
                } else {
                    failed++;
                    errors.push(`Bundle export failed: ${result.error || 'Unknown error'}`);
                }
                continue;
            }

            if (result.success) {
                // Add chat file
                zip.file(result.chatFilename, result.chatBlob);
                exported++;

                // Add character file (only once per unique character)
                if (result.charBlob && result.charFilename && result.avatarUrl) {
                    if (!includedCharacters.has(result.avatarUrl)) {
                        zip.file(result.charFilename, result.charBlob);
                        includedCharacters.add(result.avatarUrl);
                        console.log(`[${MODULE_NAME}] Added character: ${result.charFilename}`);
                    } else {
                        console.log(`[${MODULE_NAME}] Skipped duplicate character: ${result.charFilename}`);
                    }
                }

                console.log(`[${MODULE_NAME}] Added chat: ${result.chatFilename} (${exported}/${chatExports.length})`);
            } else {
                failed++;
                const errorMsg = `${result.chatName}: ${result.error || 'Unknown error'}`;
                errors.push(errorMsg);
                console.warn(`[${MODULE_NAME}] ${errorMsg}`);
            }
        }

        if (exported === 0 && bundleExported === 0) {
            throw new Error('No chats were exported successfully');
        }

        // If only bundle exports, no ZIP needed
        if (exported === 0 && bundleExported > 0) {
            toastr.clear(progressToast);
            toastr.success(
                `Exported ${bundleExported} chat bundle${bundleExported > 1 ? 's' : ''}`,
                'RoleOut'
            );
            return;
        }

        // Generate ZIP file
        if (progressToast) {
            toastr.clear(progressToast);
        }
        progressToast = toastr.info('Creating ZIP file...', 'RoleOut', { timeOut: 0, extendedTimeOut: 0 });

        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Download ZIP
        const timestamp = getTimestampForFilename();
        const zipFilename = `RoleOut_Chats_${timestamp}.zip`;
        downloadBlob(zipBlob, zipFilename);

        console.log(`[${MODULE_NAME}] Successfully created ${zipFilename} (${exported} chats, ${includedCharacters.size} unique characters)`);

        // Show success message with details
        const message = failed > 0
            ? `Exported ${exported} chat${exported > 1 ? 's' : ''} (${failed} failed)`
            : `Exported ${exported} chat${exported > 1 ? 's' : ''}`;

        toastr.success(message, zipFilename, { timeOut: 5000 });

        return { success: true, exported, failed, errors: failed > 0 ? errors : undefined };

    } catch (error) {
        console.error(`[${MODULE_NAME}] Batch chat export failed:`, error);
        toastr.error(`Batch export failed: ${error.message}`, 'RoleOut');
        return { success: false, exported: 0, failed: chatExports.length, errors: [error.message] };
    } finally {
        // Always clear progress toast
        if (progressToast) {
            toastr.clear(progressToast);
        }
    }
}

/**
 * Export a single persona from SillyTavern
 * Personas are exported as PNG files with embedded JSON metadata (like character cards)
 * @param {number} personaId - Persona ID (index in getPersonaList())
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function exportSinglePersona(personaId) {
    try {
        console.log(`[${MODULE_NAME}] Exporting persona: ${personaId}`);

        const personas = getPersonaList();
        const persona = personas.find(p => p.id === personaId);

        if (!persona) {
            throw new Error('Persona not found');
        }

        // Fetch the avatar image
        if (!persona.avatar) {
            throw new Error('Persona has no avatar image');
        }

        const avatarResponse = await fetch(`/User Avatars/${persona.avatar}`);
        if (!avatarResponse.ok) {
            throw new Error(`Failed to fetch persona avatar: ${avatarResponse.statusText}`);
        }

        const avatarBlob = await avatarResponse.blob();
        const avatarBuffer = await avatarBlob.arrayBuffer();
        const pngData = new Uint8Array(avatarBuffer);

        // Create persona metadata object
        const personaMetadata = {
            name: persona.name,
            description: persona.description || '',
            title: persona.title || '',
            isDefault: persona.isDefault,
            exportedAt: new Date().toISOString(),
            exportedBy: 'RoleOut'
        };

        // Embed metadata into PNG using 'persona' keyword
        const pngWithMetadata = embedMetadataInPNG(pngData, 'persona', personaMetadata);

        // Download as PNG file
        const blob = new Blob([pngWithMetadata], { type: 'image/png' });
        const filename = persona.avatar; // Keep original filename
        downloadBlob(blob, filename);

        console.log(`[${MODULE_NAME}] Successfully exported persona: ${filename}`);
        toastr.success(`Exported ${persona.name}`, 'RoleOut');
        return { success: true };

    } catch (error) {
        console.error(`[${MODULE_NAME}] Persona export failed:`, error);
        toastr.error(`Failed to export persona: ${error.message}`, 'RoleOut');
        return { success: false, error: error.message };
    }
}

/**
 * Export personas as ZIP file containing PNG files with embedded metadata
 * @param {number[]} personaIds - Array of persona IDs
 * @returns {Promise<{success: boolean, exported: number, failed: number, errors?: Array}>}
 */
export async function exportPersonasAsZip(personaIds) {
    let progressToast = null;

    try {
        console.log(`[${MODULE_NAME}] Batch export: ${personaIds.length} personas`);

        if (personaIds.length === 0) {
            throw new Error('No personas selected for export');
        }

        // Show progress toast
        progressToast = toastr.info(
            `Preparing ${personaIds.length} persona${personaIds.length > 1 ? 's' : ''}...`,
            'RoleOut',
            { timeOut: 0, extendedTimeOut: 0 }
        );

        // Load JSZip
        const JSZip = await loadJSZip();
        const zip = new JSZip();

        const personas = getPersonaList();
        let exported = 0;
        let failed = 0;
        const errors = [];

        // Export each persona
        for (const id of personaIds) {
            try {
                const persona = personas.find(p => p.id === id);
                if (!persona) {
                    throw new Error(`Persona ${id} not found`);
                }

                if (!persona.avatar) {
                    throw new Error(`Persona ${persona.name} has no avatar`);
                }

                // Fetch avatar image
                const avatarResponse = await fetch(`/User Avatars/${persona.avatar}`);
                if (!avatarResponse.ok) {
                    throw new Error(`Failed to fetch avatar: ${avatarResponse.statusText}`);
                }

                const avatarBlob = await avatarResponse.blob();
                const avatarBuffer = await avatarBlob.arrayBuffer();
                const pngData = new Uint8Array(avatarBuffer);

                // Create persona metadata
                const personaMetadata = {
                    name: persona.name,
                    description: persona.description || '',
                    title: persona.title || '',
                    isDefault: persona.isDefault,
                    exportedAt: new Date().toISOString(),
                    exportedBy: 'RoleOut'
                };

                // Embed metadata into PNG
                const pngWithMetadata = embedMetadataInPNG(pngData, 'persona', personaMetadata);

                // Add PNG to ZIP
                zip.file(persona.avatar, pngWithMetadata);

                exported++;
                console.log(`[${MODULE_NAME}] Added persona: ${persona.name} (${exported}/${personaIds.length})`);

            } catch (error) {
                failed++;
                const errorMsg = `Persona ${id}: ${error.message}`;
                errors.push(errorMsg);
                console.warn(`[${MODULE_NAME}] ${errorMsg}`);
            }
        }

        if (exported === 0) {
            throw new Error('No personas were exported successfully');
        }

        // Generate ZIP file
        if (progressToast) {
            toastr.clear(progressToast);
        }
        progressToast = toastr.info('Creating ZIP file...', 'RoleOut', { timeOut: 0, extendedTimeOut: 0 });

        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Download ZIP
        const timestamp = getTimestampForFilename();
        const zipFilename = `RoleOut_Personas_${timestamp}.zip`;
        downloadBlob(zipBlob, zipFilename);

        console.log(`[${MODULE_NAME}] Successfully created ${zipFilename} (${exported} personas)`);

        // Show success message with details
        const message = failed > 0
            ? `Exported ${exported} persona${exported > 1 ? 's' : ''} (${failed} failed)`
            : `Exported ${exported} persona${exported > 1 ? 's' : ''}`;

        toastr.success(message, zipFilename, { timeOut: 5000 });

        return { success: true, exported, failed, errors: failed > 0 ? errors : undefined };

    } catch (error) {
        console.error(`[${MODULE_NAME}] Batch persona export failed:`, error);
        toastr.error(`Batch export failed: ${error.message}`, 'RoleOut');
        return { success: false, exported: 0, failed: personaIds.length, errors: [error.message] };
    } finally {
        // Always clear progress toast
        if (progressToast) {
            toastr.clear(progressToast);
        }
    }
}
