<template>
  <v-container>
    <!-- Page Heading -->
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h4">Orders Update</h1>
      </v-col>
    </v-row>

    <!-- Meesho Inventory Upload -->
    <v-card class="pa-4 mb-4">
      <v-card-title>Upload Meesho Inventory Excel</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12">
            <v-file-input v-model="meeshoFile" label="Select Meesho Inventory Excel" accept=".xlsx, .xls, .csv" outlined
              dense @change="handleMeeshoFileChange"></v-file-input>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-title>Update Other Marketplace Orders</v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12">
            <v-file-input v-model="otherMarketplaceFile" label="Select Other Marketplace Excel" accept=".xlsx, .xls"
              outlined dense @change="handleOtherMarketplaceFileChange"></v-file-input>
          </v-col>
        </v-row>
      </v-card-text>
      <v-card-title
        v-if="orders.filter(order => order.orderStatus === 'RETURNED' || order.orderStatus === 'DOOR_STEP_EXCHANGED').length > 0">Upload
        Return Orders Update</v-card-title>
      <v-card-text>
        <v-row
          v-if="orders.filter(order => order.orderStatus === 'RETURNED' || order.orderStatus === 'DOOR_STEP_EXCHANGED').length > 0">
          <v-col cols="12">
            <v-file-input v-model="returnOrderUpdateFile" label="Select Return Order Excel" accept=".xlsx, .xls"
              outlined dense @change="handleReturnOrderUpdate"></v-file-input>
          </v-col>
        </v-row>
        <v-row>
          <v-col class="d-flex justify-end">
            <v-btn class="ml-2" color="info" @click="downloadOtherOrdersExcel">
              <v-icon left>mdi-download</v-icon>
              Download Other Orders Excel
            </v-btn>
            <v-btn
              v-if="orders.filter(order => order.orderStatus === 'RETURNED' || order.orderStatus === 'DOOR_STEP_EXCHANGED').length > 0"
              class="ml-2" color="info" @click="dowloadReturnOrdersExcel">
              <v-icon left>mdi-download</v-icon>
              Download Return Orders Excel
            </v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col class="d-flex justify-center">
            <v-btn color="primary" @click="updateOrders" :loading="isLoading"
              :disabled="orders.length === 0 || orders.filter(order => order.orderStatus === 'RETURNED' || order.orderStatus === 'DOOR_STEP_EXCHANGED').length > 0">
              Update Orders
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
        <v-text-field v-model="search" append-icon="mdi-magnify" label="Search" single-line hide-details dense outlined
          class="ml-2" style="max-width: 300px"></v-text-field>
      </v-card-title>
      <v-card-text>
        <v-data-table :headers="orderHeaders" :items="orders" :search="search" :items-per-page="10" :footer-props="{
          'items-per-page-options': [10, 20, 50, 100],
        }" class="elevation-1">
          <template #item.orderDate="{ item }">
            {{ formatDate(item.orderDate) }}
          </template>
          <template #item.orderValue="{ item }">
            {{ formatCurrency(item.orderValue) }}
          </template>
          <template #item.orderItems="{ item }">
            <div v-if="item.orderItems && item.orderItems.length > 0">
              <v-chip small class="mr-1 mb-1" v-for="(orderItem, index) in item.orderItems" :key="index">
                {{ orderItem.skuCode }} ({{ orderItem.quantity }})
              </v-chip>
            </div>
            <div v-else>
              -
            </div>
          </template>
          <template #item.address="{ item }">
            <div v-if="item.address">
              {{ formatAddress(item.address) }}
            </div>
            <div v-else>
              -
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Workbook } from 'exceljs'
import * as ExcelJS from 'exceljs';
import axios from 'axios'
import { OrderStatus, type Order } from '@/types';
import Papa from 'papaparse';

// State
const orders = ref<Order[]>([])
const isLoading = ref(false)
const meeshoFile = ref<File | File[]>();
const otherMarketplaceFile = ref<File | File[]>();
const returnOrderUpdateFile = ref<File | File[]>();
const search = ref('')

