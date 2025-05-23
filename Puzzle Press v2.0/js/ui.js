// js/ui.js
// Manages UI interactions like modals, dynamic form updates, basket rendering.
// Assumes DOM_ELEMENTS is defined in main.js and passed or accessed globally.
// Assumes APP_STATE for basket data.

const PuzzleUI = {
    modal: null,
    modalTitle: null,
    modalFormContainer: null,
    savePuzzleConfigBtn: null,
    closeModalBtn: null,
    puzzleBasketContainer: null,
    emptyBasketMsg: null,
    currentEditingPuzzleId: null, // To know if we are editing or adding new

    init(domElements) {
        this.modal = domElements.puzzleConfigModal;
        this.modalTitle = domElements.modalTitle;
        this.modalFormContainer = domElements.modalFormContainer;
        this.savePuzzleConfigBtn = domElements.savePuzzleConfigBtn;
        this.closeModalBtn = domElements.closeModalBtn;
        this.puzzleBasketContainer = domElements.puzzleBasketContainer;
        this.emptyBasketMsg = domElements.emptyBasketMsg;

        this.closeModalBtn.onclick = () => this.hideModal();
        window.onclick = (event) => {
            if (event.target === this.modal) {
                this.hideModal();
            }
        };
    },

    showModal(title, formHTML, isEditing = false) {
        this.modalTitle.textContent = title;
        this.modalFormContainer.innerHTML = formHTML; // Puzzle-specific form
        this.savePuzzleConfigBtn.textContent = isEditing ? "Update Puzzle" : "Add to Basket";
        this.modal.style.display = "block";
        // Call any puzzle-specific UI setup function if needed after formHTML is injected
        const puzzleType = window.App.getCurrentPuzzleTypeForModal(); // App needs to track this
        if (window.PuzzleModules && window.PuzzleModules[puzzleType] && typeof window.PuzzleModules[puzzleType].postProcessForm === 'function') {
            window.PuzzleModules[puzzleType].postProcessForm(this.modalFormContainer);
        }
    },

    hideModal() {
        this.modal.style.display = "none";
        this.modalFormContainer.innerHTML = ""; // Clear form
        this.currentEditingPuzzleId = null;
    },

    renderBasket(basket) {
        this.puzzleBasketContainer.innerHTML = ''; // Clear current basket
        if (basket.length === 0) {
            this.puzzleBasketContainer.appendChild(this.emptyBasketMsg);
            this.emptyBasketMsg.style.display = 'block';
            return;
        }
        this.emptyBasketMsg.style.display = 'none';

        basket.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'puzzle-item';
            div.setAttribute('data-id', item.id);
            div.setAttribute('draggable', true); // For drag-and-drop reordering

            let details = `Type: ${item.config.typeDisplay || item.config.type}`;
            // Add more specific details based on puzzle type if available in item.config
            if (item.config.theme) details += `, Theme: ${item.config.theme}`;
            if (item.config.numWords) details += `, Words: ${item.config.numWords}`;
            if (item.config.difficulty) details += `, Difficulty: ${item.config.difficulty}`;
            if (item.config.gridSize) details += `, Grid: ${item.config.gridSize.rows}x${item.config.gridSize.cols}`;
            if (item.config.numMazes) details += `, Mazes: ${item.config.numMazes}`; // For maze series
            if (item.config.numItems) details += `, Items: ${item.config.numItems}`;


            div.innerHTML = `
                <div class="puzzle-item-info">
                    <span class="puzzle-item-name">Puzzle ${index + 1}: ${item.displayName || item.config.typeDisplay || item.config.type}</span>
                    <p class="puzzle-item-details">${item.summary || 'Configuration details here.'}</p>
                </div>
                <div class="puzzle-item-actions">
                    <button class="edit-btn small-btn secondary-action" data-id="${item.id}">Edit</button>
                    <button class="remove-btn small-btn danger-action" data-id="${item.id}">Remove</button>
                    <button class="move-up-btn small-btn move-btn" data-id="${item.id}" ${index === 0 ? 'disabled' : ''}>▲</button>
                    <button class="move-down-btn small-btn move-btn" data-id="${item.id}" ${index === basket.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
            `;
            this.puzzleBasketContainer.appendChild(div);
        });
        this.addBasketEventListeners();
    },
    
    addBasketEventListeners() {
        // Event listeners for edit, remove, move buttons will be delegated or added by main.js
        // For drag and drop (simplified version):
        let draggedItem = null;
        this.puzzleBasketContainer.querySelectorAll('.puzzle-item').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                draggedItem = item;
                setTimeout(() => item.style.opacity = '0.5', 0);
            });
            item.addEventListener('dragend', (e) => {
                setTimeout(() => {
                    item.style.opacity = '1';
                    draggedItem = null;
                }, 0);
                 // After drag, re-evaluate order and update App.puzzleBasket
                 // This needs a more robust implementation by comparing visual order to data order.
                 window.App.updateBasketOrderFromDOM();
            });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = getDragAfterElement(this.puzzleBasketContainer, e.clientY);
                if (afterElement == null) {
                    this.puzzleBasketContainer.appendChild(draggedItem);
                } else {
                    this.puzzleBasketContainer.insertBefore(draggedItem, afterElement);
                }
            });
        });

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll('.puzzle-item:not(.dragging)')];
            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect();
                const offset = y - box.top - box.height / 2;
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child };
                } else {
                    return closest;
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element;
        }
    },

    setStatus(message, type = 'info') { // type can be 'info', 'success', 'error'
        const statusDiv = document.getElementById('statusDiv'); // Assuming it's available
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = `status-${type}`; // Add classes for styling
        }
        console.log(`Status (${type}): ${message}`);
    }
};

console.log("ui.js loaded");