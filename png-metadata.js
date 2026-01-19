/**
 * PNG Metadata Embedding Utility
 * Based on VectHare's PNG export implementation
 * Embeds JSON metadata into PNG files using tEXt chunks
 */

const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// CRC32 calculation for PNG chunks
let crcTable = null;

function makeCRCTable() {
    if (crcTable) return crcTable;
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[n] = c;
    }
    return crcTable;
}

function crc32(data) {
    const table = makeCRCTable();
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
        crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Creates a PNG chunk
 * @param {string} type - 4-character chunk type (e.g., 'tEXt')
 * @param {Uint8Array} data - Chunk data
 * @returns {Uint8Array} Complete chunk with length, type, data, and CRC
 */
function createChunk(type, data) {
    const typeBytes = new TextEncoder().encode(type);
    const chunk = new Uint8Array(4 + 4 + data.length + 4);
    const view = new DataView(chunk.buffer);

    // Length (4 bytes, big-endian)
    view.setUint32(0, data.length, false);

    // Type (4 bytes)
    chunk.set(typeBytes, 4);

    // Data
    chunk.set(data, 8);

    // CRC (4 bytes, big-endian) - calculated over type + data
    const crcData = new Uint8Array(4 + data.length);
    crcData.set(typeBytes, 0);
    crcData.set(data, 4);
    view.setUint32(8 + data.length, crc32(crcData), false);

    return chunk;
}

/**
 * Parses PNG chunks from binary data
 * @param {Uint8Array} pngData - PNG file data
 * @returns {Array<{type: string, data: Uint8Array, offset: number}>} Array of chunks
 */
function parseChunks(pngData) {
    // Verify PNG signature
    for (let i = 0; i < 8; i++) {
        if (pngData[i] !== PNG_SIGNATURE[i]) {
            throw new Error('Invalid PNG signature');
        }
    }

    const chunks = [];
    let offset = 8; // Skip signature

    while (offset < pngData.length) {
        const view = new DataView(pngData.buffer, pngData.byteOffset + offset);
        const length = view.getUint32(0, false);
        const type = new TextDecoder().decode(pngData.slice(offset + 4, offset + 8));
        const data = pngData.slice(offset + 8, offset + 8 + length);

        chunks.push({ type, data, offset });

        offset += 4 + 4 + length + 4; // length + type + data + crc

        if (type === 'IEND') break;
    }

    return chunks;
}

/**
 * Reconstructs PNG from chunks, inserting a new chunk before IEND
 * @param {Uint8Array} originalPng - Original PNG data
 * @param {Uint8Array} newChunk - New chunk to insert
 * @returns {Uint8Array} New PNG with inserted chunk
 */
function insertChunkBeforeIEND(originalPng, newChunk) {
    const chunks = parseChunks(originalPng);
    const iendIndex = chunks.findIndex(c => c.type === 'IEND');

    if (iendIndex === -1) {
        throw new Error('PNG missing IEND chunk');
    }

    // Calculate new file size
    const iendChunk = chunks[iendIndex];
    const beforeIEND = originalPng.slice(0, iendChunk.offset);
    const iendData = originalPng.slice(iendChunk.offset);

    // Combine: original (minus IEND) + new chunk + IEND
    const result = new Uint8Array(beforeIEND.length + newChunk.length + iendData.length);
    result.set(beforeIEND, 0);
    result.set(newChunk, beforeIEND.length);
    result.set(iendData, beforeIEND.length + newChunk.length);

    return result;
}

/**
 * Creates a tEXt chunk with JSON data
 * @param {string} keyword - Chunk keyword (e.g., 'chara', 'persona')
 * @param {string} jsonString - JSON string to embed
 * @returns {Uint8Array} tEXt chunk
 */
function createTextChunk(keyword, jsonString) {
    const keywordBytes = new TextEncoder().encode(keyword);
    const textBytes = new TextEncoder().encode(jsonString);

    // tEXt format: keyword + null + text
    const data = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
    data.set(keywordBytes, 0);
    data[keywordBytes.length] = 0; // Null separator
    data.set(textBytes, keywordBytes.length + 1);

    return createChunk('tEXt', data);
}

/**
 * Embeds JSON metadata into a PNG image
 * @param {Uint8Array} pngData - Original PNG data
 * @param {string} keyword - Metadata keyword (e.g., 'chara', 'persona')
 * @param {object} jsonData - Data to embed
 * @returns {Uint8Array} PNG with embedded metadata
 */
export function embedMetadataInPNG(pngData, keyword, jsonData) {
    const jsonString = JSON.stringify(jsonData);

    // Base64 encode the JSON for RoleCall compatibility
    // Use proper UTF-8 encoding before base64 to handle Unicode characters
    const utf8Bytes = new TextEncoder().encode(jsonString);
    const base64Json = btoa(String.fromCharCode(...utf8Bytes));

    const textChunk = createTextChunk(keyword, base64Json);
    const result = insertChunkBeforeIEND(pngData, textChunk);

    console.log(`[RoleOut PNG] Embedded ${jsonString.length} bytes (${base64Json.length} base64) as '${keyword}' chunk`);

    return result;
}

/**
 * Reads a tEXt chunk from PNG
 * @param {object} chunk - Parsed chunk {type, data}
 * @param {string} keyword - Expected keyword
 * @returns {{keyword: string, text: string} | null}
 */
function readTextChunk(chunk, keyword) {
    if (chunk.type !== 'tEXt') {
        return null;
    }

    // Find null separator
    let nullIndex = -1;
    for (let i = 0; i < chunk.data.length; i++) {
        if (chunk.data[i] === 0) {
            nullIndex = i;
            break;
        }
    }

    if (nullIndex === -1) return null;

    const chunkKeyword = new TextDecoder().decode(chunk.data.slice(0, nullIndex));

    if (chunkKeyword !== keyword) return null;

    const textData = chunk.data.slice(nullIndex + 1);
    const text = new TextDecoder().decode(textData);

    return { keyword: chunkKeyword, text };
}

/**
 * Extracts metadata from a PNG image
 * @param {Uint8Array} pngData - PNG file data
 * @param {string} keyword - Metadata keyword to look for
 * @returns {object|null} Extracted data or null if not found
 */
export function extractMetadataFromPNG(pngData, keyword) {
    const chunks = parseChunks(pngData);

    // Look for keyword in text chunks
    for (const chunk of chunks) {
        const result = readTextChunk(chunk, keyword);
        if (result) {
            try {
                // Try base64 decoding first (new format)
                let jsonText = result.text;
                try {
                    // Decode base64 and handle UTF-8 properly
                    const base64Decoded = atob(result.text);
                    const bytes = Uint8Array.from(base64Decoded, c => c.charCodeAt(0));
                    jsonText = new TextDecoder().decode(bytes);
                } catch (e) {
                    // Not base64, use as-is (legacy format)
                }
                return JSON.parse(jsonText);
            } catch (error) {
                console.error(`[RoleOut PNG] Failed to parse '${keyword}' metadata:`, error);
                return null;
            }
        }
    }

    return null;
}
