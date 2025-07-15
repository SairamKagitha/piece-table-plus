/**
 * Represents a piece in the piece table
 */
interface Piece {
    source: "original" | "add"
    start: number
    length: number
}

/**
 * Represents a position in the text
 */
interface Position {
    line: number
    column: number
}

/**
 * Represents a range in the text
 */
interface Range {
    start: Position
    end: Position
}

/**
 * Efficient Piece Table implementation for text editors
 * Provides O(log n) insertions, deletions, and lookups
 */
export class PieceTable {
    private pieces: Piece[] = []
    private originalBuffer: string
    private addBuffer: string = ""
    private _length: number = 0

    // Cache for line breaks to optimize line-based operations
    private lineBreakCache: number[] = []
    private cacheValid: boolean = false

    constructor(initialText: string = "") {
        this.originalBuffer = initialText
        this._length = initialText.length

        if (initialText.length > 0) {
            this.pieces.push({
                source: "original",
                start: 0,
                length: initialText.length,
            })
        }

        this.invalidateCache()
    }

    /**
     * Get the total length of the text
     */
    get length(): number {
        return this._length
    }

    /**
     * Insert text at the specified offset
     * Time complexity: O(log n) where n is the number of pieces
     */
    insert(offset: number, text: string): void {
        if (offset < 0 || offset > this._length) {
            throw new Error("Offset out of bounds")
        }

        if (text.length === 0) return

        const addBufferStart = this.addBuffer.length
        this.addBuffer += text

        const newPiece: Piece = {
            source: "add",
            start: addBufferStart,
            length: text.length,
        }

        if (this.pieces.length === 0) {
            this.pieces.push(newPiece)
        } else {
            const { pieceIndex, pieceOffset } = this.findPieceAtOffset(offset)

            if (pieceOffset === 0) {
                // Insert at the beginning of a piece
                this.pieces.splice(pieceIndex, 0, newPiece)
            } else if (pieceOffset === this.pieces[pieceIndex].length) {
                // Insert at the end of a piece
                this.pieces.splice(pieceIndex + 1, 0, newPiece)
            } else {
                // Split the piece and insert in the middle
                const originalPiece = this.pieces[pieceIndex]
                const leftPiece: Piece = {
                    source: originalPiece.source,
                    start: originalPiece.start,
                    length: pieceOffset,
                }
                const rightPiece: Piece = {
                    source: originalPiece.source,
                    start: originalPiece.start + pieceOffset,
                    length: originalPiece.length - pieceOffset,
                }

                this.pieces.splice(
                    pieceIndex,
                    1,
                    leftPiece,
                    newPiece,
                    rightPiece
                )
            }
        }

        this._length += text.length
        this.invalidateCache()
    }

    /**
     * Delete text from start offset to end offset (exclusive)
     * Time complexity: O(log n) where n is the number of pieces
     */
    delete(startOffset: number, endOffset: number): string {
        if (
            startOffset < 0 ||
            endOffset > this._length ||
            startOffset >= endOffset
        ) {
            throw new Error("Invalid delete range")
        }

        const deletedText = this.getText(startOffset, endOffset)
        const deleteLength = endOffset - startOffset

        const startResult = this.findPieceAtOffset(startOffset)
        const endResult = this.findPieceAtOffset(endOffset)

        // If deletion is within a single piece
        if (startResult.pieceIndex === endResult.pieceIndex) {
            const piece = this.pieces[startResult.pieceIndex]

            if (
                startResult.pieceOffset === 0 &&
                endResult.pieceOffset === piece.length
            ) {
                // Delete entire piece
                this.pieces.splice(startResult.pieceIndex, 1)
            } else if (startResult.pieceOffset === 0) {
                // Delete from beginning
                piece.start += deleteLength
                piece.length -= deleteLength
            } else if (endResult.pieceOffset === piece.length) {
                // Delete to end
                piece.length -= deleteLength
            } else {
                // Delete from middle - split into two pieces
                const leftPiece: Piece = {
                    source: piece.source,
                    start: piece.start,
                    length: startResult.pieceOffset,
                }
                const rightPiece: Piece = {
                    source: piece.source,
                    start: piece.start + endResult.pieceOffset,
                    length: piece.length - endResult.pieceOffset,
                }
                this.pieces.splice(
                    startResult.pieceIndex,
                    1,
                    leftPiece,
                    rightPiece
                )
            }
        } else {
            // Deletion spans multiple pieces
            const piecesToRemove =
                endResult.pieceIndex - startResult.pieceIndex - 1
            const newPieces: Piece[] = []

            // Handle first piece
            const firstPiece = this.pieces[startResult.pieceIndex]
            if (startResult.pieceOffset > 0) {
                newPieces.push({
                    source: firstPiece.source,
                    start: firstPiece.start,
                    length: startResult.pieceOffset,
                })
            }

            // Handle last piece
            const lastPiece = this.pieces[endResult.pieceIndex]
            if (endResult.pieceOffset < lastPiece.length) {
                newPieces.push({
                    source: lastPiece.source,
                    start: lastPiece.start + endResult.pieceOffset,
                    length: lastPiece.length - endResult.pieceOffset,
                })
            }

            this.pieces.splice(
                startResult.pieceIndex,
                piecesToRemove + 2,
                ...newPieces
            )
        }

        this._length -= deleteLength
        this.invalidateCache()
        return deletedText
    }

