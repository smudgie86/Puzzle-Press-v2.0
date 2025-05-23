// js/puzzle_modules/anagram_wordsearch.js
// Assumes APP_CONFIG, utils.js (shuffleArray, sanitizeForGrid), GridBuilder, Papa are available.

const AnagramWordSearchModule = {
  type: "anagram_wordsearch",
  displayName: "Anagram Word Search",

  DEFAULTS: {
    themeColumnName: "Puzzle Theme",
    wordColumnName: "Word",
    gridRows: 30, // Default grid size, can be overridden
    gridCols: 25,
  },

  // Called by App.js to get the HTML for the modal configuration form
  getConfigFormHTML(existingConfig = {}) {
    const config = { ...this.DEFAULTS, ...existingConfig };
    // Note: CSV upload will be handled slightly differently.
    // The module will parse the CSV when `generatePuzzleContent` is called, using the `csvData` from config.
    return `
            <div class="row">
                <label for="aws_displayName">Puzzle Display Name (Optional):</label>
                <input type="text" id="aws_displayName" value="${
                  config.customDisplayName || ""
                }" placeholder="e.g., Animals Anagrams">
            </div>
            <div class="row">
                <label for="aws_themeColumn">Theme Column (CSV Header):</label>
                <input type="text" id="aws_themeColumn" value="${
                  config.themeColumnName
                }">
            </div>
            <div class="row">
                <label for="aws_wordColumn">Word/Phrase Column (CSV Header):</label>
                <input type="text" id="aws_wordColumn" value="${
                  config.wordColumnName
                }">
            </div>
            <div class="row">
                <label for="aws_csvInput" class="csv-upload-label">Upload CSV with Anagrams:</label>
                <input type="file" id="aws_csvInput" accept=".csv">
                <small>Each row should represent a word for a theme. Theme column groups words.</small>
            </div>
            <div class="row">
                <label for="aws_gridRows">Grid Rows:</label>
                <input type="number" id="aws_gridRows" value="${
                  config.gridRows
                }" min="5" max="50">
            </div>
            <div class="row">
                <label for="aws_gridCols">Grid Columns:</label>
                <input type="number" id="aws_gridCols" value="${
                  config.gridCols
                }" min="5" max="50">
            </div>
            <div id="aws_csvFeedback" class="status-info" style="margin-top:10px; padding:5px; border:1px dashed #ccc; display:none;"></div>
            ${
              existingConfig.csvFileName
                ? `<p>Previously uploaded: ${existingConfig.csvFileName} (${existingConfig.csvRowCount} rows)</p>`
                : ""
            }
        `;
  },

  // Called by App.js after HTML is injected into modal, for any dynamic setup
  postProcessForm(formContainer) {
    const csvInput = formContainer.querySelector("#aws_csvInput");
    const csvFeedback = formContainer.querySelector("#aws_csvFeedback");
    if (csvInput && csvFeedback) {
      csvInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
          csvFeedback.textContent = `Selected: ${file.name}`;
          csvFeedback.style.display = "block";
        } else {
          csvFeedback.style.display = "none";
        }
      });
    }
  },

  // Called by App.js to parse the form data from the modal
  parseConfigForm(formContainer) {
    const themeColumnName = formContainer
      .querySelector("#aws_themeColumn")
      .value.trim();
    const wordColumnName = formContainer
      .querySelector("#aws_wordColumn")
      .value.trim();
    const customDisplayName = formContainer
      .querySelector("#aws_displayName")
      .value.trim();
    const gridRows = parseInt(
      formContainer.querySelector("#aws_gridRows").value,
      10
    );
    const gridCols = parseInt(
      formContainer.querySelector("#aws_gridCols").value,
      10
    );
    const csvInput = formContainer.querySelector("#aws_csvInput");
    const file = csvInput.files[0];

    let validationError = null;
    if (!themeColumnName) validationError = "Theme column name is required.";
    if (!wordColumnName)
      validationError = "Word/Phrase column name is required.";
    if (isNaN(gridRows) || gridRows < 5 || gridRows > 50)
      validationError = "Grid rows must be between 5 and 50.";
    if (isNaN(gridCols) || gridCols < 5 || gridCols > 50)
      validationError = "Grid columns must be between 5 and 50.";
    // If editing and no new file is provided, we might keep the old CSV data.
    // This requires App.js to pass existing config data to getConfigFormHTML and handle persistence.
    // For now, a new CSV is expected if adding. If editing, this needs more robust handling of existing data.

    const config = {
      type: this.type,
      themeColumnName,
      wordColumnName,
      gridRows,
      gridCols,
      csvFile: file, // Store the File object
      csvFileName: file
        ? file.name
        : formContainer.dataset.existingCsvName || null, // Keep track of filename
      // csvRawData: null, // Will be populated later if file is processed
      customDisplayName: customDisplayName,
    };

    // For edit mode, if no new file is uploaded, we should retain the previous CSV data.
    // This logic is tricky. The form should indicate if previous data is being used.
    // For now, if 'file' is null and we are editing, it implies 'use existing'.
    // The main App logic will need to store the actual CSV data (e.g., parsed rows)
    // if it's intended to be reused across edits without re-upload.
    // Let's assume for now that `generatePuzzleContent` will handle the CSV.

    return {
      config,
      validationError,
      displayName: customDisplayName || `Anagram WS (${gridRows}x${gridCols})`,
      summary: `Themes from '${themeColumnName}', Words from '${wordColumnName}'. Grid: ${gridRows}x${gridCols}. CSV: ${
        file ? file.name : config.csvFileName || "Not set"
      }`,
    };
  },

  // Called by App.js to generate the actual puzzle content for the PDF
  // This can be async if it involves file parsing.
  async generatePuzzleContent(config, globalSettings) {
    if (!config.csvFile && !config.csvRawData) {
      // csvRawData could be passed if re-editing
      throw new Error("No CSV file provided for Anagram Word Search.");
    }

    let csvDataRows;
    if (config.csvFile) {
      try {
        const result = await new Promise((resolve, reject) =>
          Papa.parse(config.csvFile, {
            header: true,
            skipEmptyLines: true,
            complete: resolve,
            error: reject,
          })
        );
        csvDataRows = result.data;
        config.csvRowCount = csvDataRows.length; // Store for summary if needed
      } catch (error) {
        console.error("Error parsing CSV:", error);
        throw new Error(`Error parsing CSV: ${error.message}`);
      }
    } else if (config.csvRawData) {
      // If raw data was passed (e.g. from a previous parse during edit)
      csvDataRows = config.csvRawData;
    } else {
      throw new Error("CSV data missing.");
    }

    const puzzlesMap = new Map();
    csvDataRows.forEach((row) => {
      const theme = (
        String(row[config.themeColumnName]) || "Untitled Anagram Puzzle"
      ).trim();
      const originalPhrase = (String(row[config.wordColumnName]) || "")
        .trim()
        .toUpperCase();
      if (!originalPhrase) return;

      const scrambleWord = (s) =>
        s
          .split("")
          .sort(() => Math.random() - 0.5)
          .join("");
      const anagramClue = originalPhrase
        .split(/\s+/)
        .map(scrambleWord)
        .join(" ");
      const gridWord = sanitizeForGrid(originalPhrase); // From utils.js
      if (!gridWord) return;

      if (!puzzlesMap.has(theme)) {
        puzzlesMap.set(theme, {
          clues: [], // Anagrams to be listed
          wordsForSolution: [], // Original phrases (answers)
          wordsForGrid: [], // Sanitized words for placing in grid
        });
      }
      const entry = puzzlesMap.get(theme);
      entry.clues.push(anagramClue);
      entry.wordsForSolution.push(originalPhrase);
      entry.wordsForGrid.push(gridWord);
    });

    if (puzzlesMap.size === 0) {
      throw new Error(
        "No valid puzzles found in CSV data. Check column names and content."
      );
    }

    const puzzlePagesData = []; // Array of page layouts for this module's content
    const solutionEntryData = {}; // Data for the solutions gallery for this module's content (can be complex)

    // For Anagram WS, each theme from the CSV becomes a "puzzle" (clue page + grid page)
    // And each theme will have one entry in the solution gallery.

    const solutionsForThisModule = [];

    for (const [theme, data] of puzzlesMap.entries()) {
      if (data.wordsForGrid.length === 0) continue;

      const gridDetails = GridBuilder.buildGrid(
        data.wordsForGrid,
        config.gridRows,
        config.gridCols,
        "letters"
      );
      if (!gridDetails) {
        console.warn(
          `Failed to build grid for Anagram theme: "${theme}". Skipping this theme.`
        );
        // Optionally, you could throw an error to stop the whole book generation
        // or collect warnings to show the user. For now, we skip.
        continue;
      }

      const gridCanvas = GridBuilder.drawGridOnCanvas(gridDetails.grid, null);
      const solutionCanvas = GridBuilder.drawGridOnCanvas(
        gridDetails.grid,
        Object.values(gridDetails.positions)
      );

      // Define page layouts for this theme
      puzzlePagesData.push({
        type: "clues_page", // Identifies the renderer needed
        title: theme,
        clues: data.clues, // Anagrams
        prefersBleedBackground: true, // Example preference
      });
      puzzlePagesData.push({
        type: "grid_page", // Identifies the renderer needed
        title: theme,
        gridCanvasDataUrl: gridCanvas.toDataURL("image/png"),
        gridDimensions: { rows: config.gridRows, cols: config.gridCols },
        prefersBleedBackground: false,
      });

      // Collect data for the solution gallery entry for this theme
      solutionsForThisModule.push({
        themeTitle: theme,
        solutionCanvasDataUrl: solutionCanvas.toDataURL("image/png"),
        wordList: data.wordsForSolution, // Original words (answers)
        gridDimensions: { rows: config.gridRows, cols: config.gridCols }, // << ADD THIS
      });
    }

    // The overall solution entry for this *module instance* (which might cover multiple themes)
    // This is what gets passed to renderSolutionEntry.
    // If one CSV can generate multiple puzzles (themes), the solution entry groups them.
    solutionEntryData.moduleInstanceTitle =
      config.customDisplayName ||
      `Anagram Word Searches (from ${config.csvFileName || "CSV"})`;
    solutionEntryData.themedSolutions = solutionsForThisModule;

    return { puzzlePagesData, solutionEntryData };
  },

  // Called by App.js to render a single puzzle page (clue or grid)
  renderPuzzlePage(pdf, pageData, pageLayoutInfo, globalSettings, appConfig) {
    const {
      safeLayoutArea,
      actualPageW_in,
      actualPageH_in,
      puzzleDisplayName,
    } = pageLayoutInfo;
    pdf.setFont(appConfig.PDF_FONT_FAMILY, "normal");

    if (pageData.type === "clues_page") {
      // --- Title Strip ---
      // (This part already draws a white background for the title strip itself)
      pdf.setFillColor(255, 255, 255);
      pdf.rect(
        safeLayoutArea.x,
        safeLayoutArea.y,
        safeLayoutArea.w,
        appConfig.CLUE_PAGE_TITLE_STRIP_H_IN,
        "F"
      );
      pdf.setFontSize(appConfig.PDF_CLUE_PAGE_TITLE_FONT_SIZE);
      pdf.text(
        pageData.title,
        safeLayoutArea.x + safeLayoutArea.w / 2,
        safeLayoutArea.y +
          appConfig.CLUE_PAGE_TITLE_STRIP_H_IN / 2 +
          pointsToInches(appConfig.PDF_CLUE_PAGE_TITLE_FONT_SIZE * 0.35),
        { align: "center" }
      );

      // --- Clue List Area ---
      const clueListOuterStartY =
        safeLayoutArea.y + appConfig.CLUE_PAGE_TITLE_STRIP_H_IN + 0.05; // Small gap from title
      const clueListOuterAvailableHeight =
        safeLayoutArea.h - (clueListOuterStartY - safeLayoutArea.y);

      pdf.setFontSize(appConfig.PDF_CLUE_FONT_SIZE);
      const rowH = appConfig.CLUE_ROW_H_IN;
      const padX = appConfig.CLUE_CELL_PAD_X_IN;
      const numClues = pageData.clues.length;

      // Calculate the actual height the clues table will occupy
      const maxPossibleCluesInHeight = Math.floor(
        clueListOuterAvailableHeight / rowH
      );
      const actualNumCluesToDisplay = Math.min(
        numClues,
        maxPossibleCluesInHeight
      );
      const actualCluesTableHeight = actualNumCluesToDisplay * rowH;

      // Determine where the clue table starts vertically (try to center if space allows)
      let actualClueTableRenderStartY = clueListOuterStartY;
      if (
        actualCluesTableHeight < clueListOuterAvailableHeight &&
        actualCluesTableHeight > 0
      ) {
        actualClueTableRenderStartY +=
          (clueListOuterAvailableHeight - actualCluesTableHeight) / 2;
      } else if (actualCluesTableHeight === 0) {
        // No clues to display, or no space
        // Don't draw the table if no height
        return;
      }

      // --- Draw White Background for the Clues Table ---
      if (actualCluesTableHeight > 0) {
        pdf.setFillColor(255, 255, 255); // White
        pdf.rect(
          safeLayoutArea.x,
          actualClueTableRenderStartY,
          safeLayoutArea.w,
          actualCluesTableHeight,
          "F" // Fill
        );
      }
      // --- End White Background ---

      // Define column widths: left for anagram, right for answer space
      const anagramColWidth = safeLayoutArea.w * 0.55;
      const answerColWidth = safeLayoutArea.w * 0.45;
      const verticalLineX = safeLayoutArea.x + anagramColWidth;

      pdf.setLineWidth(0.008);
      pdf.setDrawColor(0); // Black for lines

      for (let i = 0; i < actualNumCluesToDisplay; i++) {
        const yRowBase = actualClueTableRenderStartY + i * rowH;
        const yBaseline = yRowBase + rowH * 0.65;

        const xPosClue = safeLayoutArea.x + padX;
        pdf.text(pageData.clues[i], xPosClue, yBaseline, {
          maxWidth: anagramColWidth - padX * 2,
        });

        pdf.line(
          safeLayoutArea.x,
          yRowBase + rowH,
          safeLayoutArea.x + safeLayoutArea.w,
          yRowBase + rowH
        );

        pdf.line(verticalLineX, yRowBase, verticalLineX, yRowBase + rowH);
      }

      if (actualCluesTableHeight > 0) {
        // Top border of the clue table
        pdf.line(
          safeLayoutArea.x,
          actualClueTableRenderStartY,
          safeLayoutArea.x + safeLayoutArea.w,
          actualClueTableRenderStartY
        );
        // Far left border
        pdf.line(
          safeLayoutArea.x,
          actualClueTableRenderStartY,
          safeLayoutArea.x,
          actualClueTableRenderStartY + actualCluesTableHeight
        );
        // Far right border
        pdf.line(
          safeLayoutArea.x + safeLayoutArea.w,
          actualClueTableRenderStartY,
          safeLayoutArea.x + safeLayoutArea.w,
          actualClueTableRenderStartY + actualCluesTableHeight
        );
      }
    }
    // ... (grid_page rendering should be mostly okay, but double-check title font size use)
    else if (pageData.type === "grid_page") {
      // Render Grid Page (adapted from wordsearch_common.js's renderGridPageToPdf)
      pdf.setFontSize(appConfig.PDF_DEFAULT_TITLE_FONT_SIZE);
      pdf.text(
        pageData.title, // Theme title
        safeLayoutArea.x + safeLayoutArea.w / 2,
        safeLayoutArea.y +
          appConfig.GRID_PAGE_TITLE_AREA_H_IN / 2 +
          pointsToInches(appConfig.PDF_DEFAULT_TITLE_FONT_SIZE * 0.35),
        { align: "center" }
      );

      const availableGridH_in =
        safeLayoutArea.h - appConfig.GRID_PAGE_TITLE_AREA_H_IN;
      const availableGridW_in = safeLayoutArea.w;

      if (availableGridH_in <= 0.1 || availableGridW_in <= 0.1) {
        console.warn(
          "Not enough space for grid on page for title:",
          pageData.title
        );
        pdf.text(
          "Error: Grid too large for page.",
          safeLayoutArea.x + 0.5,
          safeLayoutArea.y + appConfig.GRID_PAGE_TITLE_AREA_H_IN + 0.5
        );
        return;
      }

      // Grid canvas was based on pixel cell size. We need to scale it to fit PDF inches.
      // The pageData.gridCanvasDataUrl is a PNG. We need its original pixel dimensions to scale properly.
      // For simplicity, assume fixed canvas cell size was used, or pass it.
      // Let's estimate original canvas dimensions based on grid cell count and default canvas cell size.
      const originalCanvasW_px =
        pageData.gridDimensions.cols * APP_CONFIG.DEFAULT_GRID_CELL_SIZE_PX;
      const originalCanvasH_px =
        pageData.gridDimensions.rows * APP_CONFIG.DEFAULT_GRID_CELL_SIZE_PX;

      const scale =
        Math.min(
          availableGridW_in / pointsToInches(originalCanvasW_px),
          availableGridH_in / pointsToInches(originalCanvasH_px)
        ) * 0.95; // 0.95 to add a little padding

      const scaledGridW_in = pointsToInches(originalCanvasW_px) * scale;
      const scaledGridH_in = pointsToInches(originalCanvasH_px) * scale;

      const gridImageX_in =
        safeLayoutArea.x + (availableGridW_in - scaledGridW_in) / 2;
      const gridImageY_in =
        safeLayoutArea.y +
        appConfig.GRID_PAGE_TITLE_AREA_H_IN +
        (availableGridH_in - scaledGridH_in) / 2;

      try {
        pdf.addImage(
          pageData.gridCanvasDataUrl,
          "PNG",
          gridImageX_in,
          gridImageY_in,
          scaledGridW_in,
          scaledGridH_in
        );
      } catch (e) {
        console.error("Error adding grid image to PDF:", e);
        pdf.text(
          "Error rendering grid image.",
          gridImageX_in,
          gridImageY_in + 0.5
        );
      }
    }
  },

  // Called by App.js to render this puzzle's entry in the solution gallery
  renderSolutionEntry(
    pdf,
    solutionData,
    solutionCellLayout,
    globalSettings,
    appConfig
  ) {
    // solutionData here is what was returned as `solutionEntryData` from generatePuzzleContent.
    // For AnagramWS, it contains `moduleInstanceTitle` and `themedSolutions`.
    // solutionCellLayout is {x, y, w, h, displayName} for the allocated cell on the solutions page.

    pdf.setFont(appConfig.PDF_FONT_FAMILY, "normal");

    const title = solutionData.themeTitle || "Solution";
    const canvasDataUrl = solutionData.solutionCanvasDataUrl;
    const answers = solutionData.wordList; // Array of original phrases
    const gridDisplayDimensions = solutionData.gridDimensions; // {rows, cols}

    // --- Solution Item Title ---
    const solutionItemTitleHeight = 0.3; // Space for the title of this solution item
    pdf.setFontSize(appConfig.PDF_SOLUTION_TITLE_FONT_SIZE);
    pdf.text(
      title,
      solutionCellLayout.x + solutionCellLayout.w / 2,
      solutionCellLayout.y +
        solutionItemTitleHeight * 0.5 +
        pointsToInches(appConfig.PDF_SOLUTION_TITLE_FONT_SIZE * 0.35), // Vertically center title in its strip
      { align: "center", maxWidth: solutionCellLayout.w * 0.95 }
    );

    const contentStartYInItemSlot =
      solutionCellLayout.y + solutionItemTitleHeight;
    const contentHeightInItemSlot =
      solutionCellLayout.h - solutionItemTitleHeight;
    const contentWidthInItemSlot = solutionCellLayout.w;

    // --- Layout within this solution item: Answers list on left, Grid on right ---
    const answerAreaXStart = solutionCellLayout.x;
    // Original design had answer list and grid side-by-side for EACH solution.
    // solCellW_in (in old code) was solutionSafeLayout.w / 2 meaning half the page width for answers, half for grid.
    // Here, solutionCellLayout.w is the full page content width.
    // So, we divide solutionCellLayout.w for list and grid.
    const answerAreaWidth = contentWidthInItemSlot / 2;
    const gridAreaXStart = answerAreaXStart + answerAreaWidth;
    const gridAreaWidth = contentWidthInItemSlot / 2;

    const ansListSidePad = appConfig.SOLUTION_ANSWERS_SIDE_PAD_IN;

    // --- Display Answers list (TWO COLUMNS within the answerAreaWidth) ---
    pdf.setFontSize(appConfig.PDF_SOLUTION_ANSWERS_FONT_SIZE);
    const ansListRowH = appConfig.SOLUTION_ANSWERS_ROW_H_IN;

    const numbersToList = answers || []; // Ensure it's an array
    const totalAnsLines = numbersToList.length;

    const maxLinesThatCanFitInOneColumn = Math.floor(
      contentHeightInItemSlot / ansListRowH
    );
    const linesPerAnsColumn = Math.ceil(totalAnsLines / 2);
    const actualLinesPerColumn = Math.min(
      linesPerAnsColumn,
      maxLinesThatCanFitInOneColumn
    );
    const totalLinesToDraw = Math.min(totalAnsLines, actualLinesPerColumn * 2);

    const ansListPanelH = actualLinesPerColumn * ansListRowH;
    const ansListPanelY =
      contentStartYInItemSlot + (contentHeightInItemSlot - ansListPanelH) / 2; // Center this block

    const ansColGap = appConfig.SOLUTION_ANSWERS_COL_GAP_IN;
    // Width of a single column for answers, within the answerAreaWidth
    const singleAnsColWidth =
      (answerAreaWidth - ansListSidePad * 2 - ansColGap) / 2;

    const ansCol1X = answerAreaXStart + ansListSidePad;
    const ansCol2X = ansCol1X + singleAnsColWidth + ansColGap;

    for (let lineIdx = 0; lineIdx < totalLinesToDraw; lineIdx++) {
      const answerString = numbersToList[lineIdx];
      const targetCol = lineIdx < actualLinesPerColumn ? 0 : 1;
      const rowInTargetCol =
        targetCol === 0 ? lineIdx : lineIdx - actualLinesPerColumn;

      const xPosText = targetCol === 0 ? ansCol1X : ansCol2X;
      const yPosText =
        ansListPanelY + rowInTargetCol * ansListRowH + ansListRowH * 0.65; // Baseline adjust

      if (typeof answerString === "string" && answerString.trim() !== "") {
        pdf.text(answerString, xPosText, yPosText, {
          maxWidth: singleAnsColWidth - pointsToInches(2),
        }); // Small padding for text in column
      }
    }

    // --- Display Solved Grid in the right half ---
    const originalCanvasW_px =
      gridDisplayDimensions.cols * APP_CONFIG.DEFAULT_GRID_CELL_SIZE_PX;
    const originalCanvasH_px =
      gridDisplayDimensions.rows * APP_CONFIG.DEFAULT_GRID_CELL_SIZE_PX;

    const solCanvasScale =
      Math.min(
        (gridAreaWidth - ansListSidePad * 1.5) /
          pointsToInches(originalCanvasW_px), // Use pointsToInches for canvas dim
        contentHeightInItemSlot / pointsToInches(originalCanvasH_px)
      ) * appConfig.SOLUTION_CANVAS_SCALE_FACTOR; // Apply the scale factor

    const solCanvasW_in = pointsToInches(originalCanvasW_px) * solCanvasScale;
    const solCanvasH_in = pointsToInches(originalCanvasH_px) * solCanvasScale;

    // Center the canvas in its allocated gridArea
    const solCanvasX_in = gridAreaXStart + (gridAreaWidth - solCanvasW_in) / 2;
    const solCanvasY_in =
      contentStartYInItemSlot + (contentHeightInItemSlot - solCanvasH_in) / 2;

    try {
      if (canvasDataUrl) {
        pdf.addImage(
          canvasDataUrl,
          "PNG",
          solCanvasX_in,
          solCanvasY_in,
          solCanvasW_in,
          solCanvasH_in
        );
      } else {
        console.warn("Solution canvas data URL is missing for", title);
        pdf.text("Grid N/A", solCanvasX_in, solCanvasY_in + 0.2);
      }
    } catch (e) {
      console.error("Error adding solution grid image:", e);
      pdf.text("Err:Grid", solCanvasX_in, solCanvasY_in + 0.2);
    }
  },
};

// Register module with the main application
window.PuzzleModules = window.PuzzleModules || {};
window.PuzzleModules.anagram_wordsearch = AnagramWordSearchModule;
console.log(
  "AnagramWordSearchModule loaded and registered. Value on window:",
  window.PuzzleModules.anagram_wordsearch
);
