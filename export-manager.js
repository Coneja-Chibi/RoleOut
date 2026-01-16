/**
 * Export Manager - Handles character export functionality
 * Separated concern: Export business logic
 */

import { getRequestHeaders } from '../../../../script.js';

const MODULE_NAME = 'RoleOut-Export';

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
 * Export a single character from SillyTavern
 * @param {number} characterId - The character index (this_chid)
 * @param {string} format - Export format ('json' or 'png')
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function exportSingleCharacter(characterId, format = 'json') {
    try {
        console.log(`[${MODULE_NAME}] Exporting character ${characterId} as ${format}`);

        // Get character data from ST's global characters array
        if (!window.characters || !window.characters[characterId]) {
            throw new Error(`Character ${characterId} not found`);
        }

        const character = window.characters[characterId];
        const body = {
            format: format,
            avatar_url: character.avatar
        };

        // Call ST's export endpoint
        const response = await fetch('/api/characters/export', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            throw new Error(`Export failed with status ${response.status}`);
        }

        // Download the file
        const blob = await response.blob();
        const filename = character.avatar.replace('.png', `.${format}`);
        downloadBlob(blob, filename);

        console.log(`[${MODULE_NAME}] Successfully exported ${filename}`);
        toastr.success(`Exported ${character.name}`, 'RoleOut');
        return { success: true };

    } catch (error) {
        console.error(`[${MODULE_NAME}] Export failed:`, error);
        toastr.error(`Failed to export: ${error.message}`, 'RoleOut');
        return { success: false, error: error.message };
    }
}

/**
 * Export multiple characters as a ZIP file
 * @param {number[]} characterIds - Array of character indices
 * @param {string} format - Export format ('json' or 'png')
 * @returns {Promise<{success: boolean, exported: number, failed: number}>}
 */
export async function exportCharactersAsZip(characterIds, format = 'json') {
    try {
        console.log(`[${MODULE_NAME}] Bulk export: ${characterIds.length} characters as ${format}`);

        // Load JSZip
        const JSZip = await loadJSZip();
        const zip = new JSZip();

        let exported = 0;
        let failed = 0;

        // Show progress toast
        toastr.info(`Preparing ${characterIds.length} characters...`, 'RoleOut', { timeOut: 0 });

        // Fetch each character
        for (const characterId of characterIds) {
            try {
                if (!window.characters || !window.characters[characterId]) {
                    console.warn(`[${MODULE_NAME}] Character ${characterId} not found, skipping`);
                    failed++;
                    continue;
                }

                const character = window.characters[characterId];
                const body = {
                    format: format,
                    avatar_url: character.avatar
                };

                const response = await fetch('/api/characters/export', {
                    method: 'POST',
                    headers: getRequestHeaders(),
                    body: JSON.stringify(body),
                });

                if (!response.ok) {
                    console.warn(`[${MODULE_NAME}] Failed to export ${character.name}`);
                    failed++;
                    continue;
                }

                // Add file to ZIP
                const blob = await response.blob();
                const filename = character.avatar.replace('.png', `.${format}`);
                zip.file(filename, blob);

                exported++;
                console.log(`[${MODULE_NAME}] Added ${filename} to ZIP (${exported}/${characterIds.length})`);

            } catch (error) {
                console.error(`[${MODULE_NAME}] Error exporting character ${characterId}:`, error);
                failed++;
            }
        }

        // Clear progress toast
        toastr.clear();

        if (exported === 0) {
            toastr.error('No characters were exported successfully', 'RoleOut');
            return { success: false, exported: 0, failed };
        }

        // Generate ZIP file
        toastr.info('Creating ZIP file...', 'RoleOut');
        const zipBlob = await zip.generateAsync({ type: 'blob' });

        // Download ZIP
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const zipFilename = `RoleOut_Characters_${timestamp}.zip`;
        downloadBlob(zipBlob, zipFilename);

        console.log(`[${MODULE_NAME}] Successfully created ${zipFilename}`);
        toastr.success(`Exported ${exported} character${exported > 1 ? 's' : ''} to ${zipFilename}`, 'RoleOut', { timeOut: 5000 });

        return { success: true, exported, failed };

    } catch (error) {
        console.error(`[${MODULE_NAME}] Bulk export failed:`, error);
        toastr.error(`Bulk export failed: ${error.message}`, 'RoleOut');
        return { success: false, exported: 0, failed: characterIds.length };
    }
}
