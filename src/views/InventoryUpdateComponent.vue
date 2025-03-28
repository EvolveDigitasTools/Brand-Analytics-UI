<template>
  <div class="inventory-container">
    <!-- Header Section -->
    <header class="inventory-header">
      <h1>Inventory Management</h1>
      <div class="header-controls">
        <input type="text" v-model="searchQuery" placeholder="Search by SKU or Product Name" class="search-input" />
        <button @click="showUpdateModal = true" class="btn-primary">
          Stock Update
        </button>
      </div>
    </header>

    <!-- Inventory Tabs -->
    <div class="tabs">
      <button v-for="tab in tabs" :key="tab" @click="activeTab = tab" :class="{ active: activeTab === tab }"
        class="tab-btn">
        {{ tab }}
      </button>
    </div>

    <!-- Inventory Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key">
              <div class="column-header">
                <span>{{ column.label }}</span>
                <div class="filter-controls">
                  <input v-model="filters[column.key]" @click.stop class="filter-input" />
                  <button @click="toggleSort(column.key)" class="sort-btn">
                    {{ sortConfig.key === column.key ? (sortConfig.asc ? '↑' : '↓') : '⇅' }}
                  </button>
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.skuCode">
            <td>{{ row.skuCode }}</td>
            <td>{{ row.category }}</td>
            <td>{{ row.productTitle }}</td>
            <td>{{ row.sapCode }}</td>
            <td>{{ row.hsn }}</td>
            <td>{{ row.ean }}</td>
            <td>{{ row.modelNumber }}</td>
            <td>{{ row.currentInventory }}</td>
            <td>
              <input v-model.number="row.updatedInventory" type="number" min="0" class="inventory-input" />
            </td>
            <td>{{ row.expiryDate }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Stock Update Modal -->
    <div v-if="showUpdateModal" class="modal-overlay">
      <div class="modal-content">
        <h2>Stock Update</h2>
        <div class="modal-options">
          <button @click="downloadExcel" class="modal-btn download-btn">
            Download Stock Update Sheet
          </button>
          <label class="modal-btn upload-btn">
            Upload Stock Sheet
            <input type="file" @change="handleFileUpload" accept=".xlsx, .xls" hidden />
          </label>
        </div>
        <button @click="showUpdateModal = false" class="close-btn">×</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';
import { Workbook } from 'exceljs';

export default {
  data() {
    return {
      inventoryData: [],
      searchQuery: '',
      activeTab: 'All Inventory',
      tabs: ['All Inventory', 'Low Inventory', 'Out of Stock'],
      columns: [
        { key: 'skuCode', label: 'SKU Code*' },
        { key: 'category', label: 'Category*' },
        { key: 'productTitle', label: 'Product Title*' },
        { key: 'sapCode', label: 'SAP Code' },
        { key: 'hsn', label: 'HSN' },
        { key: 'ean', label: 'EAN' },
        { key: 'modelNumber', label: 'Model Number' },
        { key: 'currentInventory', label: 'Current Inventory' },
        { key: 'updatedInventory', label: 'Updated Inventory' },
        { key: 'expiryDate', label: 'Expiry Date' },
      ],
      filters: {},
      sortConfig: { key: null, asc: true },
      showUpdateModal: false,
    };
  },
  computed: {
    filteredRows() {
      let filtered = this.excelRows.filter(row => {
        const matchesSearch = this.searchQuery.toLowerCase().split(' ').every(term =>
          row.skuCode.toLowerCase().includes(term) ||
          row.productTitle.toLowerCase().includes(term)
        );

        const matchesTab = this.activeTab === 'All Inventory' ||
          (this.activeTab === 'Low Inventory' && row.currentInventory < 10) ||
          (this.activeTab === 'Out of Stock' && row.currentInventory === 0);

        const matchesFilters = Object.entries(this.filters).every(([key, value]) =>
          !value || String(row[key]).toLowerCase().includes(value.toLowerCase())
        );

        return matchesSearch && matchesTab && matchesFilters;
      });

      if (this.sortConfig.key) {
        filtered = filtered.sort((a, b) => {
          if (a[this.sortConfig.key] < b[this.sortConfig.key]) return this.sortConfig.asc ? -1 : 1;
          if (a[this.sortConfig.key] > b[this.sortConfig.key]) return this.sortConfig.asc ? 1 : -1;
          return 0;
        });
      }

      return filtered;
    },
    excelRows() {
      // Same as before, transform API data
      const rows = [];
      this.inventoryData.forEach(item => {
        if (item["Current Inventory"] && item["Current Inventory"].length) {
          // For each inventory record, create a row.
          item["Current Inventory"].forEach(inv => {
            rows.push({
              skuCode: item["SKU Code"],
              category: item["Category"],
              productTitle: item["Product Title"],
              sapCode: item["SAP Code"],
              hsn: item["HSN"],
              ean: item["EAN"],
              modelNumber: item["Model Number"],
              currentInventory: inv.count,
              updatedInventory: '', // For user input
              expiryDate: inv.expiry ? new Date(inv.expiry).toLocaleDateString() : ''
            });
          });
          // Insert a blank row after the inventory rows
          rows.push({
            skuCode: '',
            category: '',
            productTitle: '',
            sapCode: '',
            hsn: '',
            ean: '',
            modelNumber: '',
            currentInventory: '',
            updatedInventory: '',
            expiryDate: ''
          });
        } else {
          // For SKUs with no inventory, add one row with 0 and a blank row below.
          rows.push({
            skuCode: item["SKU Code"],
            category: item["Category"],
            productTitle: item["Product Title"],
            sapCode: item["SAP Code"],
            hsn: item["HSN"],
            ean: item["EAN"],
            modelNumber: item["Model Number"],
            currentInventory: 0,
            updatedInventory: '',
            expiryDate: ''
          });
          rows.push({
            skuCode: '',
            category: '',
            productTitle: '',
            sapCode: '',
            hsn: '',
            ean: '',
            modelNumber: '',
            currentInventory: '',
            updatedInventory: '',
            expiryDate: ''
          });
        }
      });
      return rows;
    },
  },
  methods: {
    toggleSort(key) {
      if (this.sortConfig.key === key) {
        this.sortConfig.asc = !this.sortConfig.asc;
      } else {
        this.sortConfig.key = key;
        this.sortConfig.asc = true;
      }
    },
    async handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const data = new Uint8Array(e.target.result);
          const workbook = read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = utils.sheet_to_json(worksheet);

          const updates = jsonData.map(row => ({
            skuCode: row['SKU Code*'],
            updatedInventory: row['Updated Inventory'],
            expiryDate: row['Expiry Date'],
          }));

          await axios.post('/api/inventory/update', { updates });
          await this.fetchInventoryData();
          this.showUpdateModal = false;
        };
        reader.readAsArrayBuffer(file);
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing inventory file');
      }
    },
    // Keep existing methods (fetchInventoryData, downloadExcel)
  },
  // Rest of the component
};
</script>

<style scoped>
.inventory-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.inventory-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-controls {
  display: flex;
  gap: 15px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 300px;
}

.tabs {
  margin-bottom: 20px;
  border-bottom: 2px solid #eee;
}

.tab-btn {
  padding: 10px 20px;
  background: none;
  border: none;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.tab-btn.active {
  border-color: #007bff;
  font-weight: bold;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

th,
td {
  padding: 12px;
  border: 1px solid #eee;
  text-align: left;
}

th {
  background-color: #f8f9fa;
}

.column-header {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.filter-controls {
  display: flex;
  gap: 5px;
}

.filter-input {
  padding: 4px;
  width: 100%;
  max-width: 120px;
}

.sort-btn {
  padding: 2px 5px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  cursor: pointer;
}

.inventory-input {
  width: 80px;
  padding: 4px;
  border: 1px solid #ddd;
  border-radius: 3px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  position: relative;
  min-width: 400px;
}

.modal-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-top: 20px;
}

.modal-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.download-btn {
  background: #28a745;
  color: white;
}

.upload-btn {
  background: #007bff;
  color: white;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}
</style>