const downloadOtherOrdersExcel = async () => {
  try {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Marketplace Orders');

    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 20 },
      { header: 'Order Status', key: 'orderStatus', width: 15 },
      { header: 'Order Date', key: 'orderDate', width: 15 },
      { header: 'Order Value', key: 'orderValue', width: 15 },
      { header: 'Marketplace', key: 'marketplace', width: 15 },
      { header: 'SKU Code', key: 'skuCode', width: 15 },
      { header: 'Quantity', key: 'quantity', width: 10 },
      { header: 'Price', key: 'price', width: 15 },
      { header: 'Address Line 1', key: 'addressLine1', width: 30 },
      { header: 'Address Line 2', key: 'addressLine2', width: 30 },
      { header: 'City', key: 'city', width: 15 },
      { header: 'State', key: 'state', width: 15 },
      { header: 'Postal Code', key: 'postalCode', width: 15 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `marketplace-orders.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating sample Excel file:', error);
    alert('Failed to generate sample Excel file. Please try again.');
  }
};

const orderHeaders = computed(() => {
  if (orders.value.length === 0) return [];
  const firstOrder = orders.value[0];
  const headers = Object.keys(firstOrder).map(key => {
    let text = key.replace(/([A-Z])/g, ' $1').trim();
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (key === 'orderItems') {
      text = 'Order Items'
    }
    if (key === 'address') {
      text = 'Address'
    }
    return {
      title: text,
      key: key,
    };
  });
  console.log(headers, 'headers')
  return headers;
});

const handleMeeshoFileChange = async (e: any) => {
  const file = e.target.files[0];

  orders.value = orders.value.filter(order => order.marketplace !== 'MEESHO');

  if (!file) return;

  const ext = file.name.split('.').pop()?.toLowerCase();
  const reader = new FileReader();

  reader.onload = async (e: any) => {
    try {
      if (ext === 'xlsx') {
        alert('Meesho Report is of type csv');

      } else if (ext === 'csv') {
        Papa.parse(e.target.result, {
          header: false,
          skipEmptyLines: true,
          complete: (results: any) => {
            const rows = results.data;
            rows.slice(1).filter((cols: string[]) =>
              !['READY_TO_SHIP', 'PENDING'].includes(cols[0])
            ).forEach((cols: string[]) => {
              const order: Order = {
                orderId: cols[1],
                orderStatus: getOrderStatusFromMeeshoOrder(cols[0]),
                orderDate: cols[2],
                orderValue: Number(cols[9]) * Number(cols[7]),
                marketplace: 'MEESHO',
                orderItems: [{
                  skuCode: cols[5],
                  quantity: Number(cols[7]),
                  price: Number(cols[9]),
                }],
                address: {
                  state: cols[3],
                }
              };
              let existingOrder = orders.value.find(o => o.orderId === order.orderId);
              if (existingOrder) {
                existingOrder.orderStatus = order.orderStatus;
                existingOrder.orderDate = order.orderDate;
              } else {
                orders.value.push(order);
              }
            });
          },
          error: (error: any) => {
            console.error('Error parsing CSV:', error);
            alert('Failed to parse Meesho CSV file. Please check the file format.');
          }
        });

      } else {
        alert('Unsupported file type. Please upload .xlsx or .csv');
      }
    } catch (err) {
      console.error('Parse error:', err);
      alert('Failed to parse Meesho file.');
    }
  };

  ext === 'xlsx' ? reader.readAsArrayBuffer(file) : reader.readAsText(file);
};

const dowloadReturnOrdersExcel = async () => {
  try {
    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('Return Orders');

    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 20 },
      { header: 'Order Status', key: 'orderStatus', width: 15 },
      { header: 'Order Date', key: 'orderDate', width: 15 },
      { header: 'Order Value', key: 'orderValue', width: 15 },
      { header: 'Marketplace', key: 'marketplace', width: 15 },
      { header: 'Item Good?(Yes/No)', key: 'itemGood', width: 15 }
    ];

    orders.value.filter(order => order.orderStatus === 'RETURNED' || order.orderStatus === 'DOOR_STEP_EXCHANGED').forEach(order => {
      worksheet.addRow({
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        orderDate: order.orderDate,
        orderValue: order.orderValue,
        marketplace: order.marketplace
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `return-orders.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating sample Excel file:', error);
    alert('Failed to generate sample Excel file. Please try again.');
  }
};

const handleReturnOrderUpdate = (e: any) => {
  const file = e.target.files[0];

  if (!file) return;
  const ext = file.name.split('.').pop()?.toLowerCase();
  const reader = new FileReader();
  reader.onload = async (e: any) => {
    try {
      if (ext !== 'xlsx') {
        alert('Unsupported file type. Please upload .xlsx file');
        return;
      }
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(e.target.result);
      const worksheet = workbook.getWorksheet(1);

      if (worksheet == null || worksheet.rowCount < 2) {
        alert('Invalid Return Order Update Excel file. Please check the file format.');
        return;
      }
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Skip header row
          const orderId = row.getCell(1).value;
          const itemGood = row.getCell(6).value;
          if(itemGood !== 'Yes' && itemGood !== 'No') {
            alert('Invalid value for Item Good. Please enter "Yes" or "No".');
            return;
          }
          const order = orders.value.find(order => order.orderId === orderId);
          if (order && order.orderStatus === 'RETURNED') {
            order.orderStatus = itemGood === 'Yes' ? OrderStatus.RETURNED_GOOD : OrderStatus.RETURNED_BAD;
          } else if (order && order.orderStatus === 'DOOR_STEP_EXCHANGED') {
            order.orderStatus = itemGood === 'Yes' ? OrderStatus.DELIVERED : OrderStatus.DOOR_STEP_EXCHANGEFAILED;
          } else {
            alert(`Order ID ${orderId} not found or not in RETURNED/DOOR_STEP_EXCHANGED status.`);
          }
        }
      });
    } catch (err) {
      console.error('Parse error:', err);
      alert('Failed to parse Return Order Update file.');
    }
  }
  reader.readAsArrayBuffer(file);
}

