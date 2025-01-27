export class SudokuSolver {
    private size: number;
    private boxSize: number;

    constructor(size: number) {
        this.size = size * size; // 9 for standard sudoku
        this.boxSize = size; // 3 for standard sudoku
    }

    solve(board: (number | null)[][]): (number | null)[][] | null {
        const grid = board.map(row => row.map(cell => cell === null ? 0 : cell));
        
        if (this.solveSudoku(grid)) {
            return grid.map(row => row.map(cell => cell === 0 ? null : cell));
        }
        return null;
    }

    private solveSudoku(grid: number[][]): boolean {
        let row = 0;
        let col = 0;
        let isEmpty = false;
        
        // Find empty cell
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (grid[i][j] === 0) {
                    row = i;
                    col = j;
                    isEmpty = true;
                    break;
                }
            }
            if (isEmpty) {
                break;
            }
        }

        // No empty cell found, puzzle solved
        if (!isEmpty) {
            return true;
        }

        // Try digits 1-9 (or 1-16 for 4x4)
        for (let num = 1; num <= this.size; num++) {
            if (this.isSafe(grid, row, col, num)) {
                grid[row][col] = num;
                if (this.solveSudoku(grid)) {
                    return true;
                }
                grid[row][col] = 0;
            }
        }
        return false;
    }

    private isSafe(grid: number[][], row: number, col: number, num: number): boolean {
        // Check row
        for (let x = 0; x < this.size; x++) {
            if (grid[row][x] === num) {
                return false;
            }
        }

        // Check column
        for (let x = 0; x < this.size; x++) {
            if (grid[x][col] === num) {
                return false;
            }
        }

        // Check box
        let startRow = row - row % this.boxSize;
        let startCol = col - col % this.boxSize;
        
        for (let i = 0; i < this.boxSize; i++) {
            for (let j = 0; j < this.boxSize; j++) {
                if (grid[i + startRow][j + startCol] === num) {
                    return false;
                }
            }
        }

        return true;
    }
}
