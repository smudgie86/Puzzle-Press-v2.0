// js/maze_generator.js
// Assumes utils.js might provide getRandomInt, but can fallback if needed.

/**
 * Internal random integer generator if the global one isn't available.
 */
function _mazeGetRandomIntInternal(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const _getRandInt = typeof getRandomInt === 'function' ? getRandomInt : _mazeGetRandomIntInternal;


/**
 * Generates a maze using the Recursive Backtracker algorithm.
 * @param {number} rows - Number of rows in the maze.
 * @param {number} cols - Number of columns in the maze.
 * @returns {object} { grid, solutionPath }
 *          grid: 2D array representing the maze. Each cell is an object:
 *                { r, c, walls: [top, right, bottom, left] (booleans), visitedDuringGen }
 *          solutionPath: Array of [r, c] coordinates for the solution from top-left to bottom-right.
 */
function generateMaze(rows, cols) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
        grid[r] = [];
        for (let c = 0; c < cols; c++) {
            grid[r][c] = { r, c, walls: [true, true, true, true], visitedDuringGen: false };
        }
    }

    const stack = [];
    let current = grid[0][0]; // Start at top-left
    current.visitedDuringGen = true;
    stack.push(current);

    function getUnvisitedNeighbors(cell) {
        const neighbors = [];
        const { r, c } = cell;
        // Top
        if (r > 0 && !grid[r - 1][c].visitedDuringGen) neighbors.push(grid[r - 1][c]);
        // Right
        if (c < cols - 1 && !grid[r][c + 1].visitedDuringGen) neighbors.push(grid[r][c + 1]);
        // Bottom
        if (r < rows - 1 && !grid[r + 1][c].visitedDuringGen) neighbors.push(grid[r + 1][c]);
        // Left
        if (c > 0 && !grid[r][c - 1].visitedDuringGen) neighbors.push(grid[r][c - 1]);
        
        // Shuffle neighbors to ensure randomness in path selection
        for (let i = neighbors.length - 1; i > 0; i--) {
            const j = _getRandInt(0, i);
            [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
        }
        return neighbors;
    }

    function removeWall(currentCell, nextCell) {
        const dr = currentCell.r - nextCell.r; // Change in row
        const dc = currentCell.c - nextCell.c; // Change in col

        if (dr === 1) { // nextCell is above currentCell
            currentCell.walls[0] = false; // Remove currentCell's top wall
            nextCell.walls[2] = false;    // Remove nextCell's bottom wall
        } else if (dr === -1) { // nextCell is below currentCell
            currentCell.walls[2] = false; // Remove currentCell's bottom wall
            nextCell.walls[0] = false;    // Remove nextCell's top wall
        }

        if (dc === 1) { // nextCell is to the left of currentCell
            currentCell.walls[3] = false; // Remove currentCell's left wall
            nextCell.walls[1] = false;    // Remove nextCell's right wall
        } else if (dc === -1) { // nextCell is to the right of currentCell
            currentCell.walls[1] = false; // Remove currentCell's right wall
            nextCell.walls[3] = false;    // Remove nextCell's left wall
        }
    }

    while (stack.length > 0) {
        current = stack[stack.length - 1]; // Peek
        const neighbors = getUnvisitedNeighbors(current);

        if (neighbors.length > 0) {
            const next = neighbors[0]; // Pick the first (now randomly selected due to shuffle in getUnvisitedNeighbors)
            removeWall(current, next);
            next.visitedDuringGen = true;
            stack.push(next);
        } else {
            stack.pop(); // Backtrack
        }
    }

    // --- Solve the maze from (0,0) to (rows-1, cols-1) using DFS ---
    const solutionPath = [];
    const visitedForSolve = Array.from({ length: rows }, () => Array(cols).fill(false));
    
    function findSolutionPathDFS(r, c) {
        if (r < 0 || r >= rows || c < 0 || c >= cols || visitedForSolve[r][c]) {
            return false; // Out of bounds or already visited in this path
        }
        visitedForSolve[r][c] = true;
        solutionPath.push([r, c]);

        if (r === rows - 1 && c === cols - 1) { // Reached the end (bottom-right)
            return true;
        }

        const cell = grid[r][c];
        // Attempt to move in a preferred order (e.g., Down, Right, Up, Left)
        // Can be randomized for different looking "main" solution paths if desired
        if (!cell.walls[2] && findSolutionPathDFS(r + 1, c)) return true; // Try Down
        if (!cell.walls[1] && findSolutionPathDFS(r, c + 1)) return true; // Try Right
        if (!cell.walls[0] && findSolutionPathDFS(r - 1, c)) return true; // Try Up
        if (!cell.walls[3] && findSolutionPathDFS(r, c - 1)) return true; // Try Left
        
        solutionPath.pop(); // Backtrack: no path from this cell
        return false;
    }

    findSolutionPathDFS(0, 0); // Find path from top-left to bottom-right

    return { grid, solutionPath };
}


