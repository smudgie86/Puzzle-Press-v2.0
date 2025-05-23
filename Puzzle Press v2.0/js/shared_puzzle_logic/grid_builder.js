// js/shared_puzzle_logic/grid_builder.js
// Common logic for building and drawing grids (word search, number search)
// Assumes APP_CONFIG and utils.js (shuffleArray, getRandomInt) are available.

const GridBuilder = {
    
    /**
     * Creates a blank grid.
     * @param {number} R - Rows.
     * @param {number} C - Columns.
     * @returns {Array<Array<string>>} - 2D array filled with spaces.
     */
    createBlankGrid(R, C) {
        return Array.from({ length: R }, () => Array(C).fill(" "));
    },

    /**
     * Attempts to place a single word/number string onto the grid.
     * @param {Array<Array<string>>} grid - The current grid.
     * @param {string} item - The word or number string to place.
     * @returns {Array<Array<number>> | null} - Array of [r, c] coordinates if placed, else null.
     */
    attemptItemPlacement(grid, item) {
        const R = grid.length;
        const C = grid[0].length;
        const directions = shuffleArray([ // From utils.js
            [1, 0], [-1, 0], [0, 1], [0, -1], // Horizontal, Vertical
            [1, 1], [1, -1], [-1, 1], [-1, -1]  // Diagonal
        ]);
        const startPositions = shuffleArray(
            Array.from({ length: R * C }, (_, i) => [Math.floor(i / C), i % C])
        );

        for (const [dy, dx] of directions) { // Note: dy for row change, dx for col change
            for (const [r0, c0] of startPositions) {
                let isValidPlacement = true;
                const points = [];
                for (let k = 0; k < item.length; k++) {
                    const r = r0 + dy * k;
                    const c = c0 + dx * k;
                    if (
                        r < 0 || c < 0 || r >= R || c >= C ||
                        (grid[r][c] !== " " && grid[r][c] !== item[k])
                    ) {
                        isValidPlacement = false;
                        break;
                    }
                    points.push([r, c]);
                }
                if (isValidPlacement) {
                    points.forEach(([r, c], i) => (grid[r][c] = item[i]));
                    return points;
                }
            }
        }
        return null;
    },

    /**
     * Fills empty cells in the grid with random letters.
     * @param {Array<Array<string>>} grid - The grid to fill.
     */
    fillRandomLetters(grid) {
        grid.forEach((row) =>
            row.forEach((val, i, arr) => {
                if (val === " ") {
                    arr[i] = APP_CONFIG.ALPHA[Math.floor(Math.random() * APP_CONFIG.ALPHA.length)];
                }
            })
        );
    },

    /**
     * Fills empty cells in the grid with random digits.
     * @param {Array<Array<string>>} grid - The grid to fill.
     */
    fillRandomDigits(grid) {
        grid.forEach((row) =>
            row.forEach((val, i, arr) => {
                if (val === " ") {
                    arr[i] = APP_CONFIG.DIGITS[getRandomInt(0, APP_CONFIG.DIGITS.length - 1)]; // From utils.js
                }
            })
        );
    },

    /**
     * Builds a word/number search puzzle grid.
     * @param {Array<string>} itemsToPlace - Array of strings (words or numbers).
     * @param {number} R - Rows.
     * @param {number} C - Columns.
     * @param {string} fillType - 'letters' or 'digits'.
     * @returns {{grid: Array<Array<string>>, positions: object} | null} - Grid data or null if failed.
     *         positions: { item: [[r,c], [r,c]...], ... }
     */
    buildGrid(itemsToPlace, R, C, fillType = 'letters') {
        for (let attempt = 0; attempt < APP_CONFIG.MAX_PUZZLE_BUILD_ATTEMPTS; attempt++) {
            const grid = this.createBlankGrid(R, C);
            const positions = {};
            let allItemsPlaced = true;
            // Sort items by length, longest first, to improve placement success.
            // Make a copy before sorting to not modify original config array.
            const sortedItems = [...itemsToPlace].sort((a, b) => b.length - a.length);

            for (const item of sortedItems) {
                if (!item || typeof item !== 'string' || item.trim() === '') continue; // Skip empty items
                const placedCoords = this.attemptItemPlacement(grid, item);
                if (!placedCoords) {
                    allItemsPlaced = false;
                    // console.warn(`Failed to place item: "${item}" on attempt ${attempt + 1}`);
                    break;
                }
                positions[item] = placedCoords;
            }

            if (allItemsPlaced) {
                if (fillType === 'letters') {
                    this.fillRandomLetters(grid);
                } else if (fillType === 'digits') {
                    this.fillRandomDigits(grid);
                }
                return { grid, positions };
            }
        }
        console.error(`Failed to build grid after ${APP_CONFIG.MAX_PUZZLE_BUILD_ATTEMPTS} attempts with ${itemsToPlace.length} items.`);
        return null; // Failed to place all items
    },

    /**
     * Draws a grid (word/number search) onto a canvas.
     * @param {Array<Array<string>>} gridData - The 2D array of characters/digits.
     * @param {Array<Array<Array<number>>> | null} highlightCoordsArray - Optional. An array of paths (each path is an array of [r,c] coords) to highlight.
     * @param {object} options - Optional drawing options.
     * @param {number} options.cellSizePx - Default APP_CONFIG.DEFAULT_GRID_CELL_SIZE_PX.
     * @param {string} options.font - Default APP_CONFIG.DEFAULT_GRID_FONT.
     * @param {string} options.highlightColor - Default 'gold'.
     * @param {number} options.highlightWidthFactor - Factor of cellSizePx for highlight line width (e.g., 0.5).
     * @returns {HTMLCanvasElement}
     */
    drawGridOnCanvas(gridData, highlightCoordsArray = null, options = {}) {
        if (!gridData || gridData.length === 0 || gridData[0].length === 0) {
            console.error("drawGridOnCanvas: Invalid gridData provided.");
            const errCanvas = document.createElement("canvas"); errCanvas.width = 100; errCanvas.height = 50;
            const errCtx = errCanvas.getContext('2d'); errCtx.fillText("Error: No Grid Data", 5, 25);
            return errCanvas;
        }
        const R = gridData.length;
        const C = gridData[0].length;

        const cellSizePx = options.cellSizePx || APP_CONFIG.DEFAULT_GRID_CELL_SIZE_PX;
        const font = options.font || APP_CONFIG.DEFAULT_GRID_FONT;
        const highlightColor = options.highlightColor || 'gold';
        const highlightWidthFactor = options.highlightWidthFactor || 0.5;
        
        const canvas = document.createElement("canvas");
        canvas.width = C * cellSizePx;
        canvas.height = R * cellSizePx;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#FFF"; // Background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw highlights (solution paths)
        if (highlightCoordsArray && highlightCoordsArray.length > 0) {
            ctx.strokeStyle = highlightColor;
            ctx.lineWidth = cellSizePx * highlightWidthFactor;
            ctx.lineCap = "round";
            highlightCoordsArray.forEach((coords) => {
                if (!coords || coords.length < 2) return; // Path needs at least 2 points for a line
                const [r1, c1] = coords[0];
                const [r2, c2] = coords[coords.length - 1]; // Line from first to last point of the path
                ctx.beginPath();
                ctx.moveTo(c1 * cellSizePx + cellSizePx / 2, r1 * cellSizePx + cellSizePx / 2);
                ctx.lineTo(c2 * cellSizePx + cellSizePx / 2, r2 * cellSizePx + cellSizePx / 2);
                ctx.stroke();
            });
        }

        // Draw grid lines and characters
        ctx.strokeStyle = "#CCC"; // Grid lines color
        ctx.lineWidth = 1;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = font;
        ctx.fillStyle = "#000"; // Character color

        gridData.forEach((row, r) => {
            row.forEach((char, c) => {
                ctx.strokeRect(c * cellSizePx, r * cellSizePx, cellSizePx, cellSizePx);
                ctx.fillText(char, c * cellSizePx + cellSizePx / 2, r * cellSizePx + cellSizePx / 2);
            });
        });
        return canvas;
    }
};

console.log("shared_puzzle_logic/grid_builder.js loaded");