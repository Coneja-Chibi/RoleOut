# RoleOut

**Export your SillyTavern content to RoleCall**

A SillyTavern extension that lets you export characters, chats, presets, personas, and lorebooks in a format compatible with the [RoleCall](https://rolecall.app) web app.

---

## What Does This Do?

RoleOut adds an export panel to SillyTavern's extensions menu, allowing you to:

- **Export Characters** - Single or batch export with avatar images and full character card data
- **Export Chats** - Bundle chat history with character, preset, persona, and lorebooks (up to 10)
- **Export Presets** - Export generation settings and prompt templates
- **Export Lorebooks** - Export world info as JSON
- **Export Personas** - Export user personas with PNG metadata

### Features

✅ **Smart Bundle Export** - Chat exports can include all related content (character, preset, persona, lorebooks)
✅ **Batch Export** - Select multiple items and export as a single ZIP file
✅ **RoleCall Compatible** - All exports designed for direct import to RoleCall
✅ **Fast Concurrent Exports** - Exports up to 5 items simultaneously
✅ **Lorebook Multi-Select** - Choose up to 10 lorebooks to bundle with chat exports
✅ **PNG Metadata Embedding** - Characters and personas use tEXt chunks for metadata

---

## Installation

**Simple Installation (Recommended)**

1. Open SillyTavern
2. Click the **Extensions** menu (stacked blocks icon)
3. Click **Install Extension**
4. Paste this URL: `https://github.com/Coneja-Chibi/RoleOut`
5. Click **Save**

SillyTavern will automatically download and install the extension.

**Alternative: Manual Git Clone**

If you prefer managing extensions via git:

```bash
cd SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/Coneja-Chibi/RoleOut.git
```

Then restart SillyTavern.

---

## How to Use

### Basic Export

1. Open SillyTavern
2. Click **Extensions** (puzzle piece icon)
3. Find **🎭 RoleOut** in the extensions panel
4. Click on a content type panel (Characters, Chats, Presets, Lorebooks, Personas)
5. Browse available items
6. Click an item to expand export options
7. Click **Export This Item** to download

### Batch Export

1. Click the **Select Multiple** button in any content panel
2. Check the items you want to export
3. Click **Export Selected** to download as ZIP

### Chat Bundle Export

When exporting chats, you can create a complete bundle:

1. Click the **Chats** panel
2. Select a chat and check **📦 Export as Bundle**
3. Choose a preset from the dropdown (optional)
4. Select up to 10 lorebooks to include (optional)
5. Click **Export This Chat**

The bundle will include:
- Chat history (JSONL format)
- Character PNG (if "Include Character" is checked)
- Preset JSON (if selected)
- Persona PNG (if available)
- Lorebook JSON files (if selected)

---

## Export Formats

| Content Type | Format | Metadata Storage |
|--------------|--------|------------------|
| Characters | PNG | tEXt chunks in PNG |
| Chats | JSONL | One message per line |
| Presets | JSON | Standalone JSON file |
| Personas | PNG | tEXt chunks in PNG |
| Lorebooks | JSON | Full SillyTavern world info format |
| Bundles | ZIP | Contains all selected content |

---

## Requirements

- SillyTavern 1.10.0 or higher
- Modern web browser with ES6 module support
- JSZip library (included in SillyTavern)

---

## Troubleshooting

**Extension doesn't appear:**
- Make sure you used the Install Extension feature with the correct URL
- Check browser console (F12) for errors
- Try restarting SillyTavern

**Export fails:**
- Check that you have content loaded in SillyTavern
- Ensure you're not blocking pop-ups (downloads may be blocked)
- For lorebook exports, verify lorebooks are loaded in world info

**Lorebook selector doesn't show:**
- Make sure you've checked the **📦 Export as Bundle** checkbox first
- Verify you have lorebooks in your SillyTavern world info

**Can't select more than 10 lorebooks:**
- This is intentional - RoleCall limits lorebook imports to 10 per chat for performance

---

## Development

This extension follows a modular architecture with separation of concerns:

```
RoleOut/
├── index.js              # Main entry point
├── data-providers.js     # Data access layer (gets content from ST)
├── ui-controller.js      # View layer (renders panels and controls)
├── event-handlers.js     # Controller layer (handles user interactions)
├── export-manager.js     # Export business logic (creates files/bundles)
├── png-metadata.js       # PNG tEXt chunk encoding/decoding
└── settings.html         # Extension UI template
```

### Key Functions

- `exportSingleChat()` - Exports individual chat with bundle options
- `exportCharacterBatch()` - Batch exports characters as ZIP
- `createLorebookMultiSelect()` - UI for lorebook selection (max 10)
- `embedMetadataInPng()` - Embeds JSON in PNG tEXt chunks

See inline JSDoc comments for detailed documentation.

---

## Changelog

### v1.1.0 (Latest)
- ✨ Added lorebook multi-select for chat exports (up to 10)
- ✨ Lorebooks exported as JSON in bundle ZIP
- 🐛 Fixed bundle structure for RoleCall compatibility
- 📝 Updated README with correct installation instructions

### v1.0.0
- 🎉 Initial release
- ✅ Character export (single + batch)
- ✅ Chat export with bundle support
- ✅ Preset and persona export
- ✅ PNG metadata embedding

---

## License

MIT

---

## Links

- [RoleCall Web App](https://rolecall.app)
- [Report Issues](https://github.com/Coneja-Chibi/RoleOut/issues)
- [SillyTavern Extensions Guide](https://docs.sillytavern.app/extensions/extensions-management/)