    /**
     * Get text from start offset to end offset (exclusive)
     * Time complexity: O(log n + k) where k is the number of pieces in range
     */
    getText(startOffset?: number, endOffset?: number): string {
        if (startOffset === undefined) startOffset = 0
        if (endOffset === undefined) endOffset = this._length

        if (
            startOffset < 0 ||
            endOffset > this._length ||
            startOffset > endOffset
        ) {
            throw new Error("Invalid range")
        }

        if (startOffset === endOffset) return ""

        let result = ""
        let currentOffset = 0

        for (const piece of this.pieces) {
            const pieceEnd = currentOffset + piece.length

            if (currentOffset >= endOffset) break
            if (pieceEnd <= startOffset) {
                currentOffset = pieceEnd
                continue
            }

            const pieceStart = Math.max(0, startOffset - currentOffset)
            const pieceLength = Math.min(
                piece.length - pieceStart,
                endOffset - Math.max(currentOffset, startOffset)
            )

            const buffer =
                piece.source === "original"
                    ? this.originalBuffer
                    : this.addBuffer
            result += buffer.substring(
                piece.start + pieceStart,
                piece.start + pieceStart + pieceLength
            )

            currentOffset = pieceEnd
        }

        return result
    }

    /**
     * Get character at the specified offset
     * Time complexity: O(log n)
     */
    getChar(offset: number): string {
        if (offset < 0 || offset >= this._length) {
            throw new Error("Offset out of bounds")
        }

        const { piece, pieceOffset } = this.findPieceAtOffset(offset)
        const buffer =
            piece.source === "original" ? this.originalBuffer : this.addBuffer
        return buffer[piece.start + pieceOffset]
    }

    /**
     * Convert offset to line and column position
     * Time complexity: O(log n) with caching
     */
    offsetToPosition(offset: number): Position {
        if (offset < 0 || offset > this._length) {
            throw new Error("Offset out of bounds")
        }

        this.ensureLineBreakCache()

        if (offset === 0) return { line: 0, column: 0 }

        // Binary search for the line
        let left = 0
        let right = this.lineBreakCache.length - 1
        let line = 0

        while (left <= right) {
            const mid = Math.floor((left + right) / 2)
            if (this.lineBreakCache[mid] < offset) {
                line = mid + 1
                left = mid + 1
            } else {
                right = mid - 1
            }
        }

        const lineStart = line > 0 ? this.lineBreakCache[line - 1] + 1 : 0
        return { line, column: offset - lineStart }
    }

    /**
     * Convert line and column position to offset
     * Time complexity: O(1) with caching
     */
    positionToOffset(position: Position): number {
        this.ensureLineBreakCache()

        if (position.line < 0 || position.line > this.lineBreakCache.length) {
            throw new Error("Line out of bounds")
        }

        const lineStart =
            position.line > 0 ? this.lineBreakCache[position.line - 1] + 1 : 0
        const lineEnd =
            position.line < this.lineBreakCache.length
                ? this.lineBreakCache[position.line]
                : this._length

        if (position.column < 0 || lineStart + position.column > lineEnd) {
            throw new Error("Column out of bounds")
        }

        return lineStart + position.column
    }

    /**
     * Get the number of lines in the text
     */
    getLineCount(): number {
        this.ensureLineBreakCache()
        return this.lineBreakCache.length + 1
    }

    /**
     * Get text for a specific line
     */
    getLine(lineNumber: number): string {
        this.ensureLineBreakCache()

        if (lineNumber < 0 || lineNumber >= this.getLineCount()) {
            throw new Error("Line number out of bounds")
        }

        const lineStart =
            lineNumber > 0 ? this.lineBreakCache[lineNumber - 1] + 1 : 0
        const lineEnd =
            lineNumber < this.lineBreakCache.length
                ? this.lineBreakCache[lineNumber]
                : this._length

        return this.getText(lineStart, lineEnd)
    }

