<script lang="ts">
import { ref, computed, defineComponent, onMounted } from 'vue';
import type { Ref } from 'vue';
import CellState from './models/CellState';
import SudokuCell from './components/SudokuCell.vue';
import SudokuGrid from './components/SudokuGrid.vue';

import PuzzleSet from './models/SudokuPuzzleSet.json';
import { SudokuSolver } from './services/SudokuSolver';

export default defineComponent({
  components: {
    SudokuCell,
    SudokuGrid
  },
  setup() {
    const sudokuLevel = ref(3); // n
    const gridSize = computed(() => sudokuLevel.value ** 2); // n*n
    const difficulty: Ref<("medium" | "extreme")> = ref("medium");

    const grid: Ref<CellState[][]> = ref(
      Array(gridSize.value)
        .fill(null).map((_, i) =>
          Array(gridSize.value).fill(null).map((_, j) =>
            new CellState()
          )
        )
    );

    const pencilGrid: Ref<boolean[][][]> = ref(Array(gridSize.value).fill(Array(gridSize.value).fill(Array(9).fill(false))))
    const selectedIndexes = ref([-1, -1])
    const pencilMode = ref(false);
    const quickPencilAllEnabled = ref(false);
    const gameStartTime = ref<number>(0);
    const elapsedTime = ref<number>(0);
    const timerInterval = ref<number | null>(null);
    const score = ref<number>(0);
    const isGameComplete = ref<boolean>(false);

    const isSelecting = computed(() => (selectedIndexes.value[0] >= 0
      && selectedIndexes.value[0] < gridSize.value
      && selectedIndexes.value[1] >= 0
      && selectedIndexes.value[1] < gridSize.value)
    )

    const selectedValue = computed(() => isSelecting.value ? grid.value[selectedIndexes.value[0]][selectedIndexes.value[1]].cellValue : null);

    function startTimer() {
      gameStartTime.value = Date.now();
      timerInterval.value = window.setInterval(() => {
        elapsedTime.value = Math.floor((Date.now() - gameStartTime.value) / 1000);
      }, 1000);
    }

    function stopTimer() {
      if (timerInterval.value) {
        clearInterval(timerInterval.value);
        timerInterval.value = null;
      }
    }

    function calculateScore() {
      // Simple scoring based on time taken
      score.value = Math.max(1000 - elapsedTime.value * 2, 0);
    }

    function generateSudoku(difficultyLevel: "extreme" | "medium"): number[] {
      const puzzle = PuzzleSet[difficultyLevel][Math.floor(Math.random() * PuzzleSet[difficultyLevel].length)] as number[];
      return puzzle;
    }

    function clearAll() {
      grid.value = Array(gridSize.value)
        .fill(null).map((_, i) =>
          Array(gridSize.value).fill(null).map((_, j) =>
            new CellState()
          )
        );
      selectedIndexes.value = [-1, -1];
      pencilMode.value = false;
      quickPencilAllEnabled.value = false;
    }

    function newGame() {
      clearAll();
      const puzzle: number[] = generateSudoku(difficulty.value);

      grid.value = Array(gridSize.value)
        .fill(null).map((_, i) =>
          Array(gridSize.value).fill(null).map((_, j) =>
            new CellState(puzzle[i * gridSize.value + j] || null)
          )
        );
      isGameComplete.value = false;
      stopTimer();
      elapsedTime.value = 0;
      score.value = 0;
      startTimer();
    }

    function solvePuzzle() {
      const solver = new SudokuSolver(sudokuLevel.value);
      const currentGrid = grid.value.map(row => 
        row.map(cell => cell.cellValue)
      );
      const solution = solver.solve(currentGrid);
      
      if (solution) {
        // Apply solution to grid
        for (let i = 0; i < gridSize.value; i++) {
          for (let j = 0; j < gridSize.value; j++) {
            if (grid.value[i][j].cellValue === null) {
              grid.value[i][j].cellValue = solution[i][j];
            }
          }
        }
        isGameComplete.value = true;
        stopTimer();
        calculateScore();
      }
    }

    function registerKeyboardEvents() {
      const ALLOWED_KEYS: { [key: string]: number | null } = {
        'Delete': null,
        'Backspace': null,
        'Digit1': 1,
        'Digit2': 2,
        'Digit3': 3,
        'Digit4': 4,
        'Digit5': 5,
        'Digit6': 6,
        'Digit7': 7,
        'Digit8': 8,
        'Digit9': 9,
        'Numpad1': 1,
        'Numpad2': 2,
        'Numpad3': 3,
        'Numpad4': 4,
        'Numpad5': 5,
        'Numpad6': 6,
        'Numpad7': 7,
        'Numpad8': 8,
        'Numpad9': 9,
        'KeyQ': 10,
        'KeyB': 11,
        'KeyC': 12,
        'KeyD': 13,
        'KeyE': 14,
        'KeyF': 15,
      };

      window.addEventListener('keydown', (ev) => {
        if (ev.code in ALLOWED_KEYS) {
          assignCell(ALLOWED_KEYS[ev.code])
          return;
        }

        if (!isSelecting.value) return;

        if (ev.code == 'Space') {
          togglePencilMode()
          return;
        }

        if (ev.code == 'AltLeft') {
          quickPencilCell()
          return;
        }

        const i = selectedIndexes.value[0];
        const j = selectedIndexes.value[1]
        if (ev.code == 'ArrowRight') {
          selectedIndexes.value = [i, (j >= gridSize.value - 1) ? j : j + 1];
          return;
        }

        if (ev.code == 'ArrowLeft') {
          selectedIndexes.value = [i, j === 0 ? j : j - 1];
          return;
        }

        if (ev.code == 'ArrowUp') {
          selectedIndexes.value = [i === 0 ? i : i - 1, j];
          return;
        }

        if (ev.code == 'ArrowDown') {
          selectedIndexes.value = [i >= gridSize.value - 1 ? i : i + 1, j];
          return;
        }
      });
    }

    function togglePencilMode(): void {
      pencilMode.value = !pencilMode.value;
    }

    function selectCell(i: number, j: number): void {
      selectedIndexes.value = [i, j];
    }

    function clearSelection(): void { 
      selectedIndexes.value = [-1, -1]; 
    }

    function judgeCell(i: number, j: number): boolean {
      let hasError = false;

      const value = grid.value[i][j].cellValue;

      if (value == null) {
        setGridWrongValue(i, j, false); // in case when a cell value is deleted
        return true;
      }

      // Judge row and column
      for (let k = 0; k < gridSize.value; k++) {
        if (value === grid.value[i][k].cellValue && j != k) {
          hasError = true;

          setGridWrongValue(i, k);
        }

        if (value === grid.value[k][j].cellValue && i != k) {
          hasError = true;
          setGridWrongValue(k, j);
        }
      }
      // Judge current square
      const startI = i - i % sudokuLevel.value;
      const startJ = j - j % sudokuLevel.value;

      const endI = startI + sudokuLevel.value;
      const endJ = startJ + sudokuLevel.value;

      for (let k = startI; k < endI; k++) {
        for (let m = startJ; m < endJ; m++) {
          if (i == k && j == m) continue; // Skip the current cell

          if (value === grid.value[k][m].cellValue) {
            hasError = true;

            setGridWrongValue(k, m);
          }
        }
      }

      setGridWrongValue(i, j, hasError);

      return !hasError;// true if okay
    }

    function checkCellValue(i: number, j: number, value: number | null, setWrong: boolean = true): boolean {
      if (value === null) return true;
      
      // Check row
      for (let col = 0; col < gridSize.value; col++) {
        if (col !== j && grid.value[i][col].cellValue === value) {
          if (setWrong) {
            setGridWrongValue(i, col, true);
            setGridWrongValue(i, j, true);
          }
          return false;
        }
      }

      // Check column
      for (let row = 0; row < gridSize.value; row++) {
        if (row !== i && grid.value[row][j].cellValue === value) {
          if (setWrong) {
            setGridWrongValue(row, j, true);
            setGridWrongValue(i, j, true);
          }
          return false;
        }
      }

      // Check box
      const boxSize = sudokuLevel.value;
      const boxStartRow = Math.floor(i / boxSize) * boxSize;
      const boxStartCol = Math.floor(j / boxSize) * boxSize;
      
      for (let row = 0; row < boxSize; row++) {
        for (let col = 0; col < boxSize; col++) {
          const currentRow = boxStartRow + row;
          const currentCol = boxStartCol + col;
          if ((currentRow !== i || currentCol !== j) && 
              grid.value[currentRow][currentCol].cellValue === value) {
            if (setWrong) {
              setGridWrongValue(currentRow, currentCol, true);
              setGridWrongValue(i, j, true);
            }
            return false;
          }
        }
      }

      return true;
    }

    function assignCell(n: number | null): void {
      if (!isSelecting.value) return;

      const [i, j] = selectedIndexes.value;

      if (grid.value[i][j].isPrefilled) return;

      if (pencilMode.value) {
        if (n === null) {
          clearPencilGridCell(i, j);
          return;
        }
        togglePencilGridValue(i, j, n);
        return;
      }

      // Clear all wrong marks
      for (let row = 0; row < gridSize.value; row++) {
        for (let col = 0; col < gridSize.value; col++) {
          setGridWrongValue(row, col, false);
        }
      }
      
      // Set the value
      grid.value[i][j].cellValue = n;

      // If a value was entered (not cleared), check if it's correct
      if (n !== null) {
        checkCellValue(i, j, n);
      }

      // Clear pencil marks when setting a value
      clearPencilGridCell(i, j);
      
      // If Quick Pencil All is enabled, update pencil marks
      if (quickPencilAllEnabled.value) {
        quickPencilAll();
      }

      // Check if the board is complete
      judgeBoard();
    }

    function judgeBoard(): void {
      let isComplete = true;
      
      for (let i = 0; i < gridSize.value; i++) {
        for (let j = 0; j < gridSize.value; j++) {
          // Check if cell is empty
          if (grid.value[i][j].cellValue === null) {
            isComplete = false;
            return;
          }
          // Check if cell is correct
          if (!judgeCell(i, j)) {
            isComplete = false;
            return;
          }
        }
      }

      // Only if all cells are filled and correct
      if (isComplete) {
        isGameComplete.value = true;
        stopTimer();
        calculateScore();
      }
    }

    function setGridValue(i: number, j: number, cellState: CellState): void {
      let modifiedRow = grid.value[i].slice(0);

      modifiedRow[j] = cellState;

      grid.value[i] = modifiedRow;
    }

    function togglePencilGridValue(i: number, j: number, n: number): void {
      const row = pencilGrid.value[i].slice(0);

      const arr = row[j].slice(0);

      arr[n - 1] = !arr[n - 1];

      row[j] = arr;
      pencilGrid.value[i] = row;
    }

    function clearPencilGridCell(i: number, j: number): void {
      const row = pencilGrid.value[i].slice(0);

      row[j] = new Array(gridSize.value).fill(false);
      pencilGrid.value[i] = row;
    }

    function setGridWrongValue(i: number, j: number, wrong = true) {
      setGridValue(i, j, {
        ...grid.value[i][j],
        isWrong: wrong,
      })
    }

    function quickPencilCell() {
      if (!isSelecting.value) return;
      const [i, j] = selectedIndexes.value;
      if (grid.value[i][j].cellValue !== null) return;
      
      pencilMode.value = true;
      clearPencilGridCell(i, j);
      const savedValue = grid.value[i][j].cellValue;
      for (let n = 1; n <= gridSize.value; n++) {
        if (checkCellValue(i, j, n, false)) {
          togglePencilGridValue(i, j, n);
        }
      }
      grid.value[i][j].cellValue = savedValue;
      pencilMode.value = false;
    }

    function quickPencilAll() {
      const savedMode = pencilMode.value;
      for (let i = 0; i < gridSize.value; i++) {
        for (let j = 0; j < gridSize.value; j++) {
          selectedIndexes.value = [i, j]
          clearPencilGridCell(i, j);
          quickPencilCell()
        }
      }
      clearSelection();

      pencilMode.value = savedMode;
    }

    function toggleQuickPencilAll() {
      quickPencilAllEnabled.value = !quickPencilAllEnabled.value;
      quickPencilAll(); // Always run quickPencilAll when button is clicked
    }

    function updatePencilGridValues(i: number, j: number, n: number): void {

      for (let k = 0; k < gridSize.value; k++) {
        if (pencilGrid.value[i][k][n - 1]) {
          togglePencilGridValue(i, k, n);
        }

        if (pencilGrid.value[k][j][n - 1]) {
          togglePencilGridValue(k, j, n);
        }

      }
      // Judge current square
      const startI = i - i % sudokuLevel.value;
      const startJ = j - j % sudokuLevel.value;

      const endI = startI + sudokuLevel.value;
      const endJ = startJ + sudokuLevel.value;

      for (let k = startI; k < endI; k++) {
        for (let m = startJ; m < endJ; m++) {
          if (pencilGrid.value[k][m][n - 1]) {
            togglePencilGridValue(k, m, n);
          }
        }
      }

    }

    // Call newGame on mount
    onMounted(() => {
      newGame();
      registerKeyboardEvents();
    });

    return {
      sudokuLevel,
      pencilGrid,
      grid,
      gridSize,
      difficulty,
      selected: selectedIndexes,
      isSelecting,
      pencilMode,
      quickPencilAllEnabled,
      selectedValue,
      elapsedTime,
      score,
      isGameComplete,
      startTimer,
      stopTimer,
      calculateScore,
      solvePuzzle,
      newGame,
      clearAll,
      generateSudoku,
      togglePencilMode,
      selectCell,
      clearSelection,
      judgeCell,
      checkCellValue,
      assignCell,
      judgeBoard,
      setGridValue,
      togglePencilGridValue,
      clearPencilGridCell,
      setGridWrongValue,
      quickPencilCell,
      quickPencilAll,
      toggleQuickPencilAll,
      updatePencilGridValues
    }
  }
})
</script>

