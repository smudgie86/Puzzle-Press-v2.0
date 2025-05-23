// js/puzzle_modules/cipher_wordsearch.js
// Assumes APP_CONFIG, utils.js (sanitizeForGrid, shuffleArray), GridBuilder, Papa are available.

const CipherWordSearchModule = {
  type: "cipher_wordsearch",
  displayName: "Cipher Word Search",

  DEFAULTS: {
    keywordColumnName: "Keyword", // This will also be the puzzle theme/title
    wordColumnName: "Word", // Plaintext words/phrases
    gridRows: 15,
    gridCols: 15,
    displayCipherAlphabetHint: false,
  },

  _generateCipherAlphabet(keyword) {
    const standardAlphabet = APP_CONFIG.ALPHA;
    let cipherAlphabet = "";
    const keywordUpper = keyword.toUpperCase().replace(/[^A-Z]/g, "");
    for (const char of keywordUpper) {
      if (cipherAlphabet.indexOf(char) === -1) cipherAlphabet += char;
    }
    for (const char of standardAlphabet) {
      if (cipherAlphabet.indexOf(char) === -1) cipherAlphabet += char;
    }
    return cipherAlphabet;
  },

  _encryptWithSubstitution(plaintext, cipherKeyAlphabet) {
    const standardAlphabet = APP_CONFIG.ALPHA;
    let ciphertext = "";
    const plaintextUpper = plaintext.toUpperCase();
    for (const char of plaintextUpper) {
      const index = standardAlphabet.indexOf(char);
      ciphertext += index !== -1 ? cipherKeyAlphabet[index] : char;
    }
    return ciphertext;
  },

  _calculateClueFit(clues, availableHeight, fontTiersFromCaller) {
    const numClues = clues.length;

    let FONT_TIERS = fontTiersFromCaller.filter(
      (tier) => tier.fontSize >= 5 && tier.rowH > 0.12
    );
    if (FONT_TIERS.length === 0) {
      const lastOriginalTier =
        fontTiersFromCaller.length > 0
          ? fontTiersFromCaller[fontTiersFromCaller.length - 1]
          : null;
      if (lastOriginalTier && lastOriginalTier.fontSize >= 4) {
        FONT_TIERS.push(lastOriginalTier);
      } else {
        FONT_TIERS.push({
          fontSize: 4,
          rowH: APP_CONFIG.CLUE_ROW_H_IN * 0.7,
          name: "Absolute Minimum",
        });
      }
    }

    let selectedTier = null;
    let cluesToRender = [];
    let warningMessage = null;

    for (let tier of FONT_TIERS) {
      const maxPossibleCluesInHeight = Math.floor(availableHeight / tier.rowH);
      if (numClues <= maxPossibleCluesInHeight) {
        selectedTier = tier;
        cluesToRender = clues;
        break;
      }
    }

    if (!selectedTier) {
      selectedTier = FONT_TIERS[FONT_TIERS.length - 1];
      const numFitSmallest = Math.floor(availableHeight / selectedTier.rowH);
      cluesToRender = clues.slice(0, numFitSmallest);
      warningMessage = `Too many clues (${numClues}). Only ${numFitSmallest} can be displayed using the smallest available font/row settings. Please reduce clues or adjust page/grid settings.`;
    }
    return { selectedTier, cluesToRender, warning: warningMessage };
  },

  getConfigFormHTML(existingConfig = {}) {
    const config = { ...this.DEFAULTS, ...existingConfig };
    return `
            <div class="row">
                <label for="cws_displayName">Puzzle Group Display Name (Optional):</label>
                <input type="text" id="cws_displayName" value="${
                  config.customDisplayName || ""
                }" placeholder="e.g., Famous Quotes Ciphers">
            </div>
            <div class="row">
                <label for="cws_keywordColumn">Keyword/Theme Column (CSV Header):</label>
                <input type="text" id="cws_keywordColumn" value="${
                  config.keywordColumnName
                }">
            </div>
            <div class="row">
                <label for="cws_wordColumn">Plaintext Word/Phrase Column (CSV Header):</label>
                <input type="text" id="cws_wordColumn" value="${
                  config.wordColumnName
                }">
            </div>
            <div class="row">
                <label for="cws_csvInput" class="csv-upload-label">Upload CSV with Keywords & Plaintext:</label>
                <input type="file" id="cws_csvInput" accept=".csv">
                <small>Each keyword defines a new puzzle. Words under that keyword are encrypted.</small>
            </div>
            <div class="row">
                <label for="cws_gridRows">Grid Rows:</label>
                <input type="number" id="cws_gridRows" value="${
                  config.gridRows
                }" min="5" max="50">
            </div>
            <div class="row">
                <label for="cws_gridCols">Grid Columns:</label>
                <input type="number" id="cws_gridCols" value="${
                  config.gridCols
                }" min="5" max="50">
            </div>
            <div class="row">
                <label for="cws_displayHint">Display Cipher Alphabet Hint on Clue Page:</label>
                <input type="checkbox" id="cws_displayHint" ${
                  config.displayCipherAlphabetHint ? "checked" : ""
                }>
                <small>Shows a few letter mappings (e.g., A=X, B=M...).</small>
            </div>
            <div id="cws_csvFeedback" class="status-info" style="margin-top:10px; padding:5px; border:1px dashed #ccc; display:none;"></div>
            ${
              existingConfig.csvFileName
                ? `<p>Previously uploaded: ${existingConfig.csvFileName} (${
                    existingConfig.csvRowCount || "N/A"
                  } rows)</p>`
                : ""
            }
        `;
  },

  postProcessForm(formContainer) {
    const csvInput = formContainer.querySelector("#cws_csvInput");
    const csvFeedback = formContainer.querySelector("#cws_csvFeedback");
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

  parseConfigForm(formContainer) {
    const keywordColumnName = formContainer
      .querySelector("#cws_keywordColumn")
      .value.trim();
    const wordColumnName = formContainer
      .querySelector("#cws_wordColumn")
      .value.trim();
    const customDisplayName = formContainer
      .querySelector("#cws_displayName")
      .value.trim();
    const gridRows = parseInt(
      formContainer.querySelector("#cws_gridRows").value,
      10
    );
    const gridCols = parseInt(
      formContainer.querySelector("#cws_gridCols").value,
      10
    );
    const displayCipherAlphabetHint =
      formContainer.querySelector("#cws_displayHint").checked;
    const csvInput = formContainer.querySelector("#cws_csvInput");
    const file = csvInput.files[0];

    let validationError = null;
    if (!keywordColumnName)
      validationError = "Keyword/Theme column name is required.";
    if (!wordColumnName)
      validationError = "Plaintext Word/Phrase column name is required.";
    if (isNaN(gridRows) || gridRows < 5 || gridRows > 50)
      validationError = "Grid rows must be between 5 and 50.";
    if (isNaN(gridCols) || gridCols < 5 || gridCols > 50)
      validationError = "Grid columns must be between 5 and 50.";

    const config = {
      type: this.type,
      keywordColumnName,
      wordColumnName,
      gridRows,
      gridCols,
      displayCipherAlphabetHint,
      csvFile: file,
      csvFileName: file
        ? file.name
        : formContainer.dataset.existingCsvName || null,
      customDisplayName: customDisplayName,
    };

    return {
      config,
      validationError,
      displayName: customDisplayName || `Cipher WS (${gridRows}x${gridCols})`,
      summary: `Keywords from '${keywordColumnName}', Plaintext from '${wordColumnName}'. Grid: ${gridRows}x${gridCols}. CSV: ${
        file ? file.name : config.csvFileName || "Not set"
      }`,
    };
  },

  async generatePuzzleContent(config, globalSettings) {
    if (!config.csvFile && !config.csvRawData) {
      throw new Error("No CSV file provided for Cipher Word Search.");
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
        config.csvRowCount = csvDataRows.length;
      } catch (error) {
        throw new Error(`Error parsing CSV: ${error.message}`);
      }
    } else if (config.csvRawData) {
      csvDataRows = config.csvRawData;
    } else {
      throw new Error("CSV data missing.");
    }

    const puzzlesDataMap = new Map();
    csvDataRows.forEach((row) => {
      const keyword = (
        String(row[config.keywordColumnName]) || "UNTITLED_CIPHER"
      )
        .trim()
        .toUpperCase();
      const plaintextPhrase = (String(row[config.wordColumnName]) || "")
        .trim()
        .toUpperCase();
      if (!keyword || !plaintextPhrase) return;

      if (!puzzlesDataMap.has(keyword)) {
        puzzlesDataMap.set(keyword, {
          cipherAlphabet: this._generateCipherAlphabet(
            keyword.replace(/[^A-Z]/g, "")
          ),
          clues: [],
          wordsForGrid: [],
          wordsForSolution: [],
        });
      }

      const puzzleEntry = puzzlesDataMap.get(keyword);
      const ciphertextClue = this._encryptWithSubstitution(
        plaintextPhrase,
        puzzleEntry.cipherAlphabet
      );
      const gridWord = sanitizeForGrid(plaintextPhrase);

      puzzleEntry.clues.push(ciphertextClue);
      if (gridWord) puzzleEntry.wordsForGrid.push(gridWord);
      puzzleEntry.wordsForSolution.push(plaintextPhrase);
    });

    if (puzzlesDataMap.size === 0) {
      throw new Error(
        "No valid cipher puzzles found in CSV. Check column names and content."
      );
    }

    const puzzlePagesData = [];
    const solutionsForThisModule = [];
    let allWarnings = [];

    // --- Define FONT TIERS CONFIGURATION for _calculateClueFit ---
    const defaultClueFontSize = APP_CONFIG.PDF_CLUE_FONT_SIZE;
    const defaultRowHeight = APP_CONFIG.CLUE_ROW_H_IN;
    const fontTiersConfiguration = [
      {
        fontSize: defaultClueFontSize,
        rowH: defaultRowHeight,
        name: "Default",
      },
      {
        fontSize: defaultClueFontSize - 1,
        rowH: defaultRowHeight * 0.9,
        name: "Smaller",
      },
      {
        fontSize: defaultClueFontSize - 2,
        rowH: defaultRowHeight * 0.8,
        name: "Smallest",
      },
    ];
    // --- END FONT TIERS DEFINITION ---

    // Estimate available height for clues (this part might need refinement for super accuracy)
    const approxHeaderHeightOnCluePage =
      APP_CONFIG.CLUE_PAGE_TITLE_STRIP_H_IN +
      0.1 + // Title strip and gap
      0.3 + // Approx height for "Cipher Keyword: XXX"
      (config.displayCipherAlphabetHint ? 0.25 : 0) + // Approx height for hint
      0.05; // Gap before clues

    const approxTrimH = parseFloat(globalSettings.trimSize.split("x")[1]);
    // Simplified safe height estimation. For full accuracy, this would need kdpMargins which depend on total pages.
    // Using a typical KDP top/bottom margin from trim of 0.25" each.
    const estimatedPageSafeHeight = approxTrimH - 0.25 * 2;
    const approxAvailableClueHeight =
      estimatedPageSafeHeight - approxHeaderHeightOnCluePage;

    for (const [keyword, data] of puzzlesDataMap.entries()) {
      // --- Perform Fit Check for Clues ---
      const fitCheckResult = this._calculateClueFit(
        data.clues,
        approxAvailableClueHeight,
        fontTiersConfiguration
      );

      if (fitCheckResult.warning) {
        allWarnings.push(`For puzzle "${keyword}": ${fitCheckResult.warning}`);
      }
      const cluesForThisPage = fitCheckResult.cluesToRender;
      const tierForThisPage = fitCheckResult.selectedTier;
      // --- End Fit Check ---

      if (data.wordsForGrid.length === 0 && cluesForThisPage.length === 0) {
        console.warn(
          `No words or displayable clues for cipher keyword: "${keyword}". Skipping.`
        );
        continue;
      }

      const gridDetails =
        data.wordsForGrid.length > 0
          ? GridBuilder.buildGrid(
              data.wordsForGrid,
              config.gridRows,
              config.gridCols,
              "letters"
            )
          : null;

      if (!gridDetails && data.wordsForGrid.length > 0) {
        allWarnings.push(
          `For puzzle "${keyword}": Failed to build word search grid. This puzzle might be incomplete.`
        );
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
        type: "clues_page_cipher",
        title: keyword,
        keyword: keyword,
        cipherAlphabet: data.cipherAlphabet,
        displayCipherAlphabetHint: config.displayCipherAlphabetHint,
        clues: cluesForThisPage,
        renderTier: tierForThisPage,
        prefersBleedBackground: true,
      });
      puzzlePagesData.push({
        type: "grid_page",
        title: keyword,
        gridCanvasDataUrl: gridCanvas
          ? gridCanvas.toDataURL("image/png")
          : null,
        gridDimensions: { rows: config.gridRows, cols: config.gridCols },
        prefersBleedBackground: false,
      });

      solutionsForThisModule.push({
        themeTitle: keyword,
        solutionCanvasDataUrl: solutionCanvas
          ? solutionCanvas.toDataURL("image/png")
          : null,
        wordList: data.wordsForSolution,
        gridDimensions: { rows: config.gridRows, cols: config.gridCols },
      });
    }

    const solutionEntryData = {
      moduleInstanceTitle:
        config.customDisplayName ||
        `Cipher Word Searches (from ${config.csvFileName || "CSV"})`,
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

    if (pageData.type === "clues_page_cipher") {
      // --- Title Strip (Keyword is title) ---
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

      // --- Cipher Keyword Display Area ---
      let currentY =
        safeLayoutArea.y + appConfig.CLUE_PAGE_TITLE_STRIP_H_IN + 0.1;
      const keywordDisplayHeight = 0.3; // Inches for this section
      pdf.setFillColor(255, 255, 255);
      pdf.rect(
        safeLayoutArea.x,
        currentY,
        safeLayoutArea.w,
        keywordDisplayHeight,
        "F"
      );
      pdf.setFontSize(appConfig.PDF_CLUE_FONT_SIZE - 1); // Slightly smaller for keyword line
      const keywordText = `Cipher Keyword: ${pageData.keyword}`; // pageData.keyword is the actual keyword string
      pdf.text(
        keywordText,
        safeLayoutArea.x + safeLayoutArea.w / 2,
        currentY + keywordDisplayHeight / 2,
        { align: "center", maxWidth: safeLayoutArea.w * 0.9 }
      );
      currentY += keywordDisplayHeight;

      if (pageData.displayCipherAlphabetHint) {
        const hintAlphabetHeight = 0.25;
        const standard = APP_CONFIG.ALPHA;
        const cipher = pageData.cipherAlphabet;
        let hintText = `Hint: A=${cipher[0]}, B=${cipher[1]}, C=${cipher[2]} ... Z=${cipher[25]}`;
        // Or a partial hint:
        // hintText = `Hint: A=${cipher[standard.indexOf('A')]} ... M=${cipher[standard.indexOf('M')]} ... Z=${cipher[standard.indexOf('Z')]}`;
        pdf.setFontSize(appConfig.PDF_CLUE_FONT_SIZE - 2); // Even smaller for hint
        pdf.setFillColor(255, 255, 255);
        pdf.rect(
          safeLayoutArea.x,
          currentY,
          safeLayoutArea.w,
          hintAlphabetHeight,
          "F"
        );
        pdf.text(
          hintText,
          safeLayoutArea.x + safeLayoutArea.w / 2,
          currentY + hintAlphabetHeight / 2,
          { align: "center", maxWidth: safeLayoutArea.w * 0.9 }
        );
        currentY += hintAlphabetHeight;
      }
      const headerHeight =
        currentY -
        (safeLayoutArea.y + appConfig.CLUE_PAGE_TITLE_STRIP_H_IN + 0.1) +
        appConfig.CLUE_PAGE_TITLE_STRIP_H_IN +
        0.1;
      // Recalculate currentY accurately after all header elements
      currentY = safeLayoutArea.y + headerHeight + 0.05; // Start of clue list Y

      // --- Clue List (Ciphertext) ---
      const padX = appConfig.CLUE_CELL_PAD_X_IN;

      // Use the renderTier passed from generatePuzzleContent
      const selectedTier = pageData.renderTier || {
        fontSize: appConfig.PDF_CLUE_FONT_SIZE,
        rowH: appConfig.CLUE_ROW_H_IN,
      }; // Fallback
      const cluesToRender = pageData.clues;

      pdf.setFontSize(selectedTier.fontSize);
      const finalRowH = selectedTier.rowH;
      const actualNumCluesToDisplay = cluesToRender.length;
      const actualCluesTableHeight = actualNumCluesToDisplay * finalRowH;

      const availableHeightForCluesList =
        safeLayoutArea.h - (currentY - safeLayoutArea.y);
      let actualClueListStartY = currentY;

      // Only center if it truly fits without issues. If clues were truncated, warning was already given.
      if (
        actualCluesTableHeight < availableHeightForCluesList &&
        actualCluesTableHeight > 0
      ) {
        actualClueListStartY +=
          (availableHeightForCluesList - actualCluesTableHeight) / 2;
      }
      // Ensure list doesn't start above currentY if centering pushes it up too much (unlikely here)
      actualClueListStartY = Math.max(currentY, actualClueListStartY);

      if (
        actualCluesTableHeight > 0 &&
        actualClueListStartY + actualCluesTableHeight <=
          safeLayoutArea.y + safeLayoutArea.h + 0.01
      ) {
        // Check if table fits
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
            break; // Double check row doesn't exceed page

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
        // Not enough space to render the clue table as calculated, even after _calculateClueFit.
        // This might happen if approxAvailableClueHeight was too optimistic.
        // Render a small error message on the PDF page itself.
        pdf.setTextColor(200, 0, 0);
        pdf.setFontSize(appConfig.PDF_CLUE_FONT_SIZE - 1);
        pdf.text(
          "Error: Clues for this puzzle could not be fully displayed due to page height limitations.",
          safeLayoutArea.x + safeLayoutArea.w / 2,
          currentY + 0.5,
          { align: "center", maxWidth: safeLayoutArea.w * 0.9 }
        );
        pdf.setTextColor(0, 0, 0);
        console.error(
          `Clue page for "${pageData.title}": Table height ${actualCluesTableHeight} exceeds available ${availableHeightForCluesList} or starts too low.`
        );
      }
    } else if (pageData.type === "grid_page") {
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
    pdf.setFont(appConfig.PDF_FONT_FAMILY, "normal");
    const title = solutionData.themeTitle || "Solution";
    const canvasDataUrl = solutionData.solutionCanvasDataUrl;
    const answers = solutionData.wordList;
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
        }); // Slightly less padding
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
window.PuzzleModules.cipher_wordsearch = CipherWordSearchModule;
console.log("CipherWordSearchModule loaded and registered.");