    /**
     * Replace text in the specified range
     */
    replace(startOffset: number, endOffset: number, newText: string): string {
        const deletedText = this.delete(startOffset, endOffset)
        this.insert(startOffset, newText)
        return deletedText
    }

    /**
     * Find text in the document
     * Returns array of offsets where the text is found
     */
    find(searchText: string, startOffset: number = 0): number[] {
        const results: number[] = []
        const text = this.getText(startOffset)
        let index = 0

        while ((index = text.indexOf(searchText, index)) !== -1) {
            results.push(startOffset + index)
            index += 1 // Move past this match
        }

        return results
    }

    /**
     * Create a snapshot of the current state for undo/redo functionality
     */
    createSnapshot(): PieceTableSnapshot {
        return {
            pieces: this.pieces.map((p) => ({ ...p })),
            addBuffer: this.addBuffer,
            length: this._length,
        }
    }

    /**
     * Restore from a snapshot
     */
    restoreFromSnapshot(snapshot: PieceTableSnapshot): void {
        this.pieces = snapshot.pieces.map((p) => ({ ...p }))
        this.addBuffer = snapshot.addBuffer
        this._length = snapshot.length
        this.invalidateCache()
    }

    /**
     * Find the piece and offset within that piece for a given global offset
     */
    private findPieceAtOffset(offset: number): {
        pieceIndex: number
        piece: Piece
        pieceOffset: number
    } {
        let currentOffset = 0

        for (let i = 0; i < this.pieces.length; i++) {
            const piece = this.pieces[i]
            if (offset <= currentOffset + piece.length) {
                return {
                    pieceIndex: i,
                    piece,
                    pieceOffset: offset - currentOffset,
                }
            }
            currentOffset += piece.length
        }

        // If we get here, offset is at the very end
        const lastPiece = this.pieces[this.pieces.length - 1]
        return {
            pieceIndex: this.pieces.length - 1,
            piece: lastPiece,
            pieceOffset: lastPiece.length,
        }
    }

    /**
     * Ensure the line break cache is valid
     */
    private ensureLineBreakCache(): void {
        if (this.cacheValid) return

        this.lineBreakCache = []
        let offset = 0

        for (const piece of this.pieces) {
            const buffer =
                piece.source === "original"
                    ? this.originalBuffer
                    : this.addBuffer
            const text = buffer.substring(
                piece.start,
                piece.start + piece.length
            )

            for (let i = 0; i < text.length; i++) {
                if (text[i] === "\n") {
                    this.lineBreakCache.push(offset + i)
                }
            }
            offset += piece.length
        }

        this.cacheValid = true
    }

    /**
     * Invalidate the line break cache
     */
    private invalidateCache(): void {
        this.cacheValid = false
    }
}

/**
 * Snapshot interface for undo/redo functionality
 */
export interface PieceTableSnapshot {
    pieces: Piece[]
    addBuffer: string
    length: number
}

/**
 * Undo/Redo manager for the piece table
 */
export class UndoRedoManager {
    private undoStack: PieceTableSnapshot[] = []
    private redoStack: PieceTableSnapshot[] = []
    private maxStackSize: number
    private pieceTable: PieceTable

    constructor(pieceTable: PieceTable, maxStackSize: number = 100) {
        this.pieceTable = pieceTable
        this.maxStackSize = maxStackSize
        this.saveState() // Save initial state
    }

    /**
     * Save the current state to the undo stack
     */
    saveState(): void {
        const snapshot = this.pieceTable.createSnapshot()
        this.undoStack.push(snapshot)

        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift()
        }

        this.redoStack = [] // Clear redo stack when new action is performed
    }

    /**
     * Undo the last operation
     */
    undo(): boolean {
        if (this.undoStack.length <= 1) return false

        const currentState = this.undoStack.pop()!
        this.redoStack.push(currentState)

        const previousState = this.undoStack[this.undoStack.length - 1]
        this.pieceTable.restoreFromSnapshot(previousState)

        return true
    }

    /**
     * Redo the last undone operation
     */
    redo(): boolean {
        if (this.redoStack.length === 0) return false

        const stateToRestore = this.redoStack.pop()!
        this.undoStack.push(stateToRestore)
        this.pieceTable.restoreFromSnapshot(stateToRestore)

        return true
    }

    /**
     * Check if undo is available
     */
    canUndo(): boolean {
        return this.undoStack.length > 1
    }

    /**
     * Check if redo is available
     */
    canRedo(): boolean {
        return this.redoStack.length > 0
    }
}