<template>
  <div class="container m-auto">
    <h1 class="text-2xl font-bold underline mb-3">Sudoku {{ gridSize }} x {{ gridSize }}</h1>

    <div class="flex justify-center space-x-4 mb-4">
      <button @click="newGame"
        class="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50">
        New Game
      </button>
      <button @click="solvePuzzle"
        class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50">
        Solve Puzzle
      </button>
      <button @click="toggleQuickPencilAll"
        :class="[
          'px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50',
          quickPencilAllEnabled 
            ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
            : 'bg-green-500 hover:bg-green-600 focus:ring-green-500'
        ]">
        Quick Pencil {{ quickPencilAllEnabled ? '(Auto)' : 'All' }}
      </button>
      <select v-model="difficulty"
        class="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <option value="medium">Medium</option>
        <option value="extreme">Extreme</option>
      </select>
    </div>

    <div class="flex flex-col items-center">
      <div class="mb-4">
        <span class="mr-4">Time: {{ elapsedTime }}s</span>
        <span>Score: {{ score }}</span>
      </div>

      <div class="mb-4">
        <label class="inline-flex items-center">
          <input type="checkbox" v-model="pencilMode" class="form-checkbox h-5 w-5 text-indigo-600">
          <span class="ml-2">Pencil Mode</span>
        </label>
      </div>

      <SudokuGrid :grid="grid" :pencil-grid="pencilGrid" :sudoku-level="sudokuLevel" v-slot="slotProps">
        <SudokuCell 
          :cell="slotProps.cell" 
          :pencil="slotProps.pencil" 
          :grid-size="gridSize"
          :is-selected="selected[0] === slotProps.i && selected[1] === slotProps.j"
          :highlighted-value="selectedValue"
          @onCellSelect="selectCell(slotProps.i, slotProps.j)" 
        />
      </SudokuGrid>
    </div>

    <div v-if="isGameComplete" class="mt-4 text-center text-2xl text-green-600 font-bold">
      Congratulations! You completed the puzzle!
    </div>
  </div>
