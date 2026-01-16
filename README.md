# RoleOut

**Export your SillyTavern content to RoleCall**

A SillyTavern extension that lets you export characters, chats, presets, and lorebooks in a format compatible with the [RoleCall](https://rolecall.app) web app.

---

## What Does This Do?

RoleOut adds an export panel to SillyTavern's extensions menu, allowing you to:

- **Export Characters** - Single or batch export as JSON (RoleCall-compatible format)
- **Export Chats** - *(Coming soon)*
- **Export Presets** - *(Coming soon)*
- **Export Lorebooks** - *(Coming soon)*

### Features

✅ **Smart Export Options** - Only shows options for features that exist (e.g., won't show "Include Avatar" if character has no avatar)
✅ **Batch Export** - Select multiple characters and export as a single ZIP file
✅ **RoleCall Compatible** - Exports in JSON format that RoleCall can import directly
✅ **Fast Concurrent Exports** - Exports up to 5 characters simultaneously for speed

---

## Installation

### Option 1: Git Clone (Recommended)
```bash
cd SillyTavern/public/scripts/extensions/third-party
git clone https://github.com/Coneja-Chibi/RoleOut.git
```

### Option 2: Manual Download
1. Download this repository as a ZIP
2. Extract to `SillyTavern/public/scripts/extensions/third-party/RoleOut`
3. Restart SillyTavern

---

## How to Use

1. Open SillyTavern
2. Click **Extensions** (puzzle piece icon)
3. Find **RoleOut** in the extensions panel
4. Click on a content type (Characters, Chats, etc.) to view exportable items
5. Click an item to expand export options
6. Click **Export This Item** to download

### Batch Export

1. Click the **Multi-Select** button in any content panel
2. Check the items you want to export
3. Click **Export Selected** to download as ZIP

---

## Requirements

- SillyTavern 1.10.0 or higher
- Modern web browser with ES6 module support

---

## Troubleshooting

**Extension doesn't appear:**
- Make sure the folder is named exactly `RoleOut` (case-sensitive)
- Check browser console (F12) for errors
- Try restarting SillyTavern

**Export fails:**
- Check that you have characters/content loaded in SillyTavern
- Ensure you're not blocking pop-ups (downloads may be blocked)

---

## Development

This extension follows a modular architecture with separation of concerns:

```
RoleOut/
├── index.js              # Main entry point
├── data-providers.js     # Data access layer
├── ui-controller.js      # View layer
├── event-handlers.js     # Controller layer
├── export-manager.js     # Export business logic
└── settings-manager.js   # Configuration
```

See inline JSDoc comments for detailed documentation.

---

## License

MIT

---

## Links

- [RoleCall Web App](https://rolecall.app)
- [Report Issues](https://github.com/Coneja-Chibi/RoleOut/issues)
