# RoleOut

A SillyTavern extension to export characters, chats, presets, and lorebooks for import into the RoleCall web app.

## Architecture

This extension follows **separation of concerns** principles with a clean modular architecture:

```
RoleOut/
├── index.js              # Main entry point & orchestration
├── data-providers.js     # Data access layer
├── ui-controller.js      # View layer (UI updates)
├── event-handlers.js     # Controller layer (user interactions)
├── settings-manager.js   # Configuration management
├── settings.html         # UI template
├── style.css            # Styles
└── manifest.json        # Extension metadata
```

## Module Responsibilities

### `index.js` - Orchestrator
- Extension initialization
- Module coordination
- Error handling

### `data-providers.js` - Data Access Layer
**Single Responsibility:** Fetch data from SillyTavern

Functions:
- `getCharacterList()` - Get all characters
- `getChatList()` - Get chats for current character
- `getPresetList()` - Get OpenAI presets
- `getLorebookList()` - Get all lorebooks
- `getCounts()` - Get counts for all content types

### `ui-controller.js` - View Layer
**Single Responsibility:** Update and manage UI

Functions:
- `updateStatusCounts()` - Update status panel counts
- `populateItemList(type)` - Populate item lists
- `setupSearchFilter(type)` - Setup search functionality
- `toggleOptionsCard(type)` - Toggle options visibility

### `event-handlers.js` - Controller Layer
**Single Responsibility:** Handle user interactions

Functions:
- `bindEventHandlers()` - Main binding function
- Click handlers for panels, buttons, items
- Export functions (stub implementations)

### `settings-manager.js` - Configuration Management
**Single Responsibility:** Manage extension settings

Functions:
- `initializeSettings()` - Initialize with defaults
- `loadSettings()` - Load settings into UI

## Design Patterns Used

1. **Separation of Concerns** - Each module has one job
2. **Single Responsibility Principle** - Each function does one thing
3. **Dependency Injection** - Modules don't directly access globals
4. **Error Handling** - Try/catch blocks with logging
5. **Defensive Programming** - Null checks and type validation
