// js/puzzle_modules/maze.js
// Assumes APP_CONFIG, utils.js, and maze_generator.js (generateMaze, drawMazeCanvas) are available.

const MazeModule = {
    type: 'maze',
    displayName: 'Maze',

    DEFAULTS: {
        numMazes: 20,
        mazeRows: 25, // Number of cells
        mazeCols: 18, // Number of cells
        // pdfCellSizePt: APP_CONFIG.MAZE_PDF_CELL_SIZE_PT || 15, // Default cell size in points for PDF rendering
                                                              // We'll use a value from APP_CONFIG
    },

    getConfigFormHTML(existingConfig = {}) {
        const config = { ...this.DEFAULTS, ...existingConfig };
        const pdfCellSizePt = config.pdfCellSizePt || APP_CONFIG.MAZE_PDF_CELL_SIZE_PT || 15; // Ensure fallback

        return `
            <div class="row">
                <label for="maze_displayName">Puzzle Group Display Name (Optional):</label>
                <input type="text" id="maze_displayName" value="${config.customDisplayName || ''}" placeholder="e.g., Challenging Mazes">
            </div>
            <div class="row">
                <label for="maze_numMazes">Number of Mazes:</label>
                <input type="number" id="maze_numMazes" value="${config.numMazes}" min="1" max="200">
            </div>
            <div class="row">
                <label for="maze_mazeRows">Maze Rows (cells):</label>
                <input type="number" id="maze_mazeRows" value="${config.mazeRows}" min="5" max="100">
            </div>
            <div class="row">
                <label for="maze_mazeCols">Maze Columns (cells):</label>
                <input type="number" id="maze_mazeCols" value="${config.mazeCols}" min="5" max="100">
            </div>
            <div class="row">
                <label for="maze_pdfCellSizePt">Maze Cell Size (PDF, in points):</label>
                <input type="number" id="maze_pdfCellSizePt" value="${pdfCellSizePt}" min="4" max="50">
                <small>Affects maze density on page. Default: ${APP_CONFIG.MAZE_PDF_CELL_SIZE_PT || 15}pt.</small>
            </div>
        `;
    },
    
    postProcessForm(formContainer) { /* No specific post-processing needed */ },

    parseConfigForm(formContainer) {
        const customDisplayName = formContainer.querySelector('#maze_displayName').value.trim();
        const numMazes = parseInt(formContainer.querySelector('#maze_numMazes').value, 10);
        const mazeRows = parseInt(formContainer.querySelector('#maze_mazeRows').value, 10);
        const mazeCols = parseInt(formContainer.querySelector('#maze_mazeCols').value, 10);
        const pdfCellSizePt = parseInt(formContainer.querySelector('#maze_pdfCellSizePt').value, 10);

        let validationError = null;
        if (isNaN(numMazes) || numMazes < 1) validationError = "Number of mazes must be at least 1.";
        if (isNaN(mazeRows) || mazeRows < 5) validationError = "Maze rows must be at least 5.";
        if (isNaN(mazeCols) || mazeCols < 5) validationError = "Maze columns must be at least 5.";
        if (isNaN(pdfCellSizePt) || pdfCellSizePt < 4 || pdfCellSizePt > 50) validationError = "PDF Cell Size must be between 4 and 50 points.";
        
        const config = {
            type: this.type, customDisplayName, numMazes,
            mazeRows, mazeCols, pdfCellSizePt
        };
        
        return {
            config,
            validationError,
            displayName: customDisplayName || `Mazes (${numMazes}x)`,
            summary: `${numMazes} mazes, ${mazeRows}x${mazeCols} cells. Cell size: ${pdfCellSizePt}pt.`
        };
    },

    async generatePuzzleContent(config, globalSettings) {
        const puzzlePagesData = [];
        const solutionsForThisModule = []; // Each item will be data for one maze solution

        for (let i = 0; i < config.numMazes; i++) {
            const mazeTitle = `${config.customDisplayName || 'Maze'} ${i + 1}`;
            
            // generateMaze from maze_generator.js
            const { grid: mazeGridData, solutionPath } = generateMaze(config.mazeRows, config.mazeCols);

            // For solution gallery, pre-render canvas with solution path
            // Cell size for canvas can be different from PDF, e.g., fixed for consistent preview quality
            const solutionCanvasCellSizePx = 20; // Or derive from APP_CONFIG
            const solutionCanvas = drawMazeCanvas(
                mazeGridData, 
                solutionCanvasCellSizePx, 
                solutionPath,
                APP_CONFIG.MAZE_SOLUTION_PATH_COLOR,
                APP_CONFIG.MAZE_WALL_COLOR,
                APP_CONFIG.MAZE_START_MARKER_COLOR,
                APP_CONFIG.MAZE_END_MARKER_COLOR
            );

            puzzlePagesData.push({
                type: 'maze_page', 
                title: mazeTitle,
                mazeGridData: mazeGridData, // Raw data for direct PDF rendering
                mazeSolutionPath: solutionPath, // Path for drawing solution, if needed directly on PDF (harder)
                pdfCellSizePt: config.pdfCellSizePt, // Cell size for this specific maze on PDF
                mazeDimensions: { rows: config.mazeRows, cols: config.mazeCols },
                prefersBleedBackground: true, // Mazes often look good with backgrounds
            });

            solutionsForThisModule.push({
                themeTitle: mazeTitle, // Use mazeTitle as themeTitle for consistency
                solutionCanvasDataUrl: solutionCanvas.toDataURL('image/png'),
                // No wordList for mazes
                // gridDimensions are implicitly defined by the canvas or maze config
                mazeDimensions: { rows: config.mazeRows, cols: config.mazeCols }, // Store for reference
            });
        }
        
        const solutionEntryData = {
            moduleInstanceTitle: config.customDisplayName || `Mazes`,
            themedSolutions: solutionsForThisModule, // Array of individual maze solutions
        };

        // No clue fitting warnings for mazes in this basic setup
        return { puzzlePagesData, solutionEntryData, warnings: null };
    },

    renderPuzzlePage(pdf, pageData, pageLayoutInfo, globalSettings, appConfig) {
        const { safeLayoutArea } = pageLayoutInfo;
        pdf.setFont(appConfig.PDF_FONT_FAMILY, 'normal');

        if (pageData.type === 'maze_page') {
            // --- Title ---
            pdf.setFontSize(appConfig.PDF_DEFAULT_TITLE_FONT_SIZE);
            pdf.text(
                pageData.title,
                safeLayoutArea.x + safeLayoutArea.w / 2,
                safeLayoutArea.y + appConfig.GRID_PAGE_TITLE_AREA_H_IN / 2 + pointsToInches(appConfig.PDF_DEFAULT_TITLE_FONT_SIZE * 0.35),
                { align: "center", maxWidth: safeLayoutArea.w * 0.95 }
            );

            // --- Maze Rendering ---
            const mazeGrid = pageData.mazeGridData;
            const mazeRows = pageData.mazeDimensions.rows;
            const mazeCols = pageData.mazeDimensions.cols;
            const userPdfCellSizePt = pageData.pdfCellSizePt;

            const contentYStart = safeLayoutArea.y + appConfig.GRID_PAGE_TITLE_AREA_H_IN;
            const availableMazeW_in = safeLayoutArea.w * 0.95; // Use 95% of safe width for some padding
            const availableMazeH_in = (safeLayoutArea.h - appConfig.GRID_PAGE_TITLE_AREA_H_IN) * 0.95;

            // Calculate initial maze size based on user's desired cell size
            let mazePdfCellSize_in = pointsToInches(userPdfCellSizePt);
            let mazePdfWidth_in = mazeCols * mazePdfCellSize_in;
            let mazePdfHeight_in = mazeRows * mazePdfCellSize_in;

            // Scale down if too large for available space, maintaining aspect ratio based on cell size
            const scaleFactorW = availableMazeW_in / mazePdfWidth_in;
            const scaleFactorH = availableMazeH_in / mazePdfHeight_in;
            const finalScaleFactor = Math.min(1.0, scaleFactorW, scaleFactorH); // Don't scale up beyond 100% of user's desired size

            const finalCellSize_in = mazePdfCellSize_in * finalScaleFactor;
            const finalMazeW_in = mazeCols * finalCellSize_in;
            const finalMazeH_in = mazeRows * finalCellSize_in;

            const mazeX_in = safeLayoutArea.x + (safeLayoutArea.w - finalMazeW_in) / 2; // Center in full safeLayoutArea.w
            const mazeY_in = contentYStart + (availableMazeH_in / 0.95 - finalMazeH_in) / 2; // Center in remaining height

            // --- Draw Maze Walls Directly on PDF ---
            pdf.setLineWidth(pointsToInches(Math.max(1, userPdfCellSizePt / 12))); // Wall thickness relative to original cell size
            pdf.setDrawColor(0); // Black walls

            for (let r = 0; r < mazeRows; r++) {
                for (let c = 0; c < mazeCols; c++) {
                    const cell = mazeGrid[r][c]; // { r, c, walls: [top, right, bottom, left], visited }
                    const x = mazeX_in + c * finalCellSize_in;
                    const y = mazeY_in + r * finalCellSize_in;

                    if (cell.walls[0]) pdf.line(x, y, x + finalCellSize_in, y); // Top wall
                    if (cell.walls[1]) pdf.line(x + finalCellSize_in, y, x + finalCellSize_in, y + finalCellSize_in); // Right wall
                    if (cell.walls[2]) pdf.line(x + finalCellSize_in, y + finalCellSize_in, x, y + finalCellSize_in); // Bottom wall
                    if (cell.walls[3]) pdf.line(x, y + finalCellSize_in, x, y); // Left wall
                }
            }

            // --- Draw Start/End Markers ---
            const markerRadius_in = finalCellSize_in / 3.5;
            pdf.setFillColor(appConfig.MAZE_START_MARKER_COLOR || '#70FF70');
            pdf.circle(mazeX_in + finalCellSize_in / 2, mazeY_in + finalCellSize_in / 2, markerRadius_in, 'F');
            
            pdf.setFillColor(appConfig.MAZE_END_MARKER_COLOR || '#7070FF');
            pdf.circle(mazeX_in + (mazeCols - 0.5) * finalCellSize_in, mazeY_in + (mazeRows - 0.5) * finalCellSize_in, markerRadius_in, 'F');

            // --- Define Entry/Exit by clearing part of outer walls ---
            pdf.setFillColor(255,255,255); // Use white to "erase" part of the wall line
            const wallThickness_in = pdf.getLineWidth(); // Get current line width

            // Entry at top-left (0,0): Clear part of its top wall
            pdf.rect(mazeX_in + wallThickness_in/2 , mazeY_in - wallThickness_in/2, finalCellSize_in - wallThickness_in, wallThickness_in, 'F');
            // Exit at bottom-right (rows-1, cols-1): Clear part of its bottom wall
            pdf.rect(mazeX_in + (mazeCols - 1) * finalCellSize_in + wallThickness_in/2, 
                     mazeY_in + mazeRows * finalCellSize_in - wallThickness_in/2, 
                     finalCellSize_in - wallThickness_in, wallThickness_in, 'F');
        }
    },

    renderSolutionEntry(pdf, solutionData, solutionCellLayout, globalSettings, appConfig) {
        // solutionData = { themeTitle, solutionCanvasDataUrl, mazeDimensions }
        pdf.setFont(appConfig.PDF_FONT_FAMILY, 'normal');
        const title = solutionData.themeTitle || "Solution";
        const canvasDataUrl = solutionData.solutionCanvasDataUrl; // Pre-rendered canvas with solution path

        const solutionItemTitleHeight = 0.25; // Slightly less space for title in solution gallery
        pdf.setFontSize(appConfig.PDF_SOLUTION_TITLE_FONT_SIZE - 1 > 5 ? appConfig.PDF_SOLUTION_TITLE_FONT_SIZE -1 : 6); // Smaller title
        pdf.text(title, solutionCellLayout.x + solutionCellLayout.w / 2, solutionCellLayout.y + solutionItemTitleHeight * 0.6, { align: "center", maxWidth: solutionCellLayout.w * 0.95 });
        
        const contentStartYInItemSlot = solutionCellLayout.y + solutionItemTitleHeight;
        const contentHeightInItemSlot = solutionCellLayout.h - solutionItemTitleHeight;
        const contentWidthInItemSlot = solutionCellLayout.w;
        
        // For mazes, the solution is just the image. Center it.
        if (canvasDataUrl) {
            // Estimate original canvas dimensions (e.g. solutionCanvasCellSizePx = 20)
            const solCanvasCellPx = 20; // Must match what was used in generatePuzzleContent
            const originalCanvasW_px = solutionData.mazeDimensions.cols * solCanvasCellPx;
            const originalCanvasH_px = solutionData.mazeDimensions.rows * solCanvasCellPx;

            const scale = Math.min(
                contentWidthInItemSlot / pointsToInches(originalCanvasW_px),
                contentHeightInItemSlot / pointsToInches(originalCanvasH_px)
            ) * (appConfig.SOLUTION_CANVAS_SCALE_FACTOR || 0.9);

            const solCanvasW_in = pointsToInches(originalCanvasW_px) * scale;
            const solCanvasH_in = pointsToInches(originalCanvasH_px) * scale;
            const solCanvasX_in = solutionCellLayout.x + (contentWidthInItemSlot - solCanvasW_in) / 2;
            const solCanvasY_in = contentStartYInItemSlot + (contentHeightInItemSlot - solCanvasH_in) / 2;
            
            try {
                pdf.addImage(canvasDataUrl, 'PNG', solCanvasX_in, solCanvasY_in, solCanvasW_in, solCanvasH_in);
            } catch (e) { 
                console.error("Error adding maze solution image:", e);
                pdf.text("[Solution Image Error]", solCanvasX_in, solCanvasY_in + 0.2);
            }
        } else {
            console.warn("Solution canvas data URL missing for maze:", title);
            pdf.text("[Solution N/A]", solutionCellLayout.x + contentWidthInItemSlot/2, contentStartYInItemSlot + contentHeightInItemSlot/2, {align:'center'});
        }
    }
};

window.PuzzleModules = window.PuzzleModules || {};
window.PuzzleModules.maze = MazeModule;
console.log("MazeModule loaded and registered.");