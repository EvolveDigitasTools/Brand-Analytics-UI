<template>
    <v-container>
      <!-- Page Heading -->
      <v-row class="mb-4">
        <v-col>
          <h1 class="text-h4">Meesho Report Update</h1>
        </v-col>
      </v-row>
  
      <v-card class="pa-4">
        <v-card-text>
          <v-file-input
            label="Upload Last 30 Days Orders Excel"
            accept=".xlsx,.xls"
            @change="handleFileChange"
          />
          <div v-if="lastUpdated">
            <p>Report last updated at: {{ formattedLastUpdated }}</p>
          </div>
        </v-card-text>
      </v-card>
    </v-container>
  </template>
  
  <script setup lang="ts">
  import { ref, computed, onMounted } from 'vue'
  
  const file = ref<File | null>(null)
  const lastUpdated = ref<Date | null>(null)
  
  const handleFileChange = (files: File[]) => {
    file.value = files?.[0] || null
  }
  
  const formattedLastUpdated = computed(() => {
    return lastUpdated.value ? lastUpdated.value.toLocaleString() : 'Not available'
  })
  
  const fetchLastUpdated = async () => {
    try {
      const response = await fetch('/api/last-updated')
      const data = await response.json()
      // Assume API returns { lastUpdated: "2023-03-15T12:34:56Z" }
      lastUpdated.value = new Date(data.lastUpdated)
    } catch (error) {
      console.error('Error fetching last updated time:', error)
    }
  }
  
  onMounted(() => {
    fetchLastUpdated()
  })
  </script>
  