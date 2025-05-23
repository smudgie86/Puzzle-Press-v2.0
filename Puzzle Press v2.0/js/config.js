// js/config.js

const APP_CONFIG = {
  ALPHA: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", // For word/cipher searches
  DIGITS: "0123456789", // For number searches filler

  // --- Grid Defaults (can be overridden by puzzle-specific configs) ---
  DEFAULT_GRID_CELL_SIZE_PX: 28, // For canvas rendering preview
  DEFAULT_GRID_FONT: "bold 14px Futura, Arial, sans-serif", // For canvas rendering

  // --- PDF Styling and Layout ---
  PDF_FONT_FAMILY: "Inter", // Or 'helvetica' if Inter isn't working
  PDF_DEFAULT_TITLE_FONT_SIZE: 18, // For main puzzle titles on puzzle pages (e.g., "Theme Name" on grid page)
  PDF_CLUE_PAGE_TITLE_FONT_SIZE: 12, // For titles on clue pages (was PDF_TITLE_FONT_SIZE in old)
  PDF_CLUE_FONT_SIZE: 8,
  PDF_SOLUTION_TITLE_FONT_SIZE: 12, // For "Solution to Puzzle X" in gallery (was SOLUTION_TITLE_FONT_SIZE)
  PDF_SOLUTION_ANSWERS_FONT_SIZE: 5, // For lists of answers in solutions (was PDF_SOLUTION_ANSWERS_FONT_SIZE)
  PDF_FRONT_NOTE_FONT_SIZE: 9,

  // --- Layout Constants for Clue Pages ---
  CLUE_PAGE_TITLE_STRIP_H_IN: 0.35,
  CLUE_ROW_H_IN: 0.23,
  CLUE_CELL_PAD_X_IN: 0.08,

  // --- Layout Constants for Solution Answer Lists ---
  SOLUTION_ANSWERS_ROW_H_IN: 0.15, // Height for each answer line in the solution list
  // SOLUTION_ANSWERS_HDR_H_IN: 0.25,    // Not directly used in new module structure for list header
  SOLUTION_ANSWERS_COL_GAP_IN: 0.15, // Gap between columns in the answer list
  SOLUTION_ANSWERS_SIDE_PAD_IN: 0.1, // Padding on the sides of the answer list panel

  // --- Layout Constants for Solution Grid Images ---
  SOLUTION_CANVAS_SCALE_FACTOR: 0.9, // How much to scale the solution canvas within its allocated space

  // --- Layout Constants for Grid Pages ---
  GRID_PAGE_TITLE_AREA_H_IN: 0.6, // Space for title above a grid

  // --- Solution Gallery Layout (already defined) ---
  SOLUTIONS_PER_PAGE: 2, // <<<< YOUR ORIGINAL WAS 2-UP. LET'S CHANGE THIS.
  SOLUTIONS_GALLERY_COLS: 1, // <<<< If 2-up means 2 items vertically, then 1 column.
  // If 2-up means 1 item using left half, other using right half, it's more complex or 2 cols for 2 items.
  // The old code implies: 2 solutions PER PAGE, each taking full width, stacked vertically.
  // OR it means a 2x1 or 1x2 grid.
  // The original code (buildWordSearchPdf) structure for solutions:
  // if (i % 2 === 0) { pdf.addPage(); ... } implies two solutions vertically per page.
  // solCellW_in = solutionsSafeLayout.w / 2; << This was for answers list on left, canvas on right for *one* solution.
  // This means ONE solution took up half the page height (solCellH_in = solutionsSafeLayout.h / 2)

  // Let's assume SOLUTIONS_PER_PAGE: 2 and SOLUTIONS_GALLERY_COLS: 1 for now (2 solutions stacked vertically)

  // --- KDP Related (some might be dynamic based on page count) ---
  KDP_DEFAULT_BLEED_MARGIN_IN: 0.125,
  KDP_DEFAULT_OUTSIDE_MARGIN_NO_BLEED_IN: 0.25,
  KDP_DEFAULT_OUTSIDE_MARGIN_WITH_BLEED_IN: 0.375,
  // Gutter margins are page-count dependent, see getKdpMargins in pdf_utils.js

  // --- Puzzle Building ---
  MAX_PUZZLE_BUILD_ATTEMPTS: 400, // For word/number search grid generation

  // --- Specific Layout Constants (from wordsearch_common.js, review if still needed globally or move to modules) ---
  // These might be better suited for individual puzzle module configs or dynamic calculation
  CLUE_PAGE_TITLE_STRIP_H_IN: 0.35,
  CLUE_ROW_H_IN: 0.23, // Height of a single clue row
  CLUE_CELL_PAD_X_IN: 0.08,

  SOLUTION_ANSWERS_ROW_H_IN: 0.15,
  SOLUTION_ANSWERS_HDR_H_IN: 0.25, // Header for solution lists
  SOLUTION_ANSWERS_COL_GAP_IN: 0.15,
  SOLUTION_ANSWERS_SIDE_PAD_IN: 0.1,
  SOLUTION_CANVAS_SCALE_FACTOR: 0.9, // For solution grid images

  GRID_PAGE_TITLE_AREA_H_IN: 0.6, // Space for title above a grid

  MAZE_PDF_CELL_SIZE_PT: 18, // Default for maze cells in PDF
  MAZE_SOLUTION_PATH_COLOR: "#FF7070",
  MAZE_WALL_COLOR: "black",
  MAZE_START_MARKER_COLOR: "#70FF70",
  MAZE_END_MARKER_COLOR: "#7070FF",
};

console.log("config.js loaded");
