<template>
  <v-container>
    <!-- Page Heading -->
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h4">Marketplace Orders</h1>
      </v-col>
    </v-row>

    <v-card class="pa-4 mb-4">
      <v-card-title>Download Marketplace Orders</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedMarketplace"
              :items="marketplaces"
              label="Select Marketplace"
              outlined
              dense
            ></v-select>
          </v-col>
          <v-col cols="12" md="4">
            <v-menu
              ref="startDateMenu"
              v-model="startDateMenu"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="startDate"
                  label="Start Date"
                  prepend-icon="mdi-calendar"
                  readonly
                  v-bind="attrs"
                  v-on="on"
                  outlined
                  dense
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="startDate"
                @input="startDateMenu = false"
              ></v-date-picker>
            </v-menu>
          </v-col>
          <v-col cols="12" md="4">
            <v-menu
              ref="endDateMenu"
              v-model="endDateMenu"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              min-width="auto"
            >
              <template v-slot:activator="{ on, attrs }">
                <v-text-field
                  v-model="endDate"
                  label="End Date"
                  prepend-icon="mdi-calendar"
                  readonly
                  v-bind="attrs"
                  v-on="on"
                  outlined
                  dense
                ></v-text-field>
              </template>
              <v-date-picker
                v-model="endDate"
                @input="endDateMenu = false"
              ></v-date-picker>
            </v-menu>
          </v-col>
        </v-row>
        <v-row>
          <v-col class="d-flex justify-end">
            <v-btn
              color="primary"
              @click="fetchOrders"
              :loading="isLoading"
              :disabled="!canFetch"
            >
              Fetch Orders
            </v-btn>
            <v-btn
              class="ml-2"
              color="success"
              @click="downloadExcel"
              :disabled="orders.length === 0 || isDownloading"
              :loading="isDownloading"
            >
              <v-icon left>mdi-download</v-icon>
              Download Excel
            </v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Orders Table -->
    <v-card v-if="orders.length > 0" class="pa-4">
      <v-card-title>
        Orders
        <v-spacer></v-spacer>
        <v-text-field
          v-model="search"
          append-icon="mdi-magnify"
          label="Search"
          single-line
          hide-details
          dense
          outlined
          class="ml-2"
          style="max-width: 300px"
        ></v-text-field>
      </v-card-title>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="orders"
          :search="search"
          :items-per-page="10"
          :footer-props="{
            'items-per-page-options': [10, 20, 50, 100],
          }"
          class="elevation-1"
        >
          <template v-slot:item.orderDate="{ item }">
            {{ formatDate(item.orderDate) }}
          </template>
          <template v-slot:item.orderValue="{ item }">
            {{ formatCurrency(item.orderValue) }}
          </template>
          <template v-slot:item.orderItems="{ item }">
            <v-chip
              small
              class="mr-1 mb-1"
              v-for="(orderItem, index) in item.orderItems"
              :key="index"
            >
              {{ orderItem.skuId }} ({{ orderItem.quantity }})
            </v-chip>
          </template>
          <template v-slot:item.address="{ item }">
            {{ formatAddress(item.address) }}
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Workbook } from 'exceljs'
import { MarketplaceOrder } from '@/types'
import axios from 'axios'

// State
const orders = ref<MarketplaceOrder[]>([])
const selectedMarketplace = ref<string>('All')
const startDate = ref<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substr(0, 10))
const endDate = ref<string>(new Date().toISOString().substr(0, 10))
const startDateMenu = ref(false)
const endDateMenu = ref(false)
const isLoading = ref(false)
const isDownloading = ref(false)
const search = ref('')

// Constants
const marketplaces = ['All', 'Amazon', 'Flipkart', 'Meesho', 'Myntra', 'Ajio']

// Table headers
const headers = [
  { text: 'Order ID', value: 'orderId' },
  { text: 'Marketplace', value: 'marketplace' },
  { text: 'Order Status', value: 'orderStatus' },
  { text: 'Order Date', value: 'orderDate' },
  { text: 'Order Value', value: 'orderValue' },
  { text: 'Items', value: 'orderItems' },
  { text: 'Shipping Address', value: 'address' }
]

// Computed properties
const canFetch = computed(() => {
  return selectedMarketplace.value && startDate.value && endDate.value
})

// Methods
const fetchOrders = async () => {
  if (!canFetch.value) return

  isLoading.value = true
  try {
    const params = {
      marketplace: selectedMarketplace.value === 'All' ? undefined : selectedMarketplace.value,
      startDate: startDate.value,
      endDate: endDate.value
    }

    const response = await axios.get('/api/marketplace-orders', { params })
    orders.value = response.data.orders
  } catch (error) {
    console.error('Error fetching orders:', error)
    alert('Failed to fetch orders. Please try again.')
  } finally {
    isLoading.value = false
  }
}

const downloadExcel = async () => {
  if (orders.value.length === 0) return

  isDownloading.value = true
  try {
    // Create a new workbook and worksheet
    const workbook = new Workbook()
    const worksheet = workbook.addWorksheet('Marketplace Orders')

    // Define columns
    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 20 },
      { header: 'Order Status', key: 'orderStatus', width: 15 },
      { header: 'Order Date', key: 'orderDate', width: 15 },
      { header: 'Order Value', key: 'orderValue', width: 15 },
      { header: 'Marketplace', key: 'marketplace', width: 15 },
      { header: 'SKU ID', key: 'skuId', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Address Line 1', key: 'addressLine1', width: 30 },
      { header: 'Address Line 2', key: 'addressLine2', width: 30 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Postal Code', key: 'postalCode', width: 15 }
    ]

    // Add data rows
    orders.value.forEach(order => {
      // For orders with multiple items, create multiple rows
      if (order.orderItems.length > 0) {
        order.orderItems.forEach(item => {
          worksheet.addRow({
            orderId: order.orderId,
            orderStatus: order.orderStatus,
            orderDate: order.orderDate,
            orderValue: order.orderValue,
            marketplace: order.marketplace,
            skuId: item.skuId,
            quantity: item.quantity,
            price: item.price,
            addressLine1: order.address.addressLine1,
            addressLine2: order.address.addressLine2,
            city: order.address.city,
            state: order.address.state,
            postalCode: order.address.postalCode
          })
        })
      } else {
        // For orders without items, add a single row
        worksheet.addRow({
          orderId: order.orderId,
          orderStatus: order.orderStatus,
          orderDate: order.orderDate,
          orderValue: order.orderValue,
          marketplace: order.marketplace,
          skuId: '',
          quantity: 0,
          price: 0,
          addressLine1: order.address.addressLine1,
          addressLine2: order.address.addressLine2,
          city: order.address.city,
          state: order.address.state,
          postalCode: order.address.postalCode
        })
      }
    })

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    
    // Create download link and trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = `marketplace-orders-${new Date().toISOString().split('T')[0]}.xlsx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error generating Excel file:', error)
    alert('Failed to generate Excel file. Please try again.')
  } finally {
    isDownloading.value = false
  }
}

// Helper functions
const formatDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString()
  } catch (e) {
    return dateString
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(value)
}

const formatAddress = (address: any) => {
  if (!address) return ''
  return `${address.addressLine1}, ${address.city}, ${address.state} - ${address.postalCode}`
}

// Lifecycle hooks
onMounted(() => {
  // Initial fetch can be done here if needed
})
</script>

<style scoped>
.v-data-table {
  margin-top: 16px;
}
</style>
