// js/pdf_utils.js
// Assumes jspdf.js is loaded.
// Assumes APP_CONFIG from config.js is available.

// js/pdf_utils.js
/**
 * Calculates KDP margins based on page count.
 * These margins are distances from the TRIM LINE to the start of the live content area.
 * @param {number} pageCount - Total number of pages in the book.
 * @param {boolean} hasBleed - True if the book uses bleed (determines bleed_allowance).
 * @returns {object} {
 *    gutter_from_trim: number,
 *    outside_from_trim: number,
 *    top_from_trim: number,
 *    bottom_from_trim: number,
 *    bleed_allowance: number
 * } (all in inches)
 */
function getKdpMargins(pageCount, hasBleed) {
  const gutterTable = [
    { min: 24, max: 150, g: 0.375 },
    { min: 151, max: 300, g: 0.5 }, // Corrected 0.500
    { min: 301, max: 500, g: 0.625 },
    { min: 501, max: 600, g: 0.75 }, // Corrected 0.750
    { min: 601, max: 700, g: 0.75 }, // KDP guide has 0.75 for 501-600 and 601-700
    { min: 701, max: 828, g: 0.875 }, // KDP guide: > 700 pages is 0.875
  ];

  let selectedGutterEntry = gutterTable.find(
    (b) => pageCount >= b.min && pageCount <= b.max
  );

  if (!selectedGutterEntry) {
    if (pageCount < 24) {
      selectedGutterEntry = gutterTable[0];
    } else {
      selectedGutterEntry = gutterTable[gutterTable.length - 1];
    }
  }

  const calculatedBleedAllowance = hasBleed
    ? APP_CONFIG.KDP_DEFAULT_BLEED_MARGIN_IN
    : 0;
  const KDP_MIN_MARGIN_FROM_TRIM = 0.25; // KDP standard for outside, top, bottom from trim

  return {
    gutter_from_trim: selectedGutterEntry.g,
    outside_from_trim: KDP_MIN_MARGIN_FROM_TRIM,
    top_from_trim: KDP_MIN_MARGIN_FROM_TRIM,
    bottom_from_trim: KDP_MIN_MARGIN_FROM_TRIM,
    bleed_allowance: calculatedBleedAllowance, // Use the calculated variable
  };
}

/**
 * Draws a page background image onto the PDF, scaled to cover and semi-transparent.
 * Manages a rotating index for multiple background images.
 * @param {jsPDF} pdf - The jsPDF instance.
 * @param {number} pageWidth_in - The full width of the PDF page (including bleed).
 * @param {number} pageHeight_in - The full height of the PDF page (including bleed).
 * @param {boolean} showBackground - Whether to actually draw the background.
 * @param {object} globalAppState - The global application state object, must contain:
 *                           { backgroundImages: Array, currentBgIndex: number }
 */
function drawPdfPageBackground(
  pdf,
  pageWidth_in,
  pageHeight_in,
  showBackground,
  globalAppState
) {
  if (
    !showBackground ||
    !globalAppState.backgroundImages ||
    !globalAppState.backgroundImages.length
  ) {
    // Draw a white rectangle to ensure no transparency issues if no bg, and consistent page "feel"
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth_in, pageHeight_in, "F");
    return;
  }

  // Ensure currentBgIndex is initialized
  if (
    typeof globalAppState.currentBgIndex === "undefined" ||
    globalAppState.currentBgIndex >= globalAppState.backgroundImages.length
  ) {
    globalAppState.currentBgIndex = 0;
  }

  const bg = globalAppState.backgroundImages[globalAppState.currentBgIndex];
  // Increment and wrap currentBgIndex for the *next* call
  globalAppState.currentBgIndex =
    (globalAppState.currentBgIndex + 1) %
    globalAppState.backgroundImages.length;

  // Calculate scale to cover. Background images (bg.w, bg.h) are in pixels.
  // pageWidth_in, pageHeight_in are in inches.
  const bgW_in = pointsToInches(bg.w); // Convert bg dimensions to inches for comparison
  const bgH_in = pointsToInches(bg.h);

  const scale = Math.max(pageWidth_in / bgW_in, pageHeight_in / bgH_in);
  const scaledW_in = bgW_in * scale;
  const scaledH_in = bgH_in * scale;
  const x_in = (pageWidth_in - scaledW_in) / 2; // Center the image
  const y_in = (pageHeight_in - scaledH_in) / 2;

  // --- SET OPACITY ---
  // Check if GState is available (it should be with modern jsPDF)
  const hasGStateSupport = pdf.setGState && typeof pdf.GState === "function";
  let originalGState = null;

  if (hasGStateSupport) {
    // It's good practice to save the current GState if you are going to modify it,
    // though for simple opacity, jsPDF might handle it.
    // For opacity, creating a new GState is the standard way.
    const transparentGState = new pdf.GState({
      opacity: 0.5,
      "stroke-opacity": 0.5,
    }); // Apply to fill and stroke
    pdf.setGState(transparentGState);
  }
  // --- END SET OPACITY ---

  pdf.addImage(bg.data, bg.fmt, x_in, y_in, scaledW_in, scaledH_in);

  // --- RESET OPACITY ---
  if (hasGStateSupport) {
    // Reset to default opaque GState
    const opaqueGState = new pdf.GState({
      opacity: 1.0,
      "stroke-opacity": 1.0,
    });
    pdf.setGState(opaqueGState);
  }
  // --- END RESET OPACITY ---
}

