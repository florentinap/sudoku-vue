<script lang="ts">
import { defineComponent, PropType } from 'vue'
import CellState from '../models/CellState';

export default defineComponent({
  props: {
    cell: {
      type: Object as PropType<CellState>,
      required: true,
    },
    pencil: {
      type: Array as PropType<boolean[]>,
      required: true,
    },
    highlightedValue: {
      type: Number as PropType<number | null>,
      default: null
    },
    isSelected: {
      type: Boolean,
      default: false
    },
    gridSize: {
      type: Number,
      required: true
    }
  },
  emits: ['onCellSelect'],
  setup(props, { emit }) {
    const handleClick = () => {
      emit('onCellSelect');
    };

    return {
      handleClick
    };
  },
  computed: {
    showPencilValues() {
      return this.cell.cellValue === null && this.pencil.some(v => v);
    }
  }
})
</script>

<template>
  <div @click="handleClick"
    :class="{
      'cell': true,
      'filled': cell.cellValue != null,
      'highlighted': highlightedValue != null && cell.cellValue === highlightedValue,
      'selected': isSelected,
      'wrong': cell.isWrong,
      'prefilled': cell.isPrefilled,
      'grid grid-cols-3 grid-rows-3': showPencilValues && gridSize === 9,
      'grid grid-cols-4 grid-rows-4': gridSize === 16 && showPencilValues,
    }">
    <template v-if="showPencilValues">
      <span class="text-xs"
        :class="{ 'invisible': !v, 'highlighted': (n + 1 == highlightedValue) }"
        v-for="(v, n) in pencil">
        {{ (n + 1) }}
      </span>
    </template>
    <template v-else>{{ cell.cellValue }}</template>
  </div>
</template>

<style lang="postcss">
.cell {
  @apply text-3xl;
  @apply flex items-center justify-center;
  @apply relative;
  width: 11vw;
  height: 11vw;
  max-height: 50px;
  max-width: 50px;
  @apply border border-slate-300;
  @apply font-medium;
  @apply cursor-pointer;
  @apply transition-colors duration-150 ease-in-out;
  @apply hover:bg-yellow-50;
  @apply bg-white;
}

.cell.selected {
  @apply bg-yellow-200;
  @apply border-2;
  @apply border-yellow-500;
  @apply shadow-sm;
  @apply z-10;
}

.cell.filled {
  @apply text-indigo-600;
}

.cell.highlighted {
  @apply bg-blue-100;
}

.cell span.highlighted {
  @apply bg-blue-100;
}

.cell.prefilled {
  @apply text-gray-900;
  @apply font-bold;
}

.cell.wrong {
  @apply text-white;
  @apply bg-red-500;
}

.cell.wrong.highlighted {
  @apply text-white;
  @apply bg-red-600;
  @apply border-2;
  @apply border-red-300;
}

.cell.selected.wrong {
  @apply border-2;
  @apply border-red-700;
  @apply bg-red-600;
}

.cell.grid {
  @apply gap-0;
  @apply p-1;
}

.cell span {
  @apply flex;
  @apply items-center;
  @apply justify-center;
  @apply text-gray-600;
  @apply text-xs;
}
</style>