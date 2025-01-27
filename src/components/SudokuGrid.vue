<script lang="ts">
import { defineComponent, PropType } from "vue";
import CellState from "../models/CellState";

export default defineComponent({
  props: {
    grid: {
      type: Object as PropType<CellState[][]>,
      required: true,
    },
    pencilGrid: {
      type: Object as PropType<(boolean[][][])>,
      required: true,
    },
    sudokuLevel: {
      type: Number,
      default: () => 3
    }
  }
})
</script>

<template>
  <div class="game-board mt-6">
    <template v-for="(_, block_i) in 3">
      <template v-for="(_, block_j) in 3">
        <!-- Each block is a 3x3 -->
        <div class="grid-square">
          <template v-for="(_, i) in 3">
            <template v-for="(_, j) in 3" :key="(i + '' + j)">
              <slot
                :i="block_i * 3 + i"
                :j="block_j * 3 + j"
                :cell="grid[block_i * 3 + i][block_j * 3 + j]"
                :pencil="pencilGrid[block_i * 3 + i][block_j * 3 + j]"
              ></slot>
            </template>
          </template>
        </div>
      </template>
    </template>
  </div>
</template>

<style lang="postcss">
.game-board {
  @apply grid grid-cols-3 grid-rows-3;
  @apply border-4 border-indigo-300;
  @apply bg-gradient-to-br from-indigo-50 to-purple-50;
  @apply rounded-lg;
  @apply shadow-lg;
  @apply p-1;

  height: calc(100vw + 6px);
  width: 100vw;
  max-width: 462px;
  max-height: 462px;
}

.grid-square {
  @apply grid grid-cols-3 grid-rows-3;
  @apply border border-indigo-200;
  @apply bg-white/50;
  @apply p-0.5;
}
</style>