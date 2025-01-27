<script lang="ts">
import { ref, computed, defineComponent } from 'vue';
import type { Ref } from 'vue';
import CellState from './models/CellState';
import SudokuCell from './components/SudokuCell.vue';
import SudokuGrid from './components/SudokuGrid.vue';

import PuzzleSet from './models/SudokuPuzzleSet.json';

export default defineComponent({
  components: {
    SudokuCell,
    SudokuGrid
  },
  /**
   * Will be using setup to define data and computed values
   * I am using this instead of Data so that I can more easily initialize the values along with ts-types
   */
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

    const isSelecting = computed(() => (selectedIndexes.value[0] >= 0
      && selectedIndexes.value[0] < gridSize.value
      && selectedIndexes.value[1] >= 0
      && selectedIndexes.value[1] < gridSize.value)
    )

    const selectedValue = computed(() => isSelecting.value ? grid.value[selectedIndexes.value[0]][selectedIndexes.value[1]].cellValue : null);

    // Add timer and score state
    const gameStartTime = ref<number>(0);
    const elapsedTime = ref<number>(0);
    const timerInterval = ref<number | null>(null);
    const score = ref<number>(0);
    const isGameComplete = ref<boolean>(false);

    return {
      sudokuLevel,
      pencilGrid,
      grid,
      gridSize,
      difficulty,
      selected: selectedIndexes,
      isSelecting,
      pencilMode,
      selectedValue,
      elapsedTime,
      score,
      isGameComplete,
    }
  },
  mounted() {
    this.registerKeyboardEvents();
    this.newGame();
  },
  methods: {
    registerKeyboardEvents() {
      const ALLOWED_KEYS: { [key: string]: number | null } = {
        'Delete': null,
        'Digit1': 1,
        'Digit2': 2,
        'Digit3': 3,
        'Digit4': 4,
        'Digit5': 5,
        'Digit6': 6,
        'Digit7': 7,
        'Digit8': 8,
        'Digit9': 9,
        'KeyQ': 10,
        'KeyB': 11,
        'KeyC': 12,
        'KeyD': 13,
        'KeyE': 14,
        'KeyF': 15,
      };

      window.addEventListener('keydown', (ev) => {
        if (ev.code in ALLOWED_KEYS) {
          this.assignCell(ALLOWED_KEYS[ev.code])
          return;
        }

        if (!this.isSelecting) return;

        if (ev.code == 'Space') {
          this.togglePencilMode()
          return;
        }

        if (ev.code == 'AltLeft') {
          this.quickPencilCell()
          return;
        }

        const i = this.selected[0];
        const j = this.selected[1]
        if (ev.code == 'ArrowRight') {
          this.selected = [i, (j >= this.gridSize - 1) ? j : j + 1];
          return;
        }

        if (ev.code == 'ArrowLeft') {
          this.selected = [i, j === 0 ? j : j - 1];
          return;
        }

        if (ev.code == 'ArrowUp') {
          this.selected = [i === 0 ? i : i - 1, j];
          return;
        }

        if (ev.code == 'ArrowDown') {
          this.selected = [i >= this.gridSize - 1 ? i : i + 1, j];
          return;
        }
      });
    },
    generateSudoku(difficulty: ("extreme" | "medium")): number[] {

      const puzzle = PuzzleSet[difficulty][Math.floor(Math.random() * PuzzleSet[difficulty].length)] as number[];

      return puzzle;
    },
    newGame(): void {
      this.clearAll();
      const puzzle: number[] = this.generateSudoku(this.difficulty);

      this.grid = Array(this.gridSize)
        .fill(null).map((_, i) =>
          Array(this.gridSize).fill(null).map((_, j) =>
            new CellState(puzzle[i * this.gridSize + j] || null)
          )
        );
      // Reset game state
      this.isGameComplete = false;
      this.stopTimer();
      this.elapsedTime = 0;
      this.score = 0;
      this.startTimer();
    },
    togglePencilMode(): void {
      this.pencilMode = !this.pencilMode;
    },

    selectCell(i: number, j: number): void {
      this.selected = [i, j];
    },

    clearSelection(): void { this.selected = [-1, -1]; },

    judgeCell(i: number, j: number): boolean {
      let hasError = false;

      const value = this.grid[i][j].cellValue;

      if (value == null) {
        this.setGridWrongValue(i, j, false); // in case when a cell value is deleted
        return true;
      }

      // Judge row and column
      for (let k = 0; k < this.gridSize; k++) {
        if (value === this.grid[i][k].cellValue && j != k) {
          hasError = true;

          this.setGridWrongValue(i, k);
        }

        if (value === this.grid[k][j].cellValue && i != k) {
          hasError = true;
          this.setGridWrongValue(k, j);
        }
      }
      // Judge current square
      const startI = i - i % this.sudokuLevel;
      const startJ = j - j % this.sudokuLevel;

      const endI = startI + this.sudokuLevel;
      const endJ = startJ + this.sudokuLevel;

      for (let k = startI; k < endI; k++) {
        for (let m = startJ; m < endJ; m++) {
          if (i == k && j == m) continue; // Skip the current cell

          if (value === this.grid[k][m].cellValue) {
            hasError = true;

            this.setGridWrongValue(k, m);
          }
        }
      }

      this.setGridWrongValue(i, j, hasError);

      return !hasError;// true if okay
    },

    checkCellValue(i: number, j: number, value: number | null): boolean {
      if (value === null) return true;
      
      // Check row
      for (let col = 0; col < this.gridSize; col++) {
        if (col !== j && this.grid[i][col].cellValue === value) {
          this.setGridWrongValue(i, col, true);
          this.setGridWrongValue(i, j, true);
          return false;
        }
      }

      // Check column
      for (let row = 0; row < this.gridSize; row++) {
        if (row !== i && this.grid[row][j].cellValue === value) {
          this.setGridWrongValue(row, j, true);
          this.setGridWrongValue(i, j, true);
          return false;
        }
      }

      // Check box
      const boxSize = this.sudokuLevel;
      const boxStartRow = Math.floor(i / boxSize) * boxSize;
      const boxStartCol = Math.floor(j / boxSize) * boxSize;
      
      for (let row = 0; row < boxSize; row++) {
        for (let col = 0; col < boxSize; col++) {
          const currentRow = boxStartRow + row;
          const currentCol = boxStartCol + col;
          if ((currentRow !== i || currentCol !== j) && 
              this.grid[currentRow][currentCol].cellValue === value) {
            this.setGridWrongValue(currentRow, currentCol, true);
            this.setGridWrongValue(i, j, true);
            return false;
          }
        }
      }

      return true;
    },

    assignCell(n: number | null): void {
      if (!this.isSelecting) return;

      const [i, j] = this.selected;

      if (this.grid[i][j].isGiven) return;

      if (this.pencilMode) {
        if (n === null) {
          this.clearPencilGridCell(i, j);
          return;
        }
        this.togglePencilGridValue(i, j, n);
        return;
      }

      // Clear all wrong states before validation
      for (let row = 0; row < this.gridSize; row++) {
        for (let col = 0; col < this.gridSize; col++) {
          this.setGridWrongValue(row, col, false);
        }
      }
      
      // Set the new value
      this.grid[i][j].cellValue = n;

      // If a value was entered (not cleared), check if it's correct
      if (n !== null) {
        this.checkCellValue(i, j, n);
      }

      // Clear pencil marks when setting a value
      this.clearPencilGridCell(i, j);
      
      // Check if the board is complete
      this.judgeBoard();
    },

    judgeBoard(): void {
      let isComplete = true;
      
      for (let i = 0; i < this.gridSize; i++) {
        for (let j = 0; j < this.gridSize; j++) {
          // Check if cell is empty
          if (this.grid[i][j].cellValue === null) {
            isComplete = false;
            return;
          }
          // Check if cell is correct
          if (!this.judgeCell(i, j)) {
            isComplete = false;
            return;
          }
        }
      }

      // Only if all cells are filled and correct
      if (isComplete) {
        this.isGameComplete = true;
        this.stopTimer();
        this.calculateScore();
      }
    },

    setGridValue(i: number, j: number, cellState: CellState): void {
      let modifiedRow = this.grid[i].slice(0);

      modifiedRow[j] = cellState;

      this.grid[i] = modifiedRow;
    },

    togglePencilGridValue(i: number, j: number, n: number): void {
      const row = this.pencilGrid[i].slice(0);

      const arr = row[j].slice(0);

      arr[n - 1] = !arr[n - 1];

      row[j] = arr;
      this.pencilGrid[i] = row;
    },

    clearPencilGridCell(i: number, j: number): void {
      const row = this.pencilGrid[i].slice(0);

      row[j] = new Array(this.gridSize).fill(false);
      this.pencilGrid[i] = row;
    },

    setGridWrongValue(i: number, j: number, wrong = true) {
      this.setGridValue(i, j, {
        ...this.grid[i][j],
        isWrong: wrong,
      })
    },

    quickPencilCell() {
      this.pencilMode = true;
      for (let i = 0; i < this.gridSize; i++) {
        this.assignCell(i + 1);
      }
    },
    quickPencilAll() {
      const savedMode = this.pencilMode;
      for (let i = 0; i < this.gridSize; i++) {
        for (let j = 0; j < this.gridSize; j++) {
          this.selected = [i, j]
          this.clearPencilGridCell(i, j);
          this.quickPencilCell()
        }
      }
      this.clearSelection();

      this.pencilMode = savedMode;
    },
    updatePencilGridValues(i: number, j: number, n: number): void {

      for (let k = 0; k < this.gridSize; k++) {
        if (this.pencilGrid[i][k][n - 1]) {
          this.togglePencilGridValue(i, k, n);
        }

        if (this.pencilGrid[k][j][n - 1]) {
          this.togglePencilGridValue(k, j, n);
        }

      }
      // Judge current square
      const startI = i - i % this.sudokuLevel;
      const startJ = j - j % this.sudokuLevel;

      const endI = startI + this.sudokuLevel;
      const endJ = startJ + this.sudokuLevel;

      for (let k = startI; k < endI; k++) {
        for (let m = startJ; m < endJ; m++) {
          if (this.pencilGrid[k][m][n - 1]) {
            this.togglePencilGridValue(k, m, n);
          }
        }
      }

    },
    clearAll(): void {
      let board = this.grid;
      let pencilGrid = this.pencilGrid

      for (let i = 0; i < this.gridSize; i++) {
        for (let j = 0; j < this.gridSize; j++) {
          if (!board[i][j].isGiven) {
            board[i][j] = new CellState();
            pencilGrid[i][j] = new Array(this.gridSize).fill(false)
          }
        }
      }

      this.grid = board;
      this.pencilGrid = pencilGrid;
    },
    startTimer() {
      this.gameStartTime = Date.now();
      this.timerInterval = window.setInterval(() => {
        this.elapsedTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
      }, 1000);
    },

    stopTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
    },

    calculateScore() {
      const baseScore = 1000;
      const timeMultiplier = Math.max(0, 1 - (this.elapsedTime / 600)); // 10 minutes max time
      const difficultyMultiplier = this.difficulty === "extreme" ? 2 : 1;
      this.score = Math.round(baseScore * timeMultiplier * difficultyMultiplier);
    },
  }
})
</script>