</template>

<style lang="postcss">
#app {
  font-family: 'Poppins', Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  @apply bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50;
  @apply text-indigo-900;
  height: 100vh;
}

.number-cell {
  cursor: pointer;
  @apply text-2xl font-medium;
  @apply border border-indigo-200;
  @apply bg-white/80 hover:bg-indigo-100;
  @apply transition-colors duration-200;
  @apply rounded;
}

.button {
  @apply h-10 px-6 font-medium rounded-lg;
  @apply bg-white/80 text-indigo-700;
  @apply border border-indigo-200;
  @apply hover:bg-indigo-50 transition-colors duration-200;
}

.button-dark {
  @apply h-10 px-6 font-medium rounded-lg;
  @apply bg-indigo-600 text-white;
  @apply border-none;
  @apply hover:bg-indigo-700 transition-colors duration-200;
  @apply shadow-sm;
}

kbd {
  @apply bg-white/80;
  @apply rounded;
  @apply border border-indigo-200;
  @apply shadow-sm;
  @apply text-indigo-700;
  @apply px-2 py-1;
  @apply text-sm font-medium;
  white-space: nowrap;
}

select {
  @apply h-10 px-4 rounded-lg;
  @apply bg-white/80 text-indigo-700;
  @apply border border-indigo-200;
  @apply hover:bg-indigo-50 transition-colors duration-200;
  @apply focus:outline-none focus:ring-2 focus:ring-indigo-300;
}
</style>
