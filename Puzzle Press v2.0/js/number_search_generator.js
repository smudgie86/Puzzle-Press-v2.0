// js/number_search_generator.js

/**
 * Generates a random integer between min (inclusive) and max (inclusive).
 * NOTE: A version of this also exists in utils.js. Ensure consistency or pick one source.
 * For modularity, if number_search_generator.js is self-contained for its specific logic,
 * having its own getRandomInt might be fine, or it could call window.getRandomInt if utils.js is guaranteed loaded first.
 * Let's assume it can have its own for now, or that utils.js version will be used if available.
 */
function getRandomIntInternal(min, max) {
  // Renamed to avoid conflict if utils.js is also loaded and has one
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
// If utils.js and its getRandomInt is loaded before this script,
// you can directly use getRandomInt from utils.js.
// Otherwise, use getRandomIntInternal or ensure this file has its own.
// For simplicity, let's assume utils.js's getRandomInt is preferred if this script is part of the larger app.
// If this script were standalone, getRandomIntInternal would be fine.
// We'll use window.getRandomInt, assuming utils.js populates it.

/**
 * Generates a random number string of a given length.
 * @param {number} minLength
 * @param {number} maxLength
 * @returns {string}
 */
function generateRandomNumberString(minLength, maxLength) {
  // Use the global getRandomInt from utils.js if available, otherwise fallback.
  const getRandInt =
    typeof getRandomInt === "function" ? getRandomInt : getRandomIntInternal;

  const length = getRandInt(minLength, maxLength);
  let numberStr = "";
  for (let i = 0; i < length; i++) {
    numberStr += getRandInt(0, 9).toString();
  }
  // Avoid leading zeros for multi-digit numbers if they are to be treated as actual numbers elsewhere
  if (length > 1 && numberStr.startsWith("0")) {
    numberStr = getRandInt(1, 9).toString() + numberStr.substring(1);
  }
  return numberStr;
}

/**
 * Generates a calculation clue for a target number.
 * @param {number} targetNumber The number to find.
 * @param {'easy' | 'medium' | 'hard'} difficulty
 * @param {number | null} previousAnswer For 'hard' difficulty chained clues.
 * @returns {{clue: string, answer: number}}
 */
function generateCalculationClue(
  targetNumber,
  difficulty,
  previousAnswer = null
) {
  // Use the global getRandomInt from utils.js if available, otherwise fallback.
  const getRandInt =
    typeof getRandomInt === "function" ? getRandomInt : getRandomIntInternal;

  let clue = "";
  const operations = ["+", "-", "*", "/"];
  let op1, op2, op3, chosenOp1, chosenOp2;

  if (
    difficulty === "hard" &&
    previousAnswer !== null &&
    previousAnswer !== 0 /* Avoid division by zero in some cases */ &&
    targetNumber !== previousAnswer /* Avoid PREV_ANS * 1 = PREV_ANS */
  ) {
    const usePrevAsOperandChance = 0.7;

    if (Math.random() < usePrevAsOperandChance) {
      chosenOp1 = operations[getRandInt(0, operations.length - 1)];

      // Try: PREV_ANS op X = target  OR  X op PREV_ANS = target
      if (chosenOp1 === "+" && targetNumber - previousAnswer !== 0) {
        // X = target - PREV_ANS
        op2 = targetNumber - previousAnswer;
        clue = `PREV_ANS + ${op2}`;
        if (op2 < 0) clue = `PREV_ANS - ${Math.abs(op2)}`;
      } else if (
        chosenOp1 === "-" &&
        previousAnswer - targetNumber !== 0 &&
        Math.random() < 0.5
      ) {
        // PREV_ANS - X = target => X = PREV_ANS - target
        op2 = previousAnswer - targetNumber;
        clue = `PREV_ANS - ${op2}`;
        if (op2 < 0) clue = `PREV_ANS + ${Math.abs(op2)}`;
      } else if (chosenOp1 === "-" && targetNumber + previousAnswer !== 0) {
        // X - PREV_ANS = target => X = target + PREV_ANS
        op1 = targetNumber + previousAnswer;
        clue = `${op1} - PREV_ANS`;
      } else if (
        chosenOp1 === "*" &&
        previousAnswer !== 0 &&
        targetNumber % previousAnswer === 0 &&
        targetNumber / previousAnswer !== 1 &&
        targetNumber / previousAnswer !== 0
      ) {
        // PREV_ANS * X = target
        op2 = targetNumber / previousAnswer;
        clue = `PREV_ANS * ${op2}`;
      } else if (
        chosenOp1 === "/" &&
        targetNumber !== 0 &&
        previousAnswer % targetNumber === 0 &&
        previousAnswer / targetNumber !== 1 &&
        previousAnswer / targetNumber !== 0 &&
        Math.random() < 0.5
      ) {
        // PREV_ANS / X = target
        op2 = previousAnswer / targetNumber;
        clue = `PREV_ANS / ${op2}`;
      } else if (
        chosenOp1 === "/" &&
        previousAnswer !== 0 &&
        previousAnswer !== 1 &&
        targetNumber * previousAnswer !== 0
      ) {
        // X / PREV_ANS = target
        op1 = targetNumber * previousAnswer;
        // Ensure op1 is not excessively large or small to keep clues reasonable
        if (
          op1 > 0 &&
          op1 < 1000000 &&
          previousAnswer > 0 &&
          op1 / previousAnswer === targetNumber
        ) {
          // Check for reasonable result
          clue = `${op1} / PREV_ANS`;
        }
      }
    }
    if (!clue) difficulty = "medium"; // Fallback if chained clue wasn't easily formed
  }

  if (difficulty === "easy") {
    chosenOp1 = operations[getRandInt(0, 1)]; // Prefer + and - for easy
    let maxOperand = Math.max(10, targetNumber * 2); // Keep operands reasonable for easy

    switch (chosenOp1) {
      case "+":
        op2 = getRandInt(1, Math.max(1, targetNumber - 1));
        if (targetNumber === 0) op2 = getRandInt(1, 20); // Avoid 0-0 for 0
        op1 = targetNumber - op2;
        if (op1 >= 0 && op2 > 0 && op1 <= maxOperand && op2 <= maxOperand)
          clue = `${op1} + ${op2}`;
        break;
      case "-":
        op2 = getRandInt(1, Math.max(1, targetNumber + 20)); // Allow op1 to be larger
        op1 = targetNumber + op2;
        if (op1 > 0 && op2 > 0 && op1 <= maxOperand && op2 <= maxOperand * 1.5)
          clue = `${op1} - ${op2}`;
        break;
      case "*":
        if (targetNumber > 1) {
          for (let i = 2; i * i <= targetNumber; i++) {
            if (targetNumber % i === 0) {
              op1 = i;
              op2 = targetNumber / i;
              if (
                op1 !== 1 &&
                op2 !== 1 &&
                op1 <= maxOperand &&
                op2 <= maxOperand
              ) {
                clue = `${op1} * ${op2}`;
                if (Math.random() < 0.5) clue = `${op2} * ${op1}`;
              }
              break;
            }
          }
        }
        break;
      case "/":
        if (targetNumber > 0) {
          op2 = getRandInt(2, 10);
          op1 = targetNumber * op2;
          if (op1 > 0 && op2 > 0 && op1 <= maxOperand * 2 && op2 <= maxOperand)
            clue = `${op1} / ${op2}`;
        }
        break;
    }
    if (!clue) {
      // Fallback for easy if ops didn't form well (e.g. prime for *, or target is 0/1)
      op2 = getRandInt(0, Math.max(1, targetNumber));
      if (targetNumber === 0 && op2 === 0 && Math.random() < 0.5)
        op2 = getRandInt(1, 10); // make 0 + 5 or 5 - 5
      op1 = targetNumber - op2;
      if (op1 >= 0 && op2 >= 0) {
        // Allow + 0 for simplicity if needed
        clue = `${op1} + ${op2}`;
      } else {
        // Ultimate fallback for very small targetNumbers or negatives
        clue = `${targetNumber} * 1`; // Should be rare
      }
    }
  }

  if (difficulty === "medium" && !clue) {
    // (A op1 B) op2 C = target OR A op1 (B op2 C) = target
    // Simplified forward generation: (X op Y) op Z = target
    let part1, part2, finalPart;
    let opA, opB;
    let intermediateResult;

    opA = operations[getRandInt(0, operations.length - 1)];
    opB = operations[getRandInt(0, operations.length - 1)];

    // Try to make intermediateResult close to target or something that combines well.
    // Generate three operands first
    part1 = getRandInt(1, 50);
    part2 = getRandInt(1, 30);
    part3 = getRandInt(1, 20); // This will be finalPart for (X op Y) op Z

    // Calculate (part1 opA part2)
    if (opA === "+") intermediateResult = part1 + part2;
    else if (opA === "-") intermediateResult = part1 - part2;
    else if (opA === "*") intermediateResult = part1 * part2;
    else {
      // opA === '/'
      if (part2 !== 0 && part1 % part2 === 0 && part1 / part2 !== 0)
        intermediateResult = part1 / part2;
      else {
        // Division problematic, fallback to * or +
        intermediateResult = part1 + part2;
        opA = "+";
      }
    }
    if (intermediateResult <= 0 && opA !== "*" && opA !== "-")
      intermediateResult = Math.abs(intermediateResult) + getRandInt(1, 5);

    // Now, intermediateResult opB part3 = targetNumber
    if (opB === "+") {
      // intermediateResult + part3 = target  => part3 = target - intermediateResult
      part3 = targetNumber - intermediateResult;
    } else if (opB === "-") {
      // intermediateResult - part3 = target => part3 = intermediateResult - targetNumber
      part3 = intermediateResult - targetNumber;
    } else if (opB === "*") {
      // intermediateResult * part3 = target
      if (
        intermediateResult !== 0 &&
        targetNumber % intermediateResult === 0 &&
        targetNumber / intermediateResult !== 0
      ) {
        part3 = targetNumber / intermediateResult;
      } else {
        // Fallback if not clean multiply
        opB = "+";
        part3 = targetNumber - intermediateResult;
      }
    } else {
      // opB === '/' (intermediateResult / part3 = target)
      if (
        targetNumber !== 0 &&
        intermediateResult !== 0 &&
        intermediateResult % targetNumber === 0 &&
        intermediateResult / targetNumber !== 0
      ) {
        part3 = intermediateResult / targetNumber;
      } else {
        // Fallback if not clean divide
        opB = "-";
        part3 = intermediateResult - targetNumber;
      }
    }

    // Ensure part3 is a somewhat reasonable integer
    part3 = Math.round(part3);
    if (part3 === 0 && targetNumber !== intermediateResult)
      part3 = targetNumber > intermediateResult ? 1 : -1; // Avoid op 0 if not intended
    if (Math.abs(part3) > 100) {
      // If part3 became too large, simplify
      clue = ""; // Force fallback to easy
      difficulty = "easy"; // Re-trigger easy logic below
    } else {
      clue = `(${part1} ${opA} ${part2}) ${opB} ${part3}`;
      if (opB === "+" && part3 < 0)
        clue = `(${part1} ${opA} ${part2}) - ${Math.abs(part3)}`;
      if (opB === "-" && part3 < 0)
        clue = `(${part1} ${opA} ${part2}) + ${Math.abs(part3)}`;
    }

    // Fallback if medium operation too complex or didn't form, try easy
    if (!clue) {
      chosenOp1 = operations[getRandInt(0, 1)];
      if (chosenOp1 === "+") {
        op2 = getRandInt(1, Math.max(1, targetNumber - 1));
        op1 = targetNumber - op2;
        if (op1 >= 0 && op2 > 0) clue = `${op1} + ${op2}`;
        else clue = `${targetNumber} + 0`;
      } else {
        op2 = getRandInt(1, Math.max(1, targetNumber + 20));
        op1 = targetNumber + op2;
        if (op1 > 0 && op2 > 0) clue = `${op1} - ${op2}`;
        else clue = `${targetNumber} - 0`;
      }
    }
  }

  if (!clue) {
    // Ultimate fallback if all else failed (e.g. hard fell to medium which failed)
    clue = `${targetNumber > 0 ? targetNumber - 1 : targetNumber + 1} ${
      targetNumber > 0 ? "+" : "-"
    } 1`;
    if (targetNumber === 0) clue = `1 - 1`;
    if (targetNumber === 1 && previousAnswer === null) clue = `1 * 1`; // Avoid 0+1 if possible
  }

  // Sanity check with eval
  let evaluatedAnswer;
  try {
    const evalClue = clue.replace(
      /PREV_ANS/g,
      previousAnswer !== null ? String(previousAnswer) : "0"
    );
    // Basic eval, be careful. For more complex math, a proper parser/evaluator is better.
    // This simple eval might fail for order of operations if not perfectly parenthesized.
    evaluatedAnswer = new Function(`return ${evalClue}`)();
  } catch (e) {
    console.error(
      "Error evaluating clue:",
      clue,
      "Previous:",
      previousAnswer,
      "Target:",
      targetNumber,
      e
    );
    clue = `${targetNumber}`; // Fallback if eval fails (should not happen with controlled generation)
    evaluatedAnswer = targetNumber;
  }

  if (Math.round(evaluatedAnswer) !== targetNumber) {
    console.warn(
      `Clue "${clue}" (eval: ${evaluatedAnswer}, rounded: ${Math.round(
        evaluatedAnswer
      )}) did not match target ${targetNumber}. Previous: ${previousAnswer}. Defaulting.`
    );
    let b = getRandInt(1, 10);
    if (targetNumber >= b) {
      clue = `${targetNumber - b} + ${b}`;
    } else if (targetNumber <= -b) {
      clue = `${targetNumber + b} - ${b}`;
    } else {
      clue = `${targetNumber + b} - ${b}`; // Default add/subtract
    }
    if (targetNumber === 0) clue = `${b} - ${b}`;
  }

  return { clue: clue.replace(/\s\s+/g, " ").trim(), answer: targetNumber };
}

// Make functions available globally if this script is included directly,
// or they can be part of an exported object if using modules.
// For the current multi-file setup, they need to be global or explicitly imported/passed.
// Let's assume for now they become global when this script is loaded.
// If using a bundler/module system, you'd export them.

console.log("number_search_generator.js loaded");