const getOrderStatusFromMeeshoOrder: (meeshoOrderStatus: string) => OrderStatus = (meeshoOrderStatus: string) => {
  switch (meeshoOrderStatus) {
    case 'DELIVERED':
      return OrderStatus.DELIVERED;
    case 'CANCELLED':
      return OrderStatus.CANCELLED;
    case 'SHIPPED':
      return OrderStatus.SHIPPED;
    case 'DOOR_STEP_EXCHANGED':
      return OrderStatus.DOOR_STEP_EXCHANGED;
    case 'RTO_COMPLETE':
      return OrderStatus.RETURNED;
    case 'RTO_OFD':
    case 'RTO_LOCKED':
    case 'RTO_INITIATED':
      return OrderStatus.SHIPPED;
    default:
      return OrderStatus.SHIPPED; // fallback or throw error if needed
  }
};




const handleOtherMarketplaceFileChange = async (file: File) => {
  if (!file) return;
  orders.value = orders.value.filter(order => order.marketplace === 'Meesho');
  try {
    const workbook = new ExcelJS.Workbook();
    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const buffer = e.target.result;
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet(1);

      if (worksheet == null || worksheet.rowCount < 2) {
        alert('Invalid Other Marketplace Excel file. Please check the file format.');
        return;
      }

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // Skip header row
          // const order: Order = {
          //   orderId: row.getCell(1).value,
          //   orderStatus: row.getCell(2).value,
          //   orderDate: row.getCell(3).value,
          //   orderValue: row.getCell(4).value,
          //   marketplace: row.getCell(5).value,
          //   orderItems: [],
          //   address: {
          //     addressLine1: row.getCell(9).value,
          //     addressLine2: row.getCell(10).value,
          //     city: row.getCell(11).value,
          //     state: row.getCell(12).value,
          //     postalCode: row.getCell(13).value,
          //   },
          // };
          // const orderItem: OrderItem = {
          //   skuCode: String(row.getCell(6).value),
          //   quantity: Number(row.getCell(7).value),
          //   price: Number(row.getCell(8).value),
          // };
          // order.orderItems.push(orderItem);
          // otherMarketplaceOrders.value.push(order);
        }
      });
    };
    reader.readAsArrayBuffer(file);
  } catch (error) {
    console.error('Error parsing Other Marketplace Excel:', error);
    alert('Failed to parse Other Marketplace Excel. Please check the file format.');
  }
};

const getOrderStatusFiltered = (orderStatus: string) => {
  switch (orderStatus) {
    case 'READY_TO_SHIP':
      return 'Ready to Ship';
    case 'PENDING':
      return 'Pending';
    case 'SHIPPED':
      return 'Shipped';
    case 'DELIVERED':
      return 'Delivered';
    default:
      return orderStatus;
  }
}

const updateOrders = async () => {
  if (orders.value.length === 0) {
    alert('No orders to update.');
    return;
  }

  isLoading.value = true;

  try {
    // Prepare the request payload
    const payload = orders.value.filter(order =>
      !['READY_TO_SHIP', 'PENDING', 'RTO_INITIATED', 'RTO_LOCKED', 'RTO_OFD'].includes(order.orderStatus)
    ).map(order => ({
      orderId: order.orderId,
      orderStatus: order.orderStatus,
      orderDate: order.orderDate ? new Date(order.orderDate).toISOString() : undefined,
      orderValue: order.orderValue,
      marketplace: order.marketplace,
      orderItems: order.orderItems?.map(item => ({
        skuCode: item.skuCode.startsWith('?') ? item.skuCode.slice(1) : item.skuCode,
        quantity: item.quantity,
        price: item.price,
      })),
      address: order.address
        ? {
          addressLine1: order.address.addressLine1 || undefined,
          addressLine2: order.address.addressLine2 || undefined,
          city: order.address.city || undefined,
          state: order.address.state || undefined,
          postalCode: order.address.postalCode || undefined,
        }
        : undefined,
    }));

    // Send the POST request
    const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/orders/update`, payload);

    console.log('Orders updated successfully:', response.data);
    alert('Orders updated successfully!');
  } catch (error) {
    console.error('Error updating orders:', error);
    alert('Failed to update orders. Please try again.');
  } finally {
    isLoading.value = false;
  }
};

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
  if (!address) return '';

  const parts = [
    address.addressLine1,
    address.city,
    address.state,
    address.postalCode
  ].filter(part => part); // Filter out undefined or empty values

  return parts.join(', '); // Join the available parts with a comma
};

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