<template>
  <div class="container m-auto">
    <h1 class="text-2xl font-bold underline mb-3">Sudoku {{ gridSize }} x {{ gridSize }}</h1>
    <div class="flex flex-col-reverse md:flex-row h-full">
      <!-- Sidebar -->
      <div class="md:basis-1/4 md:border-r">
        <div class="flex flex-col px-10">
          <button
            class="mt-5"
            :class="{ 'button-dark': pencilMode, 'button': !pencilMode }"
            @click="togglePencilMode"
          >Pencil mode {{ pencilMode ? 'On' : 'Off' }}</button>
          <div class="mt-5">
            <label for="difficulty">Difficulty :</label>
            <select v-model="difficulty">
              <option value="medium">Medium</option>
              <option value="extreme">Extreme</option>
            </select>
          </div>
          <button class="button-dark mt-5" @click="newGame">New Game</button>

          <button class="button-dark mt-5" @click="clearAll">Clear all</button>
          <div class="w-full text-left mt-2 hidden md:block">
            <kbd>Space</kbd> Toggle pencil mode On/Off
            <br />
            <kbd>Del</kbd> &nbsp;&nbsp; Delete Cell value
            <br />
            <kbd>Alt</kbd> &nbsp;&nbsp; Quick fill cell with pencil
            <br />
          </div>
          <button class="button-dark mt-5" @click="quickPencilAll">Quick Pencil All</button>
          (Fill with pencil all possible values)
        </div>
      </div>
      <!-- Sudoku Grid -->
      <div class="md:basis-3/4 h-full">
        <div class="container mx-auto mt-10 h-full">
          <div class="flex flex-wrap flex-row h-full">
            <div class="md:basis-1/6"></div>
            <div class="md:basis-3/6">
              <sudoku-grid :grid="grid" :pencil-grid="pencilGrid" :sudoku-level="sudokuLevel">
                <template v-slot:default="{ i, j, cell, pencil }">
                  <sudoku-cell
                    :cell="grid[i][j]"
                    :pencil="pencil"
                    :highlighted-value="selectedValue"
                    :is-selected="(i == selected[0] && j == selected[1])"
                    @onCellSelect="selectCell(i, j)"
                  />
                </template>
              </sudoku-grid>
            </div>
            <div class="md:basis-1/12"></div>
            <div class="basis-full md:basis-1/12 flex flex-row md:flex-col my-5 md:my-0">
              <!-- Row -->
              <button @click="assignCell(i)" v-for="i in 9" class="number-cell flex-grow">{{ i }}</button>
              <button @click="assignCell(null)" class="number-cell flex-grow">X</button>
              <!-- <div class="md:invisible w-full grid grid-rows-1 grid-cols-10">
              </div>-->
              <!-- Col -->
              <!-- <div class="invisible md:visible grid grid-flow-row grid-cols-1 bg-red-300 h-full">
              </div>-->
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="mb-4 flex justify-between items-center">
      <div class="text-xl">
        Time: {{ Math.floor(elapsedTime / 60) }}:{{ (elapsedTime % 60).toString().padStart(2, '0') }}
      </div>
      <div class="text-xl">
        Score: {{ score }}
      </div>
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
