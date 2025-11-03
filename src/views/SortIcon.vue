<template>
  <span class="sort-icon">
    <span v-if="field === current && order === 'asc'">Up</span>
    <span v-else-if="field === current && order === 'desc'">Down</span>
    <span v-else>Up/Down</span>
  </span>
</template>

<script>
export default {
  name: "SortIcon",
  props: {
    field: String,
    current: String,
    order: String,
  },
};
</script>

<style scoped>
.sort-icon {
  font-size: 12px;
  margin-left: 4px;
  color: #666;
}
</style>