/**
 * Draws a maze and optionally its solution path onto a canvas.
 * @param {Array} mazeGrid - The grid data from generateMaze.
 * @param {number} cellSizePx - The size of each cell in pixels for canvas rendering.
 * @param {Array} [solutionPathCoords] - Optional array of [r,c] for the solution path.
 * @param {string} [pathColor='#FF7070'] - Color for the solution path.
 * @param {string} [wallColor='black'] - Color for maze walls.
 * @param {string} [startMarkerColor='#70FF70'] - Color for start marker.
 * @param {string} [endMarkerColor='#7070FF'] - Color for end marker.
 * @returns {HTMLCanvasElement}
 */
function drawMazeCanvas(mazeGrid, cellSizePx, solutionPathCoords = null, 
                        pathColor = '#FF7070', wallColor = 'black', 
                        startMarkerColor = '#70FF70', endMarkerColor = '#7070FF') {
    if (!mazeGrid || !mazeGrid.length || !mazeGrid[0] || !mazeGrid[0].length) {
        console.error("Invalid mazeGrid provided to drawMazeCanvas");
        const canvas = document.createElement('canvas');
        canvas.width = cellSizePx * 5; 
        canvas.height = cellSizePx * 5;
        const ctx = canvas.getContext('2d');
        ctx.fillText("Error: Invalid Maze Data", 10, 20);
        return canvas;
    }

    const rows = mazeGrid.length;
    const cols = mazeGrid[0].length;
    const canvas = document.createElement('canvas');
    canvas.width = cols * cellSizePx + 2; // Add a little padding for line thickness at edges
    canvas.height = rows * cellSizePx + 2;
    const ctx = canvas.getContext('2d');
    ctx.translate(1, 1); // Offset drawing to accommodate line thickness

    ctx.fillStyle = 'white';
    ctx.fillRect(-1, -1, canvas.width, canvas.height); // Fill background

    // --- Draw Start and End markers (simple circles) ---
    const markerRadius = cellSizePx / 3.5;
    ctx.fillStyle = startMarkerColor;
    ctx.beginPath();
    ctx.arc(cellSizePx / 2, cellSizePx / 2, markerRadius, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = endMarkerColor;
    ctx.beginPath();
    ctx.arc((cols - 0.5) * cellSizePx, (rows - 0.5) * cellSizePx, markerRadius, 0, 2 * Math.PI);
    ctx.fill();


    // --- Draw Solution Path (if provided) ---
    if (solutionPathCoords && solutionPathCoords.length > 0) {
        ctx.strokeStyle = pathColor;
        ctx.lineWidth = Math.max(1, cellSizePx / 4.5); // Path line width
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(
            solutionPathCoords[0][1] * cellSizePx + cellSizePx / 2, // c * size + half_size
            solutionPathCoords[0][0] * cellSizePx + cellSizePx / 2  // r * size + half_size
        );
        for (let i = 1; i < solutionPathCoords.length; i++) {
            ctx.lineTo(
                solutionPathCoords[i][1] * cellSizePx + cellSizePx / 2,
                solutionPathCoords[i][0] * cellSizePx + cellSizePx / 2
            );
        }
        ctx.stroke();
    }

    // --- Draw Maze Walls ---
    ctx.strokeStyle = wallColor;
    // Wall thickness relative to cell size, ensuring it's at least 1px.
    const wallThickness = Math.max(1, Math.floor(cellSizePx / 12)); 
    ctx.lineWidth = wallThickness;
    ctx.beginPath(); // Start a new path for all walls for efficiency

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = mazeGrid[r][c];
            const x = c * cellSizePx;
            const y = r * cellSizePx;

            // Top wall: cell.walls[0]
            if (cell.walls[0]) { ctx.moveTo(x, y); ctx.lineTo(x + cellSizePx, y); }
            // Right wall: cell.walls[1]
            if (cell.walls[1]) { ctx.moveTo(x + cellSizePx, y); ctx.lineTo(x + cellSizePx, y + cellSizePx); }
            // Bottom wall: cell.walls[2]
            if (cell.walls[2]) { ctx.moveTo(x + cellSizePx, y + cellSizePx); ctx.lineTo(x, y + cellSizePx); }
            // Left wall: cell.walls[3]
            if (cell.walls[3]) { ctx.moveTo(x, y + cellSizePx); ctx.lineTo(x, y); }
        }
    }
    ctx.stroke(); // Draw all wall segments


    // --- Explicit Entry and Exit Openings (by clearing wall segments) ---
    // These are drawn AFTER all walls so they "erase" parts of the border.
    // The canvas clearRect was a bit problematic with line caps.
    // Instead, we'll effectively skip drawing these small segments of the outer border,
    // or draw white lines over them if direct PDF drawing needs similar.
    // For canvas, not drawing is cleaner.
    // The PDF rendering in the module handles entry/exit differently (by drawing white rects).
    // For the canvas version used in solutions, the start/end markers are usually sufficient visual cues.
    // If explicit openings are desired on the solution *canvas*, they'd be implemented by
    // adjusting the wall drawing loop to skip the entry/exit wall segments.
    // For now, the PDF module handles visual entry/exit for the main puzzle.

    return canvas;
}

console.log("maze_generator.js loaded");