/**
 * Renders the front page note (e.g., copyright) onto the PDF. (Consolidated and primary version)
 * @param {jsPDF} pdf - The jsPDF instance.
 * @param {string} noteText - The text of the note.
 * @param {number} actualPageW_in - The full width of the PDF page (including bleed).
 * @param {number} actualPageH_in - The full height of the PDF page (including bleed).
 * @param {object} kdpMargins - The KDP margin object from getKdpMargins().
 * @param {number} fontSizePts - The font size for the note in points.
 */
// js/pdf_utils.js
// renderFrontPageNoteToPdf function
// kdpMargins now has { gutter_from_trim, ..., bleed_allowance }

function renderFrontPageNoteToPdf(
  pdf,
  noteText,
  actualPageW_in,
  actualPageH_in,
  kdpMargins,
  fontSizePts
) {
  if (!noteText || noteText.trim() === "") return;

  pdf.setFont(APP_CONFIG.PDF_FONT_FAMILY || "helvetica", "normal");
  pdf.setFontSize(fontSizePts);

  // Trim dimensions (already known or passed if available, or derive)
  const currentTrimW_in =
    actualPageW_in -
    (kdpMargins.bleed_allowance > 0 ? kdpMargins.bleed_allowance : 0);
  const currentTrimH_in =
    actualPageH_in -
    (kdpMargins.bleed_allowance > 0 ? kdpMargins.bleed_allowance * 2 : 0);

  // KDP states a 0.25" margin for text from trim. Let's use that directly.
  const textSafeMarginFromTrim_in = 0.25; // This is KDP's minimum text safe area from trim

  const liveWidthForNote_in = currentTrimW_in - textSafeMarginFromTrim_in * 2;

  const lines = pdf.splitTextToSize(noteText, liveWidthForNote_in);

  const lineHeightRatio = 1.3;
  const lineHeight_in = pointsToInches(fontSizePts) * lineHeightRatio;
  const textBlockHeight_in = lines.length * lineHeight_in;

  // Y position: Align bottom of text block above the bottom textSafeMarginFromTrim_in from the TRIM edge
  // Top of PDF page (Y=0) is kdpMargins.bleed_allowance above top trim line.
  // Top trim line is at Y = kdpMargins.bleed_allowance.
  // Bottom trim line is at Y = kdpMargins.bleed_allowance + currentTrimH_in.
  // Text block bottom should be at (kdpMargins.bleed_allowance + currentTrimH_in) - textSafeMarginFromTrim_in.
  // So, text block top (yStart_in) = (kdpMargins.bleed_allowance + currentTrimH_in) - textSafeMarginFromTrim_in - textBlockHeight_in;
  const yStart_in =
    kdpMargins.bleed_allowance +
    currentTrimH_in -
    textSafeMarginFromTrim_in -
    textBlockHeight_in;

  // X position: Centered within the currentTrimW_in.
  // Left trim line is at PDF Page X=0.
  const xCenteredOnTrim_in = currentTrimW_in / 2;

  lines.forEach((line, i) => {
    const yBaseline_in =
      yStart_in + i * lineHeight_in + pointsToInches(fontSizePts) * 0.8;
    pdf.text(line, xCenteredOnTrim_in, yBaseline_in, { align: "center" });
  });
}

/**
 * Adds page numbers to the PDF.
 * @param {jsPDF} pdf The jsPDF instance.
 * @param {number} totalBookPages The total number of pages in the book (for KDP margin context).
 * @param {number} trimW_in Trim width of the page in inches.
 * @param {number} trimH_in Trim height of the page in inches.
 * @param {object} kdpMargins The KDP margins object.
 * @param {number} startPageNum The page number to start counting from (e.g., 1 or 3).
 * @param {number} firstPageToNumber The first page in the PDF document to put a number on (jsPDF page index + 1).
 */
function addPageNumbers(
  pdf,
  totalBookPages,
  trimW_in,
  trimH_in,
  kdpMargins,
  startPageNum,
  firstPageToNumber
) {
  const numPages = pdf.internal.getNumberOfPages();
  pdf.setFont(APP_CONFIG.PDF_FONT_FAMILY || "helvetica", "normal");
  pdf.setFontSize(8); // Small font size for page numbers

  const bottomMarginForNumber_in = kdpMargins.bleedMargin + 0.3; // Place number 0.3in from bottom TRIM edge

  for (let i = firstPageToNumber - 1; i < numPages; i++) {
    pdf.setPage(i + 1);
    const pageNum = i + 1 - (firstPageToNumber - 1) + (startPageNum - 1); // Actual displayed page number
    if (pageNum < 1) continue; // Don't number pages before the effective page 1

    const isRightPage = (i + 1) % 2 === (startPageNum % 2 === 1 ? 1 : 0); // Adjust based on if effective page 1 is recto or verso

    let xPos_in;
    if (isRightPage) {
      // Right page (odd display number if startPageNum is odd)
      // Place on outside (right)
      xPos_in = kdpMargins.bleedMargin + trimW_in - kdpMargins.outside; // Align with outside margin
    } else {
      // Left page (even display number if startPageNum is odd)
      // Place on outside (left)
      xPos_in = kdpMargins.bleedMargin + kdpMargins.outside; // Align with outside margin
    }
    const yPos_in =
      kdpMargins.bleedMargin + trimH_in - bottomMarginForNumber_in;

    pdf.text(String(pageNum), xPos_in, yPos_in, {
      align: isRightPage ? "right" : "left",
    });
  }
}

console.log("pdf_utils.js loaded and updated");
