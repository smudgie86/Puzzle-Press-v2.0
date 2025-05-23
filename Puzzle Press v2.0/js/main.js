// js/main.js
// Core application logic: event handling, basket management, PDF orchestration.

window.PuzzleModules = window.PuzzleModules || {};
const App = {
  puzzleBasket: [], // Stores configured puzzle objects: { id, type, config, displayName, summary }
  globalSettings: {
    trimSize: "6x9",
    frontPageNote: "",
    backgroundImages: [],
    currentBgIndex: 0,
    randomizeOrder: false,
  },
  dom: {
    // To be populated with actual DOM elements
    puzzleTypeSelect: null,
    addPuzzleBtn: null,
    buildPdfBtn: null,
    trimSizeSelect: null,
    fpNoteInput: null,
    bgsInput: null,
    randomOrderCheckbox: null,
    statusDiv: null,
    // Modal elements are part of PuzzleUI but might be referenced
    puzzleConfigModal: null,
    modalTitle: null,
    modalFormContainer: null,
    savePuzzleConfigBtn: null,
    closeModalBtn: null,
    puzzleBasketContainer: null,
    emptyBasketMsg: null,
  },
  puzzleModules: {}, // To be populated with { type: moduleObject }
  currentPuzzleTypeForModal: null, // Tracks which puzzle type is being configured

  init() {
    // Cache DOM elements
    this.dom.puzzleTypeSelect = document.getElementById("puzzleTypeSelect");
    this.dom.addPuzzleBtn = document.getElementById("addPuzzleBtn");
    this.dom.buildPdfBtn = document.getElementById("buildPdfBtn");
    this.dom.trimSizeSelect = document.getElementById("trimSizeSelect");
    this.dom.fpNoteInput = document.getElementById("fpNoteInput");
    this.dom.bgsInput = document.getElementById("bgsInput");
    this.dom.randomOrderCheckbox = document.getElementById(
      "randomOrderCheckbox"
    );
    this.dom.statusDiv = document.getElementById("statusDiv");

    this.dom.puzzleConfigModal = document.getElementById("puzzleConfigModal");
    this.dom.modalTitle = document.getElementById("modalTitle");
    this.dom.modalFormContainer = document.getElementById("modalFormContainer");
    this.dom.savePuzzleConfigBtn = document.getElementById(
      "savePuzzleConfigBtn"
    );
    this.dom.closeModalBtn = document.getElementById("closeModalBtn");
    this.dom.puzzleBasketContainer = document.getElementById("puzzleBasket");
    this.dom.emptyBasketMsg = document.getElementById("emptyBasketMsg");

    // Initialize UI manager
    PuzzleUI.init(this.dom);

    // Load puzzle modules (assuming they are globally available like PuzzleModules.AnagramWordSearch)
    // This will be more structured once module files are created.
    // For now, this is a placeholder.
    // In App.init()
    if (window.PuzzleModules) {
      this.puzzleModules = window.PuzzleModules; // This assigns the entire registry
      console.log("App.init - Puzzle modules loaded:", this.puzzleModules);
    } else {
      console.error("Critical: window.PuzzleModules registry not found!");
      // This would be a critical error if it happens
    }

    // Event Listeners
    this.dom.puzzleTypeSelect.addEventListener("change", () => {
      this.dom.addPuzzleBtn.disabled = !this.dom.puzzleTypeSelect.value;
    });
    this.dom.addPuzzleBtn.addEventListener("click", () =>
      this.handleAddPuzzleClick()
    );
    this.dom.savePuzzleConfigBtn.addEventListener("click", () =>
      this.handleSavePuzzleConfig()
    );

    this.dom.bgsInput.addEventListener("change", (e) =>
      this.handleBackgroundsChange(e)
    );
    this.dom.buildPdfBtn.addEventListener("click", () => this.buildFullPdf());

    // Delegated event listeners for basket items
    this.dom.puzzleBasketContainer.addEventListener("click", (e) => {
      if (e.target.classList.contains("remove-btn")) {
        this.removePuzzleFromBasket(e.target.dataset.id);
      } else if (e.target.classList.contains("edit-btn")) {
        this.editPuzzleInBasket(e.target.dataset.id);
      } else if (e.target.classList.contains("move-up-btn")) {
        this.movePuzzleInBasket(e.target.dataset.id, -1);
      } else if (e.target.classList.contains("move-down-btn")) {
        this.movePuzzleInBasket(e.target.dataset.id, 1);
      }
    });

    PuzzleUI.renderBasket(this.puzzleBasket);
    PuzzleUI.setStatus(
      "Application initialized. Select puzzle types to begin."
    );
  },

  getCurrentPuzzleTypeForModal() {
    return this.currentPuzzleTypeForModal;
  },

  // js/main.js - App.handleAddPuzzleClick

  handleAddPuzzleClick() {
    const puzzleType = this.dom.puzzleTypeSelect.value; // e.g., "anagram_wordsearch"

    // --- DEBUGGING LOGS ---
    console.log("[handleAddPuzzleClick] Selected puzzle type:", puzzleType);
    console.log(
      "[handleAddPuzzleClick] All registered modules (App.puzzleModules):",
      this.puzzleModules
    );
    console.log(
      "[handleAddPuzzleClick] Attempting to access module:",
      this.puzzleModules[puzzleType]
    );
    if (this.puzzleModules[puzzleType]) {
      console.log(
        "[handleAddPuzzleClick] getConfigFormHTML exists:",
        typeof this.puzzleModules[puzzleType].getConfigFormHTML === "function"
      );
    }
    // --- END DEBUGGING LOGS ---

    if (
      !puzzleType ||
      !this.puzzleModules[puzzleType] ||
      typeof this.puzzleModules[puzzleType].getConfigFormHTML !== "function"
    ) {
      PuzzleUI.setStatus(
        `Configuration for ${puzzleType} not available.`,
        "error"
      );
      return;
    }
    this.currentPuzzleTypeForModal = puzzleType;
    PuzzleUI.currentEditingPuzzleId = null;
    const formHTML = this.puzzleModules[puzzleType].getConfigFormHTML();
    const typeDisplayName =
      this.puzzleModules[puzzleType].displayName ||
      puzzleType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    PuzzleUI.showModal(`Configure ${typeDisplayName}`, formHTML);
  },

  handleSavePuzzleConfig() {
    const puzzleType = this.currentPuzzleTypeForModal;
    if (
      !puzzleType ||
      !this.puzzleModules[puzzleType] ||
      typeof this.puzzleModules[puzzleType].parseConfigForm !== "function"
    ) {
      PuzzleUI.setStatus("Error saving configuration.", "error");
      return;
    }

    const { config, validationError, displayName, summary } =
      this.puzzleModules[puzzleType].parseConfigForm(
        this.dom.modalFormContainer
      );

    if (validationError) {
      PuzzleUI.setStatus(`Validation Error: ${validationError}`, "error");
      // Highlight error fields in modal if possible
      return;
    }

    if (PuzzleUI.currentEditingPuzzleId) {
      // Editing existing
      const index = this.puzzleBasket.findIndex(
        (p) => p.id === PuzzleUI.currentEditingPuzzleId
      );
      if (index > -1) {
        this.puzzleBasket[index].config = config;
        this.puzzleBasket[index].displayName = displayName;
        this.puzzleBasket[index].summary = summary;
        PuzzleUI.setStatus(
          `${displayName || config.type} updated in basket.`,
          "success"
        );
      }
    } else {
      // Adding new
      const puzzleItem = {
        id: generateUUID(), // from utils.js
        type: puzzleType, // internal type
        config: config, // configuration specific to this puzzle instance
        displayName: displayName, // User-friendly name
        summary: summary, // Short summary of config for basket display
      };
      this.puzzleBasket.push(puzzleItem);
      PuzzleUI.setStatus(
        `${displayName || config.type} added to basket.`,
        "success"
      );
    }

    PuzzleUI.renderBasket(this.puzzleBasket);
    PuzzleUI.hideModal();
    this.currentPuzzleTypeForModal = null;
  },

  removePuzzleFromBasket(puzzleId) {
    this.puzzleBasket = this.puzzleBasket.filter((p) => p.id !== puzzleId);
    PuzzleUI.renderBasket(this.puzzleBasket);
    PuzzleUI.setStatus("Puzzle removed from basket.", "info");
  },

  editPuzzleInBasket(puzzleId) {
    const puzzleItem = this.puzzleBasket.find((p) => p.id === puzzleId);
    if (!puzzleItem) return;

    const puzzleType = puzzleItem.type;
    if (
      !this.puzzleModules[puzzleType] ||
      typeof this.puzzleModules[puzzleType].getConfigFormHTML !== "function"
    ) {
      PuzzleUI.setStatus(`Cannot edit ${puzzleType}. Module error.`, "error");
      return;
    }
    this.currentPuzzleTypeForModal = puzzleType;
    PuzzleUI.currentEditingPuzzleId = puzzleId;

    const formHTML = this.puzzleModules[puzzleType].getConfigFormHTML(
      puzzleItem.config
    ); // Pass existing config
    const typeDisplayName =
      this.puzzleModules[puzzleType].displayName ||
      puzzleType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    PuzzleUI.showModal(`Edit ${typeDisplayName}`, formHTML, true);
  },

  movePuzzleInBasket(puzzleId, direction) {
    // direction: -1 for up, 1 for down
    const index = this.puzzleBasket.findIndex((p) => p.id === puzzleId);
    if (index === -1) return;

    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.puzzleBasket.length) return;

    // Swap elements
    [this.puzzleBasket[index], this.puzzleBasket[newIndex]] = [
      this.puzzleBasket[newIndex],
      this.puzzleBasket[index],
    ];
    PuzzleUI.renderBasket(this.puzzleBasket);
  },

  updateBasketOrderFromDOM() {
    const orderedIds = Array.from(
      this.dom.puzzleBasketContainer.querySelectorAll(".puzzle-item")
    ).map((item) => item.dataset.id);

    const newBasket = orderedIds
      .map((id) => this.puzzleBasket.find((p) => p.id === id))
      .filter((p) => p); // Filter out undefined if something went wrong

    if (newBasket.length === this.puzzleBasket.length) {
      this.puzzleBasket = newBasket;
      PuzzleUI.renderBasket(this.puzzleBasket); // Re-render to update move button states
      console.log("Basket order updated from DOM.");
    } else {
      console.error(
        "Error updating basket order from DOM. ID mismatch or missing items."
      );
      PuzzleUI.renderBasket(this.puzzleBasket); // Revert to original order if error
    }
  },

  handleBackgroundsChange(event) {
    const files = Array.from(event.target.files);
    this.globalSettings.backgroundImages = [];
    this.globalSettings.currentBgIndex = 0;
    if (!files.length) {
      PuzzleUI.setStatus("Backgrounds cleared.", "info");
      return;
    }
    PuzzleUI.setStatus(
      `Loading ${files.length} background image(s)...`,
      "info"
    );
    let loadedCount = 0;
    const promises = files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e_reader) => {
            const img = new Image();
            img.onload = () => {
              this.globalSettings.backgroundImages.push({
                data: e_reader.target.result,
                w: img.width, // Store original pixel dimensions
                h: img.height,
                fmt: /png$/i.test(file.type) ? "PNG" : "JPEG",
              });
              loadedCount++;
              PuzzleUI.setStatus(
                `Loaded ${loadedCount}/${files.length} background(s)...`,
                "info"
              );
              resolve();
            };
            img.onerror = (err) => {
              console.error("Image load error:", err);
              reject(err);
            };
            img.src = e_reader.target.result;
          };
          reader.onerror = (err) => {
            console.error("File reader error:", err);
            reject(err);
          };
          reader.readAsDataURL(file);
        })
    );
    Promise.all(promises)
      .then(() =>
        PuzzleUI.setStatus(
          `All ${files.length} background images ready.`,
          "success"
        )
      )
      .catch((error) => {
        PuzzleUI.setStatus("Error loading backgrounds.", "error");
        console.error(error);
      });
  },

  updateGlobalSettings() {
    this.globalSettings.trimSize = this.dom.trimSizeSelect.value;
    this.globalSettings.frontPageNote = this.dom.fpNoteInput.value.trim();
    this.globalSettings.randomizeOrder = this.dom.randomOrderCheckbox.checked;
  },

  async buildFullPdf() {
    this.updateGlobalSettings();

    if (this.puzzleBasket.length === 0) {
      PuzzleUI.setStatus(
        "Basket is empty. Add puzzles before building.",
        "error"
      );
      return;
    }

    PuzzleUI.setStatus("Starting PDF generation...", "info");
    await new Promise((r) => setTimeout(r, 50)); // Allow UI to update status

    const [trimW_in, trimH_in] = this.globalSettings.trimSize
      .split("x")
      .map(parseFloat);
    const hasBleed = this.globalSettings.backgroundImages.length > 0;

    const puzzlesToBuild = this.globalSettings.randomizeOrder
      ? shuffleArray([...this.puzzleBasket])
      : [...this.puzzleBasket];

    const generatedPuzzleData = []; // To store detailed data from each puzzle's generateData method
    const solutionsCollection = []; // To store data needed for rendering solutions
    let collectedWarnings = []; // <<<< Array to store all warnings
    // Step 1: Generate data for all puzzles
    // This is important if puzzles depend on async operations (like CSV parsing)
    // or if one puzzle's generation might affect another (less common here but good practice).
    for (let i = 0; i < puzzlesToBuild.length; i++) {
      const basketItem = puzzlesToBuild[i];
      const module = this.puzzleModules[basketItem.type];
      PuzzleUI.setStatus(
        `Generating data for ${basketItem.displayName || basketItem.type} (${
          i + 1
        }/${puzzlesToBuild.length})...`,
        "info"
      );
      await new Promise((r) => setTimeout(r, 10));

      if (module && typeof module.generatePuzzleContent === "function") {
        try {
          // generatePuzzleContent now returns { puzzlePagesData: [], solutionEntryData: {} }
          // puzzlePagesData is an array, as a puzzle might span multiple pages (e.g. clue page + grid page)
          const content = await module.generatePuzzleContent(
            basketItem.config,
            this.globalSettings
          );
          console.log("Main Content", content);
          if (
            !content ||
            !content.puzzlePagesData ||
            !content.solutionEntryData
          ) {
            throw new Error("Invalid content structure returned by module.");
          }
          generatedPuzzleData.push({
            type: basketItem.type,
            displayName: basketItem.displayName,
            puzzlePagesLayouts: content.puzzlePagesData, // Array of { type: 'clue'/'grid'/'maze', data: {...} }
            id: basketItem.id, // Keep ID for reference
          });
          solutionsCollection.push({
            type: basketItem.type,
            displayName: basketItem.displayName,
            layout: content.solutionEntryData, // Data specific for rendering this solution in a gallery
            id: basketItem.id,
          });
        } catch (error) {
          console.error(
            `Error generating data for ${basketItem.displayName}:`,
            error
          );
          PuzzleUI.setStatus(
            `Error for ${basketItem.displayName}: ${error.message}. Aborting.`,
            "error"
          );
          return;
        }
      } else {
        PuzzleUI.setStatus(
          `Module or generatePuzzleContent function missing for ${basketItem.type}. Aborting.`,
          "error"
        );
        return;
      }
    }
    // --- Display Warnings and Abort if Necessary ---
    if (collectedWarnings.length > 0) {
      let fullWarningMessage =
        "Please address the following issues before generating the PDF:\n";
      collectedWarnings.forEach((warn) => {
        fullWarningMessage += `\n- ${warn}`;
      });
      PuzzleUI.setStatus(fullWarningMessage, "error"); // Display as error on website
      alert(fullWarningMessage); // Also use a browser alert for more prominence
      return; // <<<< ABORT PDF GENERATION
    }
    // --- End Warning Check ---
    PuzzleUI.setStatus("All puzzle data generated. Assembling PDF...", "info");

    // Calculate total pages for KDP margins
    // This is an estimate: front note page + N puzzle pages + solutions title + M solution pages
    let estimatedPuzzlePages = 0;
    generatedPuzzleData.forEach(
      (pd) => (estimatedPuzzlePages += pd.puzzlePagesLayouts.length)
    );

    const estimatedSolutionPages = Math.ceil(
      solutionsCollection.length / APP_CONFIG.SOLUTIONS_PER_PAGE
    );
    let totalEstimatedPages =
      (this.globalSettings.frontPageNote ? 1 : 0) + // Front note page (or blank if no note)
      (estimatedPuzzlePages > 0 ? 1 : 0) + // Blank page after front note, before first puzzle (if note exists)
      estimatedPuzzlePages +
      (solutionsCollection.length > 0 ? 1 : 0) + // Solutions title page
      estimatedSolutionPages;
    if (totalEstimatedPages % 2 !== 0) totalEstimatedPages++; // KDP often likes even page counts
    // --- Debug totalEstimatedPages ---
    //console.log("[BuildPDF] totalEstimatedPages:",totalEstimatedPages,      "puzzlePages:",      estimatedPuzzlePages,      "solutionItems:", estimatedIndividualSolutionItems,      "solutionGalleryPages:", estimatedSolutionGalleryPages    );
    if (isNaN(totalEstimatedPages)) {
      console.error("CRITICAL: totalEstimatedPages is NaN!");
      // You might want to throw an error here or default totalEstimatedPages
      // totalEstimatedPages = 24; // A safe default if NaN, though it's better to find why
    }
    const kdpMargins = getKdpMargins(totalEstimatedPages, hasBleed); // From pdf_utils.js
    // --- MORE DETAILED DEBUG FOR kdpMargins ---
    //console.log("--- kdpMargins Object Details ---");
    //console.log("kdpMargins object itself:", kdpMargins);
    if (kdpMargins) {
      // console.log("Type of kdpMargins:", typeof kdpMargins);
      // console.log("kdpMargins.bleed_allowance:", kdpMargins.bleed_allowance);
      //console.log(
      // "Type of kdpMargins.bleed_allowance:",
      // typeof kdpMargins.bleed_allowance
      //  );
      // console.log("Is kdpMargins.bleed_allowance NaN?",isNaN(kdpMargins.bleed_allowance));
    } else {
      //  console.error("CRITICAL: kdpMargins object is null or undefined!");
    }
    //console.log("--- Values just before NaN calculation ---");
    //console.log("trimW_in:", trimW_in, "(type:", typeof trimW_in, ")");
    //console.log("trimH_in:", trimH_in, "(type:", typeof trimH_in, ")");
    //console.log("hasBleed:", hasBleed, "(type:", typeof hasBleed, ")");
    // --- END MORE DETAILED DEBUG ---
    // Corrected page dimensions with bleed:
    // Height gets bleed on top AND bottom.
    const actualPageH_in =
      trimH_in + (hasBleed ? kdpMargins.bleed_allowance * 2 : 0);
    // Width gets bleed ONLY on the outside edge.
    const actualPageW_in =
      trimW_in + (hasBleed ? kdpMargins.bleed_allowance : 0); // REMOVE * 2 for width

    // --- DEBUG LOGS ---
    //console.log("--- PDF Page Dimension Calculation ---");
    //console.log("this.globalSettings.trimSize:", this.globalSettings.trimSize);
    // console.log("trimW_in_str:", trimW_in_str, "trimH_in_str:", trimH_in_str);
    //console.log("trimW_in (parsed):", trimW_in, "trimH_in (parsed):", trimH_in);
    //console.log("hasBleed:", hasBleed);
    //console.log("kdpMargins.bleed_allowance:", kdpMargins.bleed_allowance);
    //console.log("Calculated actualPageW_in:", actualPageW_in);
    //console.log("Calculated actualPageH_in:", actualPageH_in);
    //console.log("Is actualPageW_in NaN?", isNaN(actualPageW_in));
    //console.log("Is actualPageH_in NaN?", isNaN(actualPageH_in));
    // --- END DEBUG LOGS ---

    const pdf = new jspdf.jsPDF({
      unit: "in",
      format: [actualPageW_in, actualPageH_in],
      putOnlyUsedFonts: true,
    });
    pdf.setFont(APP_CONFIG.PDF_FONT_FAMILY, "normal"); // Set default font

    let currentPageIndex = 1; // 0-indexed for jsPDF pages

    // --- Page 1: Front Page Note or Blank ---
    //pdf.addPage();
    // currentPageIndex++;
    drawPdfPageBackground(
      pdf,
      actualPageW_in,
      actualPageH_in,
      false,
      this.globalSettings
    ); // Usually no bleed on this page
    if (this.globalSettings.frontPageNote) {
      renderFrontPageNoteToPdf(
        pdf,
        this.globalSettings.frontPageNote,
        actualPageW_in,
        actualPageH_in,
        kdpMargins,
        APP_CONFIG.PDF_FRONT_NOTE_FONT_SIZE
      );
    }

    // --- Optional Blank Page (verso of front page note) ---
    // Puzzles should start on a recto (right-hand) page.
    // If page 1 had content (note), page 2 is its back (verso, left). So add another page to start puzzles on page 3 (recto).
    // If page 1 was blank (no note), then page 1 is effectively a blank recto. We need a blank verso then start on page 3.
    // Simpler: always ensure puzzles start after a "pair" for the title page area.
    // If first page has content (note), current page is 1. Add blank (page 2). Next page is 3 (recto).
    // If first page is blank (no note), current page is 1. Add blank (page 2). Next page is 3 (recto).
    // This seems to always make puzzles start on PDF page 3. Let's refine this to ensure recto start.

    let puzzleStartPdfPage = 2; // The PDF page number where puzzles will begin
    /* if (this.globalSettings.frontPageNote) {
      // Note on page 1 (recto). Page 2 (verso) should be blank. Puzzles start on page 3 (recto).
      //pdf.addPage();
      //currentPageIndex++;
      console.log("--- Calling drawPdfPageBackground (Page 1) ---");
      console.log(
        "Arguments: pdf (object), pageWidth_in:",
        actualPageW_in,
        "pageHeight_in:",
        actualPageH_in,
        "showBackground:",
        false,
        "globalAppState:",
        this.globalSettings
      );

      drawPdfPageBackground(
        pdf,
        actualPageW_in,
        actualPageH_in,
        false,
        this.globalSettings
      );
      puzzleStartPdfPage = 2;
    } else {
      // No note, so page 1 is blank (recto). Page 2 (verso) should be blank. Puzzles start on page 3 (recto).
      // We already have one page. If it's blank, we want puzzles to start on the *next* recto.
      // If current page count is odd (e.g. 1), next page is even (verso), then odd (recto).
      // If current page count is even (e.g. 0, though we added 1), next page is odd (recto).
      if (currentPageIndex % 2 !== 0) {
        // Currently on a recto (e.g. page 1 is blank)
        pdf.addPage();
        currentPageIndex++; // Add a blank verso (page 2)
        drawPdfPageBackground(
          pdf,
          actualPageW_in,
          actualPageH_in,
          false,
          this.globalSettings
        );
      }
      puzzleStartPdfPage = currentPageIndex + 1; // Puzzles start on the next page (which will be recto)
    }*/

    // --- Puzzle Pages ---
    for (let i = 0; i < generatedPuzzleData.length; i++) {
      const puzzleSet = generatedPuzzleData[i]; // Contains array of page layouts for one "puzzle"
      const module = this.puzzleModules[puzzleSet.type];

      PuzzleUI.setStatus(
        `Rendering PDF for ${puzzleSet.displayName} (${i + 1}/${
          generatedPuzzleData.length
        })...`,
        "info"
      );
      await new Promise((r) => setTimeout(r, 10));

      for (let j = 0; j < puzzleSet.puzzlePagesLayouts.length; j++) {
        const pageLayoutData = puzzleSet.puzzlePagesLayouts[j];

        if (currentPageIndex >= puzzleStartPdfPage || (i === 0 && j === 0)) {
          // Add new page if not the very first puzzle page slot
          pdf.addPage();
          currentPageIndex++;
        } else if (currentPageIndex < puzzleStartPdfPage - 1) {
          // Fill up to puzzleStartPdfPage if needed
          while (currentPageIndex < puzzleStartPdfPage - 1) {
            pdf.addPage();
            currentPageIndex++;
            drawPdfPageBackground(
              pdf,
              actualPageW_in,
              actualPageH_in,
              false,
              this.globalSettings
            );
          }
        }

        const currentPdfPageNum = currentPageIndex; // pdf.internal.getNumberOfPages();
        const isRightPage = currentPdfPageNum % 2 === 1; // Assuming page 1 is recto

        // In js/main.js, App.buildFullPdf method, inside the puzzle rendering loop

        const pageLayoutInfo = {
          isRightPage: isRightPage,
          safeLayoutArea: {
            // x: Start of live area from PDF page's left edge (0,0)
            //    PDF page X=0 is the left trim line.
            x: isRightPage
              ? kdpMargins.gutter_from_trim
              : kdpMargins.outside_from_trim + kdpMargins.bleed_allowance,

            // y: Start of live area from PDF page's top edge (0,0)
            //    PDF page Y=0 is kdpMargins.bleed_allowance above the top trim line.
            //    So, top trim line is at Y = kdpMargins.bleed_allowance on PDF page.
            //    Live area starts kdpMargins.top_from_trim below that.
            y: kdpMargins.bleed_allowance + kdpMargins.top_from_trim,

            // w: Width of the live area
            w:
              trimW_in -
              kdpMargins.gutter_from_trim -
              kdpMargins.outside_from_trim,

            // h: Height of the live area
            h:
              trimH_in - kdpMargins.top_from_trim - kdpMargins.bottom_from_trim,
          },
          actualPageW_in: actualPageW_in,
          actualPageH_in: actualPageH_in,
          kdpMargins: kdpMargins, // Pass the whole object for potential use
          trimW_in: trimW_in,
          trimH_in: trimH_in,
          puzzleDisplayName: puzzleSet.displayName,
        };

        //console.log("pagelayout object itself:", pageLayoutInfo);

        // Draw background for the current page (might be on or off depending on puzzle page type)
        const drawBgForThisPage = pageLayoutData.prefersBleedBackground
          ? hasBleed
          : false;
        drawPdfPageBackground(
          pdf,
          actualPageW_in,
          actualPageH_in,
          drawBgForThisPage,
          this.globalSettings
        );

        if (module && typeof module.renderPuzzlePage === "function") {
          module.renderPuzzlePage(
            pdf,
            pageLayoutData,
            pageLayoutInfo,
            this.globalSettings,
            APP_CONFIG
          );
        } else {
          console.error(`renderPuzzlePage not found for ${puzzleSet.type}`);
          pdf.text(
            "Error: Puzzle rendering function missing.",
            pageLayoutInfo.safeLayoutArea.x + 0.5,
            pageLayoutInfo.safeLayoutArea.y + 1
          );
        }
      }
    }

    // --- Solutions Section ---
    if (solutionsCollection.length > 0) {
      PuzzleUI.setStatus("Rendering solutions...", "info");

      // Ensure solutions start on a recto page
      let currentPdfPageNumForSol = currentPageIndex; // pdf.internal.getNumberOfPages();
      if (currentPdfPageNumForSol % 2 !== 0) {
        // If current last page is recto, add a blank verso
        pdf.addPage();
        currentPageIndex++;
        drawPdfPageBackground(
          pdf,
          actualPageW_in,
          actualPageH_in,
          false,
          this.globalSettings
        );
      }

      // Solutions Title Page
      pdf.addPage();
      currentPageIndex++;
      drawPdfPageBackground(
        pdf,
        actualPageW_in,
        actualPageH_in,
        true,
        this.globalSettings
      ); // Typically no bleed for solution title
      const solTitleIsRightPage = currentPageIndex % 2 === 1;
      const solTitlePageLayout = {
        // x: Start of live area from PDF page's left edge (0,0)
        //    PDF page X=0 is the left trim line.
        x: solTitleIsRightPage
          ? kdpMargins.gutter_from_trim
          : kdpMargins.outside_from_trim + kdpMargins.bleed_allowance,

        // y: Start of live area from PDF page's top edge (0,0)
        //    PDF page Y=0 is kdpMargins.bleed_allowance above the top trim line.
        //    So, top trim line is at Y = kdpMargins.bleed_allowance on PDF page.
        //    Live area starts kdpMargins.top_from_trim below that.
        y: kdpMargins.bleed_allowance + kdpMargins.top_from_trim,

        // w: Width of the live area
        w:
          trimW_in - kdpMargins.gutter_from_trim - kdpMargins.outside_from_trim,

        // h: Height of the live area
        h: trimH_in - kdpMargins.top_from_trim - kdpMargins.bottom_from_trim,
      };
      pdf.setFontSize(24);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(
        0,
        solTitlePageLayout.y + solTitlePageLayout.h / 2 - 0.4,
        actualPageW_in,
        0.6,
        "F"
      );
      pdf.text(
        "Solutions",
        solTitlePageLayout.x + solTitlePageLayout.w / 2,
        solTitlePageLayout.y + solTitlePageLayout.h / 2,
        { align: "center" }
      );

      // js/main.js - App.buildFullPdf method

      // --- Solution Gallery Pages ---
      const numSolutionGalleryCols = APP_CONFIG.SOLUTIONS_GALLERY_COLS;
      const numSolutionGalleryRows = Math.ceil(
        APP_CONFIG.SOLUTIONS_PER_PAGE / numSolutionGalleryCols
      );

      let actualSolutionRenderCount = 0; // To track items actually rendered in the gallery

      for (let i = 0; i < solutionsCollection.length; i++) {
        // Iterates per BASKET item's generated solution data
        const solutionSet = solutionsCollection[i]; // This is { type, displayName, layout (which is solutionEntryData), id }
        const module = this.puzzleModules[solutionSet.type];

        // The 'solutionSet.layout' (which is 'solutionEntryData' from the module) might contain multiple individual solutions.
        // Example: AnagramWordSearch returns { moduleInstanceTitle, themedSolutions: [...] } in its solutionEntryData.
        // We need to iterate over `themedSolutions` if it exists.
        // If not, we assume solutionSet.layout is the direct data for a single solution.

        const individualSolutionsToRender = [];
        if (
          solutionSet.layout &&
          Array.isArray(solutionSet.layout.themedSolutions)
        ) {
          // This module instance produced multiple themed solutions
          solutionSet.layout.themedSolutions.forEach((themedSol) => {
            individualSolutionsToRender.push({
              type: solutionSet.type, // Pass down the type
              // displayName: themedSol.themeTitle, // Use the specific theme title for this entry
              // Or use a combination if you want the overall module name too
              displayName: `${solutionSet.displayName} - ${themedSol.themeTitle}`,
              // Pass the actual data for this specific theme's solution
              dataForRenderer: themedSol, // This will be { themeTitle, solutionCanvasDataUrl, wordList, gridDimensions (if added) }
            });
          });
        } else if (solutionSet.layout) {
          // This module instance produced a single solution structure directly in solutionSet.layout
          individualSolutionsToRender.push({
            type: solutionSet.type,
            displayName: solutionSet.displayName,
            dataForRenderer: solutionSet.layout, // Pass the whole layout object
          });
        }

        // Now iterate over the actual individual solutions that need rendering in the gallery
        for (const singleSolution of individualSolutionsToRender) {
          console.log(
            `--- Rendering Solution Item ${actualSolutionRenderCount + 1} ---`
          );
          console.log(
            `APP_CONFIG.SOLUTIONS_PER_PAGE: ${APP_CONFIG.SOLUTIONS_PER_PAGE}`
          );
          console.log(
            `APP_CONFIG.SOLUTIONS_GALLERY_COLS: ${APP_CONFIG.SOLUTIONS_GALLERY_COLS}`
          );
          console.log(`numSolutionGalleryRows: ${numSolutionGalleryRows}`);

          if (actualSolutionRenderCount % APP_CONFIG.SOLUTIONS_PER_PAGE === 0) {
            console.log("Starting new PDF page for solutions.");
            // Start a new solution page
            pdf.addPage();
            currentPageIndex++;
            drawPdfPageBackground(
              pdf,
              actualPageW_in,
              actualPageH_in,
              false,
              this.globalSettings
            );
          }

          const currentSolPdfPageNum = currentPageIndex;
          const solGalleryIsRightPage = currentSolPdfPageNum % 2 === 1;

          const solGalleryPageLayoutInfo = {
            /* ... same as before ... */
            isRightPage: solGalleryIsRightPage,
            safeLayoutArea: {
              // x: Start of live area from PDF page's left edge (0,0)
              //    PDF page X=0 is the left trim line.
              x: solGalleryIsRightPage
                ? kdpMargins.gutter_from_trim
                : kdpMargins.outside_from_trim + kdpMargins.bleed_allowance,

              // y: Start of live area from PDF page's top edge (0,0)
              //    PDF page Y=0 is kdpMargins.bleed_allowance above the top trim line.
              //    So, top trim line is at Y = kdpMargins.bleed_allowance on PDF page.
              //    Live area starts kdpMargins.top_from_trim below that.
              y: kdpMargins.bleed_allowance + kdpMargins.top_from_trim,

              // w: Width of the live area
              w:
                trimW_in -
                kdpMargins.gutter_from_trim -
                kdpMargins.outside_from_trim,

              // h: Height of the live area
              h:
                trimH_in -
                kdpMargins.top_from_trim -
                kdpMargins.bottom_from_trim,
            },
            actualPageW_in: actualPageW_in,
            actualPageH_in: actualPageH_in,
            kdpMargins: kdpMargins,
            trimW_in: trimW_in,
            trimH_in: trimH_in,
          };

          const solIdxOnPage =
            actualSolutionRenderCount % APP_CONFIG.SOLUTIONS_PER_PAGE;
          const solRowOnPage = Math.floor(
            solIdxOnPage / numSolutionGalleryCols
          );
          const solColOnPage = solIdxOnPage % numSolutionGalleryCols;

          const H_PADDING_SOL_GALLERY = 0.15;
          const V_PADDING_SOL_GALLERY = 0.2;

          const solCellW =
            (solGalleryPageLayoutInfo.safeLayoutArea.w -
              (numSolutionGalleryCols - 1) * H_PADDING_SOL_GALLERY) /
            numSolutionGalleryCols;
          const solCellH =
            (solGalleryPageLayoutInfo.safeLayoutArea.h -
              (numSolutionGalleryRows - 1) * V_PADDING_SOL_GALLERY) /
            numSolutionGalleryRows;

          const solEntryLayoutForRender = {
            // Renamed to avoid confusion with module's 'layout' property
            x:
              solGalleryPageLayoutInfo.safeLayoutArea.x +
              solColOnPage * (solCellW + H_PADDING_SOL_GALLERY),
            y:
              solGalleryPageLayoutInfo.safeLayoutArea.y +
              solRowOnPage * (solCellH + V_PADDING_SOL_GALLERY),
            w: solCellW,
            h: solCellH,
            // Pass the specific display name for this individual solution
            displayName: singleSolution.displayName,
          };

          console.log(
            `Solution Item ${
              actualSolutionRenderCount + 1
            } - solIdxOnPage: ${solIdxOnPage}, solRowOnPage: ${solRowOnPage}, solColOnPage: ${solColOnPage}`
          );
          console.log(
            `Calculated solCellW: ${solCellW.toFixed(
              2
            )}in, solCellH: ${solCellH.toFixed(2)}in`
          );
          console.log(
            "Layout for this solution entry (solEntryLayoutForRender):",
            JSON.parse(JSON.stringify(solEntryLayoutForRender))
          ); // Deep copy for logging

          if (module && typeof module.renderSolutionEntry === "function") {
            // Pass `singleSolution.dataForRenderer` as the first argument (the `solutionData` expected by the module)
            module.renderSolutionEntry(
              pdf,
              singleSolution.dataForRenderer,
              solEntryLayoutForRender,
              this.globalSettings,
              APP_CONFIG
            );
          } else {
            console.error(
              `renderSolutionEntry not found for ${singleSolution.type}`
            );
            pdf.text(
              "Solution Error",
              solEntryLayoutForRender.x,
              solEntryLayoutForRender.y + pointsToInches(12)
            );
          }
          actualSolutionRenderCount++;
        }
      }
    }

    // --- Final Steps ---
    // Remove the initial blank page jsPDF often adds if we didn't use it (page 0 in internal array)
    // The logic above tries to use page 1 (index 0) as the front note page.
    // If the first page in PDF is number 1 (title/note) then we're good.
    // If pdf.internal.pages has more pages than currentPageIndex, there might be an issue.
    // Check if the very first page (index 0) is one we explicitly added content to.
    // The above logic ensures pdf.addPage() is called for the first content page.
    // jsPDF default behavior: a blank page is present until addPage is called or content is added to page 1.
    // Our logic starts by adding a page for the front note.

    // If, after all additions, the first page in the sequence (index 0 in pdf.internal.pages)
    // was the one intended for the front matter, we might need to delete an *extra* initial blank page if jsPDF added one *before* our first addPage.
    // However, modern jsPDF usually makes page 1 (index 0) the active page.
    // Let's check if the first page is truly blank and if we have more pages than intended due to it.
    // A common pattern is to delete page 1 if it's empty AND we have other pages.
    // Our currentPageIndex tracks pages we *think* we've added.
    // If pdf.internal.getNumberOfPages() > currentPageIndex, and page 1 is unused.
    const numPdfPages = pdf.internal.getNumberOfPages();
    if (numPdfPages > currentPageIndex && currentPageIndex > 0) {
      // This scenario implies jsPDF might have an initial blank page we didn't use.
      // This can happen if the first content was added to page 2 after an addPage for page 1.
      // For now, assume the page counting logic above is correct.
      // If the output has an extra blank page at the very beginning, this is where to fix it:
      // Example: if (isPageEffectivelyBlank(pdf, 1) && pdf.internal.getNumberOfPages() > 1) pdf.deletePage(1);
    }

    // Add Page Numbers
    // Puzzles start on `puzzleStartPdfPage`. We number from the first actual puzzle page.
    // The displayed number should be 1 for that first puzzle page.
    //if (estimatedPuzzlePages > 0) {
    // Only add page numbers if there are puzzle pages
    // addPageNumbers(
    //   pdf,
    //    totalEstimatedPages,
    //   trimW_in,
    //   trimH_in,
    //   kdpMargins,
    //   1,
    //   puzzleStartPdfPage
    //   );
    //  }
    //
    PuzzleUI.setStatus("PDF assembled. Saving file...", "success");
    pdf.save(
      `PuzzlePress_CustomBook_${new Date().toISOString().slice(0, 10)}.pdf`
    );
    PuzzleUI.setStatus("Done! PDF downloaded.", "success");
  },
};
window.App = App; // <--- ADD THIS LINE
// --- Initialize App ---
// This ensures App.init() runs after the App object is fully defined
// and after all other scripts (including modules) in index.html before main.js have executed.
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

console.log("main.js loaded, App.init will run on DOMContentLoaded.");
