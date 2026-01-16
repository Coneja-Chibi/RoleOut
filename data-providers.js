/**
 * Data Providers - Handles fetching data from SillyTavern
 * Separated concern: Data access layer
 */

import { getContext } from '../../../extensions.js';
import { characters, this_chid, getRequestHeaders } from '../../../../script.js';
import { world_names } from '../../../world-info.js';
import { openai_setting_names } from '../../../openai.js';
import { power_user } from '../../../power-user.js';

/**
 * Get all characters
 * @returns {Array<{id: number, name: string, avatar: string}>}
 */
export function getCharacterList() {
    try {
        if (!characters || !Array.isArray(characters)) {
            console.warn('[RoleCall Exporter] Characters array not available');
            return [];
        }

        return characters.map((char, index) => {
            // Check for alternate greetings
            const altGreetings = char.data?.alternate_greetings || char.alternate_greetings || [];
            const hasAltGreetings = Array.isArray(altGreetings) && altGreetings.length > 0;

            // Check for attached lorebook
            const characterBook = char.data?.character_book || char.character_book;
            const hasLorebook = characterBook && (
                (Array.isArray(characterBook.entries) && characterBook.entries.length > 0) ||
                characterBook.name
            );
            const lorebookName = hasLorebook ? (characterBook.name || 'Unnamed Lorebook') : null;

            return {
                id: index,
                name: char.name || char?.data?.name || 'Unnamed Character',
                avatar: char.avatar,
                hasAvatar: !!char.avatar,
                hasAltGreetings,
                hasLorebook,
                lorebookName
            };
        });
    } catch (error) {
        console.error('[RoleOut] Error getting character list:', error);
        return [];
    }
}

/**
 * Get all chats across all characters using the API
 * @returns {Promise<Array<{id: number, name: string, character: string, avatar: string, lastMessage: string, messageCount: number, fileSize: string}>>}
 */
export async function getChatList() {
    try {
        // Use the recent chats API to get all chats
        const response = await fetch('/api/chats/recent', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({ max: 9999 })
        });

        if (!response.ok) {
            console.warn('[RoleOut] Failed to fetch chats:', response.status);
            return [];
        }

        const chats = await response.json();

        if (!Array.isArray(chats)) {
            console.warn('[RoleOut] Unexpected chats response format');
            return [];
        }

        // Match chats with characters by avatar filename
        return chats.map((chat, index) => {
            let characterName = 'Unknown Character';
            let avatarPath = null;

            if (chat.group) {
                characterName = 'Group Chat';
            } else if (chat.avatar && characters && Array.isArray(characters)) {
                const character = characters.find(c => c.avatar === chat.avatar);
                if (character) {
                    characterName = character.name || character.data?.name || 'Unknown Character';
                    avatarPath = chat.avatar; // Store avatar filename for thumbnail
                }
            }

            return {
                id: index,
                name: chat.file_name || chat.name || 'Unnamed Chat',
                character: characterName,
                avatar: avatarPath,
                lastMessage: chat.mes || '[Empty chat]',
                messageCount: chat.chat_items || 0,
                fileSize: chat.file_size || '0kb'
            };
        });
    } catch (error) {
        console.error('[RoleOut] Error fetching chats:', error);
        return [];
    }
}

/**
 * Get OpenAI presets
 * @returns {Array<{id: number, name: string}>}
 */
export function getPresetList() {
    try {
        // openai_setting_names might not be loaded yet
        if (!openai_setting_names) {
            console.warn('[RoleCall Exporter] OpenAI setting names not loaded yet');
            return [];
        }

        if (typeof openai_setting_names !== 'object') {
            console.warn('[RoleCall Exporter] Unexpected openai_setting_names type:', typeof openai_setting_names);
            return [];
        }

        const presetNames = Object.keys(openai_setting_names);
        return presetNames.map((name) => ({
            id: openai_setting_names[name],
            name: name
        }));
    } catch (error) {
        console.error('[RoleCall Exporter] Error getting preset list:', error);
        return [];
    }
}

/**
 * Get lorebooks
 * @returns {Array<{id: number, name: string}>}
 */
export function getLorebookList() {
    try {
        if (!world_names || !Array.isArray(world_names)) {
            console.warn('[RoleCall Exporter] World names not available');
            return [];
        }

        return world_names.map((name, index) => ({
            id: index,
            name: name
        }));
    } catch (error) {
        console.error('[RoleOut] Error getting lorebook list:', error);
        return [];
    }
}

/**
 * Get personas
 * @returns {Array<{id: number, name: string, avatar: string, description: string, title: string, isDefault: boolean}>}
 */
export function getPersonaList() {
    try {
        if (!power_user || !power_user.personas) {
            console.warn('[RoleOut] Personas not available');
            return [];
        }

        // power_user.personas is an object where keys are avatar filenames and values are persona names
        const personaAvatars = Object.keys(power_user.personas);

        return personaAvatars.map((avatar, index) => {
            const personaDesc = power_user.persona_descriptions?.[avatar] || {};

            return {
                id: index,
                name: power_user.personas[avatar] || '[Unnamed Persona]',
                avatar: avatar,
                description: personaDesc.description || '',
                title: personaDesc.title || '',
                isDefault: avatar === power_user.default_persona
            };
        });
    } catch (error) {
        console.error('[RoleOut] Error getting persona list:', error);
        return [];
    }
}

/**
 * Get counts for all content types (async to fetch chat count)
 * @returns {Promise<{characters: number, chats: number, presets: number, lorebooks: number, personas: number}>}
 */
export async function getCounts() {
    // Fetch actual chat count from API
    let chatCount = 0;
    try {
        const chats = await getChatList();
        chatCount = chats.length;
    } catch (error) {
        console.warn('[RoleOut] Could not fetch chat count:', error);
    }

    return {
        characters: (characters && Array.isArray(characters)) ? characters.length : 0,
        chats: chatCount,
        presets: (openai_setting_names && typeof openai_setting_names === 'object')
            ? Object.keys(openai_setting_names).length
            : 0,
        lorebooks: (world_names && Array.isArray(world_names)) ? world_names.length : 0,
        personas: (power_user?.personas && typeof power_user.personas === 'object')
            ? Object.keys(power_user.personas).length
            : 0
    };
}
