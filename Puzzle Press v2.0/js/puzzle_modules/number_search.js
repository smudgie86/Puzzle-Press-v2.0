// js/puzzle_modules/number_search.js
// Assumes APP_CONFIG, utils.js, GridBuilder, and number_search_generator.js (getRandomInt, generateRandomNumberString, generateCalculationClue) are available.

const NumberSearchModule = {
  type: "number_search",
  displayName: "Number Search (Calculations)",

  DEFAULTS: {
    numPuzzles: 10,
    numbersPerPuzzle: 20,
    minNumLength: 4,
    maxNumLength: 7,
    difficulty: "medium", // 'easy', 'medium', 'hard'
    gridRows: 15,
    gridCols: 12,
  },

  // Using the same _calculateClueFit as Cipher module, assuming it's moved to a shared utility or copied here.
  // For now, let's copy a simplified version for clarity.
  _calculateClueFit(
    clues,
    availableHeight,
    defaultClueFontSize,
    defaultRowHeight
  ) {
    console.log(
      "Calculated clue fit passed in: ",
      clues,
      "ava height: ",
      availableHeight,
      "Row Height: ",
      defaultRowHeight
    );
    const numClues = clues.length; // Let's say this is > 0
    let FONT_TIERS = [
      { fontSize: defaultClueFontSize, rowH: defaultRowHeight },
      { fontSize: defaultClueFontSize - 1, rowH: defaultRowHeight * 0.9 },
      { fontSize: defaultClueFontSize - 2, rowH: defaultRowHeight * 0.8 },
    ];
    // Filter FONT_TIERS: (e.g., if defaultClueFontSize is 8, defaultRowHeight is 0.23)
    // Tier 1: { fontSize: 8, rowH: 0.23 } -> Keeps
    // Tier 2: { fontSize: 7, rowH: 0.207 } -> Keeps
    // Tier 3: { fontSize: 6, rowH: 0.184 } -> Keeps
    FONT_TIERS = FONT_TIERS.filter(
      (tier) => tier.fontSize >= 5 && tier.rowH > 0.12
    );
    // Fallback if FONT_TIERS becomes empty (unlikely with default values but good guard)
    if (FONT_TIERS.length === 0)
      FONT_TIERS.push({ fontSize: 5, rowH: defaultRowHeight * 0.7 });

    let selectedTier = null;
    let cluesToRender = []; // <<<< INITIALIZED AS EMPTY
    let warningMessage = null;

    // Loop 1: Try to fit ALL clues
    for (let tier of FONT_TIERS) {
      // Iterates from largest font/rowH to smallest
      const maxPossibleCluesInHeight = Math.floor(availableHeight / tier.rowH);
      // To debug here:
      console.log(
        `[FitCheck] Tier: ${
          tier.name || tier.fontSize
        }, availableH: ${availableHeight}, tier.rowH: ${
          tier.rowH
        }, maxPossible: ${maxPossibleCluesInHeight}, numClues: ${numClues}`
      );
      if (numClues <= maxPossibleCluesInHeight) {
        selectedTier = tier;
        cluesToRender = clues; // <<<< IF THIS CONDITION IS MET, cluesToRender GETS THE FULL 'clues' ARRAY
        console.log(
          `[FitCheck] All ${numClues} clues fit with tier ${
            tier.name || tier.fontSize
          }`
        );
        break;
      }
    }

    // Loop 2: If not all clues fit with any tier (selectedTier is still null)
    if (!selectedTier) {
      // This block is entered if the loop above never found a tier where numClues <= maxPossibleCluesInHeight
      selectedTier = FONT_TIERS[FONT_TIERS.length - 1]; // Use the smallest defined tier
      const numFitSmallest = Math.floor(availableHeight / selectedTier.rowH);
      // To debug here:
      console.log(
        `[FitCheck] Not all clues fit. Smallest tier: ${
          selectedTier.name || selectedTier.fontSize
        }, numFitSmallest: ${numFitSmallest}`
      );

      // THE PROBLEM IS LIKELY HERE:
      cluesToRender = clues.slice(0, numFitSmallest); // <<<< IF numFitSmallest IS 0, cluesToRender becomes an empty array.

      warningMessage = `...`;
    }
    console.log(
      `[FitCheck] Returning: selectedTier: ${
        selectedTier?.name || selectedTier?.fontSize
      }, cluesToRender.length: ${
        cluesToRender.length
      }, warning: ${warningMessage}`
    );
    return { selectedTier, cluesToRender, warning: warningMessage };
  },

  getConfigFormHTML(existingConfig = {}) {
    const config = { ...this.DEFAULTS, ...existingConfig };
    return `
            <div class="row">
                <label for="ns_displayName">Puzzle Group Display Name (Optional):</label>
                <input type="text" id="ns_displayName" value="${
                  config.customDisplayName || ""
                }" placeholder="e.g., Math Challenge Number Search">
            </div>
            <div class="row">
                <label for="ns_numPuzzles">Number of Puzzles:</label>
                <input type="number" id="ns_numPuzzles" value="${
                  config.numPuzzles
                }" min="1" max="200">
            </div>
            <div class="row">
                <label for="ns_numbersPerPuzzle">Numbers to Find per Puzzle:</label>
                <input type="number" id="ns_numbersPerPuzzle" value="${
                  config.numbersPerPuzzle
                }" min="1" max="100">
            </div>
            <div class="row">
                <label for="ns_minNumLength">Min Number Length:</label>
                <input type="number" id="ns_minNumLength" value="${
                  config.minNumLength
                }" min="2" max="15">
            </div>
            <div class="row">
                <label for="ns_maxNumLength">Max Number Length:</label>
                <input type="number" id="ns_maxNumLength" value="${
                  config.maxNumLength
                }" min="2" max="15">
            </div>
            <div class="row">
                <label for="ns_difficulty">Clue Difficulty:</label>
                <select id="ns_difficulty">
                    <option value="easy" ${
                      config.difficulty === "easy" ? "selected" : ""
                    }>Easy (e.g., 10 + 5)</option>
                    <option value="medium" ${
                      config.difficulty === "medium" ? "selected" : ""
                    }>Medium (e.g., (5 * 3) - 2)</option>
                    <option value="hard" ${
                      config.difficulty === "hard" ? "selected" : ""
                    }>Hard (Chained Answers)</option>
                </select>
            </div>
            <div class="row">
                <label for="ns_gridRows">Grid Rows:</label>
                <input type="number" id="ns_gridRows" value="${
                  config.gridRows
                }" min="5" max="60">
            </div>
            <div class="row">
                <label for="ns_gridCols">Grid Columns:</label>
                <input type="number" id="ns_gridCols" value="${
                  config.gridCols
                }" min="5" max="60">
            </div>
        `;
  },

  postProcessForm(formContainer) {
    /* No specific post-processing needed for this form */
  },

  parseConfigForm(formContainer) {
    const customDisplayName = formContainer
      .querySelector("#ns_displayName")
      .value.trim();
    const numPuzzles = parseInt(
      formContainer.querySelector("#ns_numPuzzles").value,
      10
    );
    const numbersPerPuzzle = parseInt(
      formContainer.querySelector("#ns_numbersPerPuzzle").value,
      10
    );
    const minNumLength = parseInt(
      formContainer.querySelector("#ns_minNumLength").value,
      10
    );
    const maxNumLength = parseInt(
      formContainer.querySelector("#ns_maxNumLength").value,
      10
    );
    const difficulty = formContainer.querySelector("#ns_difficulty").value;
    const gridRows = parseInt(
      formContainer.querySelector("#ns_gridRows").value,
      10
    );
    const gridCols = parseInt(
      formContainer.querySelector("#ns_gridCols").value,
      10
    );

    let validationError = null;
    if (isNaN(numPuzzles) || numPuzzles < 1)
      validationError = "Number of puzzles must be at least 1.";
    if (isNaN(numbersPerPuzzle) || numbersPerPuzzle < 1)
      validationError = "Numbers per puzzle must be at least 1.";
    if (isNaN(minNumLength) || minNumLength < 2)
      validationError = "Min number length must be at least 2.";
    if (isNaN(maxNumLength) || maxNumLength < minNumLength)
      validationError = "Max number length must be >= min length.";
    if (isNaN(gridRows) || gridRows < 5)
      validationError = "Grid rows must be at least 5.";
    if (isNaN(gridCols) || gridCols < 5)
      validationError = "Grid columns must be at least 5.";

    const config = {
      type: this.type,
      customDisplayName,
      numPuzzles,
      numbersPerPuzzle,
      minNumLength,
      maxNumLength,
      difficulty,
      gridRows,
      gridCols,
    };

    return {
      config,
      validationError,
      displayName: customDisplayName || `Number Search (${numPuzzles}x)`,
      summary: `${numPuzzles} puzzles, ${numbersPerPuzzle} numbers each. Difficulty: ${difficulty}. Grid: ${gridRows}x${gridCols}.`,
    };
  },

  async generatePuzzleContent(config, globalSettings) {
    const puzzlePagesData = [];
    const solutionsForThisModule = [];
    let allWarnings = [];
    let previousAnswerForChain = null; // For 'hard' difficulty chained clues

    const approxHeaderHeightOnCluePage =
      APP_CONFIG.CLUE_PAGE_TITLE_STRIP_H_IN + 0.1; // Title strip and gap
    const approxTrimH = parseFloat(globalSettings.trimSize.split("x")[1]);
    const estimatedPageSafeHeight = approxTrimH - 0.25 * 2;
    const approxAvailableClueHeight =
      estimatedPageSafeHeight - approxHeaderHeightOnCluePage;

    for (let i = 0; i < config.numPuzzles; i++) {
      const puzzleTitle = `Number Search ${i + 1}`;
      const currentPuzzleCluesRaw = []; // Store { calculation: "clue string", answer: "number string" }
      const currentPuzzleTargetNumberStrings = [];

      if (config.difficulty !== "hard") previousAnswerForChain = null;

      for (let j = 0; j < config.numbersPerPuzzle; j++) {
        const targetNumberStr = generateRandomNumberString(
          config.minNumLength,
          config.maxNumLength
        );
        const targetNumInt = parseInt(targetNumberStr, 10); // Ensure it's an int for calculation

        // generateCalculationClue expects a number, not a string
        const calc = generateCalculationClue(
          targetNumInt,
          config.difficulty,
          previousAnswerForChain
        );

        currentPuzzleCluesRaw.push({
          calculation: `${calc.clue} = ?`,
          answer: targetNumberStr,
        });
        currentPuzzleTargetNumberStrings.push(targetNumberStr);

        if (config.difficulty === "hard") {
          previousAnswerForChain = calc.answer; // calc.answer is the numeric result for the next chain
        }
      }

      // --- Perform Fit Check for Clues ---
      const clueStringsForFitCheck = currentPuzzleCluesRaw.map(
        (c) => c.calculation
      );
      // --- Perform Fit Check for Clues ---
      const defaultClueFontSizeForFit = APP_CONFIG.PDF_CLUE_FONT_SIZE; // Get the default
      const defaultRowHeightForFit = APP_CONFIG.CLUE_ROW_H_IN; // Get the default

      console.log(`[NS GenContent] About to call _calculateClueFit with: 
                         availableHeight=${approxAvailableClueHeight.toFixed(
                           3
                         )}, 
                         defaultFontSize=${defaultClueFontSizeForFit}, 
                         defaultRowHeight=${defaultRowHeightForFit}`);

      const fitCheckResult = this._calculateClueFit(
        clueStringsForFitCheck, // Arg 1: clues (array of strings)
        approxAvailableClueHeight, // Arg 2: availableHeight (number)
        defaultClueFontSizeForFit, // Arg 3: defaultClueFontSize (number)
        defaultRowHeightForFit // Arg 4: defaultRowHeight (number)
      );
      //console.log("current clue fit check", clueStringsForFitCheck);
      if (fitCheckResult.warning) {
        allWarnings.push(
          `For puzzle "${puzzleTitle}": ${fitCheckResult.warning}`
        );
      }
      // Use potentially truncated clues and the selected tier for this puzzle
      // We need to truncate currentPuzzleCluesRaw based on fitCheckResult.cluesToRender
      const cluesToRenderOnPage = currentPuzzleCluesRaw
        .slice(0, fitCheckResult.cluesToRender.length)
        .map((c) => c.calculation);
      const answersForSolution = currentPuzzleCluesRaw
        .slice(0, fitCheckResult.cluesToRender.length)
        .map((c) => c.answer);
      const targetNumbersForGrid = currentPuzzleTargetNumberStrings.slice(
        0,
        fitCheckResult.cluesToRender.length
      );
      console.log(
        "Full check",
        currentPuzzleCluesRaw,
        "Fit check result length",
        fitCheckResult.cluesToRender.length,
        "c.calculation",
        currentPuzzleCluesRaw
          .slice(0, fitCheckResult.cluesToRender.length)
          .map((c) => c.calculation)
      );
      const tierForThisPage = fitCheckResult.selectedTier;
      // --- End Fit Check ---

      const gridDetails = GridBuilder.buildGrid(
        targetNumbersForGrid,
        config.gridRows,
        config.gridCols,
        "digits"
      );
      if (!gridDetails) {
        allWarnings.push(
          `For puzzle "${puzzleTitle}": Failed to build number grid. This puzzle may be incomplete.`
        );
        // Optionally skip this puzzle entirely or render without grid
      }

      const gridCanvas = gridDetails
        ? GridBuilder.drawGridOnCanvas(gridDetails.grid, null)
        : null;
      const solutionCanvas = gridDetails
        ? GridBuilder.drawGridOnCanvas(
            gridDetails.grid,
            Object.values(gridDetails.positions)
          )
        : null;

      puzzlePagesData.push({
        type: "clues_page_number_search", // Specific type
        title: puzzleTitle,
        clues: cluesToRenderOnPage, // Calculation strings
        renderTier: tierForThisPage,
        prefersBleedBackground: true,
      });
      puzzlePagesData.push({
        type: "grid_page", // Can reuse standard grid page renderer
        title: puzzleTitle,
        gridCanvasDataUrl: gridCanvas
          ? gridCanvas.toDataURL("image/png")
          : null,
        gridDimensions: { rows: config.gridRows, cols: config.gridCols },
        prefersBleedBackground: false,
      });

      solutionsForThisModule.push({
        themeTitle: puzzleTitle,
        solutionCanvasDataUrl: solutionCanvas
          ? solutionCanvas.toDataURL("image/png")
          : null,
        wordList: answersForSolution, // These are the target number strings (answers)
        gridDimensions: { rows: config.gridRows, cols: config.gridCols },
      });
    }

    const solutionEntryData = {
      moduleInstanceTitle: config.customDisplayName || `Number Search Puzzles`,
      themedSolutions: solutionsForThisModule,
    };

    return {
      puzzlePagesData,
      solutionEntryData,
      warnings: allWarnings.length > 0 ? allWarnings : null,
    };
  },

  renderPuzzlePage(pdf, pageData, pageLayoutInfo, globalSettings, appConfig) {
    const { safeLayoutArea } = pageLayoutInfo;
    pdf.setFont(appConfig.PDF_FONT_FAMILY, "normal");

    if (pageData.type === "clues_page_number_search") {
      // Title Strip
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
        { align: "center", maxWidth: safeLayoutArea.w * 0.95 }
      );

      const currentY =
        safeLayoutArea.y + appConfig.CLUE_PAGE_TITLE_STRIP_H_IN + 0.1; // Start Y for content below title
      const padX = appConfig.CLUE_CELL_PAD_X_IN;

      const selectedTier = pageData.renderTier || {
        fontSize: appConfig.PDF_CLUE_FONT_SIZE,
        rowH: appConfig.CLUE_ROW_H_IN,
      };
      const cluesToRender = pageData.clues; // Calculation strings
      console.log(cluesToRender);

      pdf.setFontSize(selectedTier.fontSize);
      const finalRowH = selectedTier.rowH;
      const actualNumCluesToDisplay = cluesToRender.length;
      const actualCluesTableHeight = actualNumCluesToDisplay * finalRowH;

      const availableHeightForCluesList =
        safeLayoutArea.h - (currentY - safeLayoutArea.y);
      let actualClueListStartY = currentY;

      if (
        actualCluesTableHeight < availableHeightForCluesList &&
        actualCluesTableHeight > 0
      ) {
        actualClueListStartY +=
          (availableHeightForCluesList - actualCluesTableHeight) / 2;
      }
      actualClueListStartY = Math.max(currentY, actualClueListStartY);

      if (
        actualCluesTableHeight > 0 &&
        actualClueListStartY + actualCluesTableHeight <=
          safeLayoutArea.y + safeLayoutArea.h + 0.01
      ) {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(
          safeLayoutArea.x,
          actualClueListStartY,
          safeLayoutArea.w,
          actualCluesTableHeight,
          "F"
        );

        const clueColWidth = safeLayoutArea.w * 0.55;
        const verticalLineX = safeLayoutArea.x + clueColWidth;
        pdf.setLineWidth(0.008);
        pdf.setDrawColor(0);

        for (let i = 0; i < actualNumCluesToDisplay; i++) {
          const yRowBase = actualClueListStartY + i * finalRowH;
          if (yRowBase + finalRowH > safeLayoutArea.y + safeLayoutArea.h + 0.01)
            break;

          const yBaseline = yRowBase + finalRowH * 0.65;
          pdf.text(cluesToRender[i], safeLayoutArea.x + padX, yBaseline, {
            maxWidth: clueColWidth - padX * 2,
          });
          pdf.line(
            safeLayoutArea.x,
            yRowBase + finalRowH,
            safeLayoutArea.x + safeLayoutArea.w,
            yRowBase + finalRowH
          );
          pdf.line(
            verticalLineX,
            yRowBase,
            verticalLineX,
            yRowBase + finalRowH
          );
        }
        // Table borders
        pdf.line(
          safeLayoutArea.x,
          actualClueListStartY,
          safeLayoutArea.x + safeLayoutArea.w,
          actualClueListStartY
        );
        pdf.line(
          safeLayoutArea.x,
          actualClueListStartY,
          safeLayoutArea.x,
          actualClueListStartY + actualCluesTableHeight
        );
        pdf.line(
          safeLayoutArea.x + safeLayoutArea.w,
          actualClueListStartY,
          safeLayoutArea.x + safeLayoutArea.w,
          actualClueListStartY + actualCluesTableHeight
        );
      } else if (cluesToRender.length > 0) {
        /* ... PDF error message ... */
      }
    } else if (pageData.type === "grid_page") {
      // Identical to Anagram/Cipher grid page rendering
      pdf.setFontSize(appConfig.PDF_DEFAULT_TITLE_FONT_SIZE);
      pdf.text(
        pageData.title,
        safeLayoutArea.x + safeLayoutArea.w / 2,
        safeLayoutArea.y +
          appConfig.GRID_PAGE_TITLE_AREA_H_IN / 2 +
          pointsToInches(appConfig.PDF_DEFAULT_TITLE_FONT_SIZE * 0.35),
        { align: "center", maxWidth: safeLayoutArea.w * 0.95 }
      );
      const availableGridH_in =
        safeLayoutArea.h - appConfig.GRID_PAGE_TITLE_AREA_H_IN;
      const availableGridW_in = safeLayoutArea.w;
      if (availableGridH_in <= 0.1 || availableGridW_in <= 0.1) {
        console.warn(`No space for grid: ${pageData.title}`);
        return;
      }
      const originalCanvasW_px =
        pageData.gridDimensions.cols * APP_CONFIG.DEFAULT_GRID_CELL_SIZE_PX;
      const originalCanvasH_px =
        pageData.gridDimensions.rows * APP_CONFIG.DEFAULT_GRID_CELL_SIZE_PX;
      const scale =
        Math.min(
          availableGridW_in / pointsToInches(originalCanvasW_px),
          availableGridH_in / pointsToInches(originalCanvasH_px)
        ) * 0.95;
      const scaledGridW_in = pointsToInches(originalCanvasW_px) * scale;
      const scaledGridH_in = pointsToInches(originalCanvasH_px) * scale;
      const gridImageX_in =
        safeLayoutArea.x + (availableGridW_in - scaledGridW_in) / 2;
      const gridImageY_in =
        safeLayoutArea.y +
        appConfig.GRID_PAGE_TITLE_AREA_H_IN +
        (availableGridH_in - scaledGridH_in) / 2;
      try {
        if (pageData.gridCanvasDataUrl) {
          pdf.addImage(
            pageData.gridCanvasDataUrl,
            "PNG",
            gridImageX_in,
            gridImageY_in,
            scaledGridW_in,
            scaledGridH_in
          );
        } else {
          pdf.text(
            "[Grid Not Available]",
            gridImageX_in + scaledGridW_in / 2,
            gridImageY_in + scaledGridH_in / 2,
            { align: "center" }
          );
        }
      } catch (e) {
        console.error("Error adding grid image to PDF:", e);
      }
    }
  },

  renderSolutionEntry(
    pdf,
    solutionData,
    solutionCellLayout,
    globalSettings,
    appConfig
  ) {
    // Identical to Anagram/Cipher solution entry rendering.
    // solutionData = { themeTitle, solutionCanvasDataUrl, wordList (target number strings), gridDimensions }
    pdf.setFont(appConfig.PDF_FONT_FAMILY, "normal");
    const title = solutionData.themeTitle || "Solution";
    const canvasDataUrl = solutionData.solutionCanvasDataUrl;
    const answers = solutionData.wordList; // These are the target number strings
    const gridDisplayDimensions = solutionData.gridDimensions;

    const solutionItemTitleHeight = 0.3;
    pdf.setFontSize(appConfig.PDF_SOLUTION_TITLE_FONT_SIZE);
    pdf.text(
      title,
      solutionCellLayout.x + solutionCellLayout.w / 2,
      solutionCellLayout.y +
        solutionItemTitleHeight * 0.5 +
        pointsToInches(appConfig.PDF_SOLUTION_TITLE_FONT_SIZE * 0.35),
      { align: "center", maxWidth: solutionCellLayout.w * 0.95 }
    );

    const contentStartYInItemSlot =
      solutionCellLayout.y + solutionItemTitleHeight;
    const contentHeightInItemSlot =
      solutionCellLayout.h - solutionItemTitleHeight;
    const contentWidthInItemSlot = solutionCellLayout.w;
    const answerAreaWidth = contentWidthInItemSlot / 2;
    const gridAreaXStart = solutionCellLayout.x + answerAreaWidth;
    const gridAreaWidth = contentWidthInItemSlot / 2;
    const ansListSidePad = appConfig.SOLUTION_ANSWERS_SIDE_PAD_IN;

    pdf.setFontSize(appConfig.PDF_SOLUTION_ANSWERS_FONT_SIZE);
    const ansListRowH = appConfig.SOLUTION_ANSWERS_ROW_H_IN;
    const numbersToList = answers || [];
    const totalAnsLines = numbersToList.length;
    const maxLinesThatCanFitInOneColumn = Math.max(
      1,
      Math.floor(contentHeightInItemSlot / ansListRowH)
    );
    const linesPerAnsColumn = Math.ceil(totalAnsLines / 2);
    const actualLinesPerColumn = Math.min(
      linesPerAnsColumn,
      maxLinesThatCanFitInOneColumn
    );
    const totalLinesToDraw = Math.min(totalAnsLines, actualLinesPerColumn * 2);
    const ansListPanelH = actualLinesPerColumn * ansListRowH;
    const ansListPanelY =
      contentStartYInItemSlot + (contentHeightInItemSlot - ansListPanelH) / 2;
    const ansColGap = appConfig.SOLUTION_ANSWERS_COL_GAP_IN;
    const singleAnsColWidth =
      (answerAreaWidth - ansListSidePad * 2 - ansColGap) / 2;
    const ansCol1X = solutionCellLayout.x + ansListSidePad;
    const ansCol2X = ansCol1X + singleAnsColWidth + ansColGap;

    for (let lineIdx = 0; lineIdx < totalLinesToDraw; lineIdx++) {
      const answerString = numbersToList[lineIdx];
      const targetCol = lineIdx < actualLinesPerColumn ? 0 : 1;
      const rowInTargetCol =
        targetCol === 0 ? lineIdx : lineIdx - actualLinesPerColumn;
      const xPosText = targetCol === 0 ? ansCol1X : ansCol2X;
      const yPosText =
        ansListPanelY + rowInTargetCol * ansListRowH + ansListRowH * 0.65;
      if (typeof answerString === "string" && answerString.trim() !== "") {
        pdf.text(answerString, xPosText, yPosText, {
          maxWidth: singleAnsColWidth - pointsToInches(1),
        });
      }
    }

    if (
      gridDisplayDimensions &&
      gridDisplayDimensions.cols &&
      gridDisplayDimensions.rows
    ) {
      const originalCanvasW_px =
        gridDisplayDimensions.cols * APP_CONFIG.DEFAULT_GRID_CELL_SIZE_PX;
      const originalCanvasH_px =
        gridDisplayDimensions.rows * APP_CONFIG.DEFAULT_GRID_CELL_SIZE_PX;
      const solCanvasScale =
        Math.min(
          (gridAreaWidth - ansListSidePad * 1.5) /
            pointsToInches(originalCanvasW_px),
          contentHeightInItemSlot / pointsToInches(originalCanvasH_px)
        ) * appConfig.SOLUTION_CANVAS_SCALE_FACTOR;
      const solCanvasW_in = pointsToInches(originalCanvasW_px) * solCanvasScale;
      const solCanvasH_in = pointsToInches(originalCanvasH_px) * solCanvasScale;
      const solCanvasX_in =
        gridAreaXStart + (gridAreaWidth - solCanvasW_in) / 2;
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
          console.warn("Solution canvas data URL missing for", title);
        }
      } catch (e) {
        console.error("Error adding solution grid image:", e);
      }
    } else {
      console.warn("Grid dimensions missing for solution:", title);
    }
  },
};

window.PuzzleModules = window.PuzzleModules || {};
window.PuzzleModules.number_search = NumberSearchModule;
console.log("NumberSearchModule loaded and registered.");
