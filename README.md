# Piece Table Plus

A piece table is a data structure that efficiently supports incremental text editing operations. It allows for the representation of a text document with minimal memory overhead and enables fast insertions and deletions.

> **This implementation is specifically designed for text editors and provides the core text manipulation capabilities needed for efficient document editing.**

### Features
* **Efficient Text Operations** : Uses two buffers (original and add) to minimize memory copying.

* **Line-based Operations** : Supports operations on lines, making it suitable for text editors.Cached line break positions for fast line/column conversions.

* **Undo/Redo Support** : Built-in snapshot system for implementing undo/redo.

* **Range Operations** : Support for selecting, replacing, and finding text ranges.

* **Memory Efficient** : Only stores references to text, not copies

## Performance Characteristics

* **Insert/Delete** : O(log n) time complexity where n is the number of pieces.

* **Text Retrieval** : O(log n + k) where k is the number of pieces in the range.

* **Character Access** : O(log n) for random access.

* **Line Operations** : O(log n) with caching for line-based operations.


## Installation

* **npm** :

    ```bash
    npm install piece-table-plus
    ```

* **yarn** :

    ```bash
    yarn add piece-table-plus
    ```

* **pnpm** :

    ```bash
    pnpm add piece-table-plus
    ```

* **bun** :

    ```bash
    bun install piece-table-plus
    ```


## Usage

### Importing the Library
You can import the Piece Table library in your JavaScript or TypeScript project using the following methods

* **CommonJS** : 

    ```javascript
    const { PieceTable } = require('piece-table-plus');
    ```

* **ES Modules** :

    ```javascript
    import {PieceTable} from 'piece-table-plus';
    ```

### Example
```javascript
import { PieceTable, UndoRedoManager } from 'piece-table-plus';

// Create a piece table with initial content
const pt = new PieceTable("Hello, World!\nThis is a test.");

// Create undo/redo manager
const undoRedo = new UndoRedoManager(pt);

console.log("Initial text:", pt.getText());
console.log("Length:", pt.length);
console.log("Line count:", pt.getLineCount());

// Insert text
undoRedo.saveState();
pt.insert(7, "beautiful ");
console.log("After insert:", pt.getText());

// Delete text
undoRedo.saveState();
pt.delete(0, 7);
console.log("After delete:", pt.getText());

// Replace text
undoRedo.saveState();
pt.replace(0, 9, "Greetings");
console.log("After replace:", pt.getText());

// Position/offset conversion
const pos = pt.offsetToPosition(10);
console.log("Position at offset 10:", pos);

const offset = pt.positionToOffset({ line: 1, column: 0 });
console.log("Offset at line 1, column 0:", offset);

// Find text
const results = pt.find("test");
console.log("Found 'test' at offsets:", results);

// Undo operations
console.log("Can undo:", undoRedo.canUndo());
undoRedo.undo();
console.log("After undo:", pt.getText());

undoRedo.undo();
console.log("After second undo:", pt.getText());

// Redo operations
console.log("Can redo:", undoRedo.canRedo());
undoRedo.redo();
console.log("After redo:", pt.getText());
```

