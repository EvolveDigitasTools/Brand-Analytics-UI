<template>
    <div class="inventory-container">
        <!-- Header Section -->
        <header class="inventory-header">
            <h1>Inventory Management</h1>
            <div class="header-controls">
                <input type="text" v-model="searchQuery" placeholder="Search by SKU or Product Name"
                    class="search-input" />
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
                        <th v-for="column in columns.filter(column => column.visible == true)" :key="column.key">
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
                        <td>{{ row.currentInventory }}</td>
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
                        Download Stock Sheet
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
import { ValueType, Workbook } from 'exceljs';

export default {
    data() {
        return {
            inventoryData: [],
            searchQuery: '',
            activeTab: 'All Inventory',
            tabs: ['All Inventory', 'Low Inventory', 'Out of Stock'],
            columns: [
                { key: 'skuCode', label: 'SKU Code*', visible: true },
                { key: 'category', label: 'Category*', visible: true },
                { key: 'productTitle', label: 'Product Title*', visible: true },
                { key: 'sapCode', label: 'SAP Code' },
                { key: 'hsn', label: 'HSN' },
                { key: 'ean', label: 'EAN' },
                { key: 'modelNumber', label: 'Model Number' },
                { key: 'currentInventory', label: 'Current Inventory', visible: true },
                { key: 'updatedInventory', label: 'Updated Inventory' },
                { key: 'expiryDate', label: 'Expiry Date', visible: true },
            ],
            filters: {},
            sortConfig: { key: null, asc: true },
            showUpdateModal: false,
            uploadLoading: false
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
                            expiryDate: inv.expiry ?? ''
                        });
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
            this.uploadLoading = true;
            try {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const buffer = e.target.result;
                        const workbook = new Workbook();
                        await workbook.xlsx.load(buffer);

                        const worksheet = workbook.worksheets[0];
                        const updates = [];

                        // Map column headers
                        const headerRow = worksheet.getRow(1);
                        let skuCodeCol, updatedInvCol, expiryDateCol;

                        headerRow.eachCell((cell, colNumber) => {
                            switch (cell.value.trim()) {
                                case 'SKU Code*': skuCodeCol = colNumber; break;
                                case 'Updated Inventory': updatedInvCol = colNumber; break;
                                case 'Expiry Date': expiryDateCol = colNumber; break;
                            }
                        });

                        if (!skuCodeCol || !updatedInvCol) {
                            throw new Error('Missing required columns in Excel file');
                        }

                        let skuCode
                        // Process rows
                        worksheet.eachRow((row, rowNumber) => {
                            if (rowNumber === 1) return; // Skip header

                            skuCode = row.getCell(skuCodeCol).text.trim().length > 0 ? row.getCell(skuCodeCol).text.trim() : skuCode;
                            const updatedInv = parseFloat(row.getCell(updatedInvCol).text);

                            if (!skuCode || isNaN(updatedInv)) return;

                            const expiryCell = expiryDateCol ? row.getCell(expiryDateCol) : null;
                            let expiryDate = '';

                            if (expiryCell) {
                                expiryDate = expiryCell.type === ValueType.Date ?
                                    expiryCell.value.toISOString() :
                                    expiryCell.text;
                            }

                            updates.push({
                                skuCode,
                                updatedInventory: updatedInv,
                                expiryDate: expiryDate || null
                            });
                        });

                        if (updates.length === 0) {
                            this.uploadLoading = false;
                            throw new Error('No valid inventory updates found in file');
                        }

                        await axios.post('http://localhost:8080/api/inventory/update', { updates });
                        this.uploadLoading = false;
                        await this.fetchInventoryData();
                        this.showUpdateModal = false;
                        alert('Inventory updated successfully!');
                    } catch (error) {
                        console.error('Error processing file:', error);
                        alert(`Error: ${error.message}`);
                    }
                };
                reader.readAsArrayBuffer(file);
            } catch (error) {
                console.error('File read error:', error);
                alert('Error reading uploaded file');
            }
        },
        // Keep existing methods (fetchInventoryData, downloadExcel)
        async fetchInventoryData() {
            try {
                const response = await axios.get('http://localhost:8080/api/inventory/');
                if (response.data && response.data.success) {
                    // Assuming the API response returns inventory data in data.inventory
                    this.inventoryData = response.data.data.inventory;
                }
            } catch (error) {
                console.error('Error fetching inventory:', error);
            }
        },
        async downloadExcel() {
            // Create a new workbook and worksheet using exceljs.
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Inventory');

            // Define the headers.
            const headers = [
                { header: 'SKU Code*', key: 'skuCode', width: 15 },
                { header: 'Category*', key: 'category', width: 15 },
                { header: 'Product Title*', key: 'productTitle', width: 20 },
                { header: 'SAP Code', key: 'sapCode', width: 15 },
                { header: 'HSN', key: 'hsn', width: 15 },
                { header: 'EAN', key: 'ean', width: 15 },
                { header: 'Model Number', key: 'modelNumber', width: 15 },
                { header: 'Current Inventory', key: 'currentInventory', width: 18 },
                { header: 'Updated Inventory', key: 'updatedInventory', width: 18 },
                { header: 'Expiry Date', key: 'expiryDate', width: 15 }
            ];
            worksheet.columns = headers;

            // Add rows to the worksheet.
            this.excelRows.forEach(row => {
                worksheet.addRow(row);
                // worksheet.addRow();
            });

            // Generate the excel file as a Blob and trigger the download.
            try {
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/octet-stream' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'inventory.xlsx';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error generating excel file:', error);
            }
        }
    },
    mounted() {
        this.fetchInventoryData();
    }
};
</script>

<style scoped>
.inventory-container {
    padding: 20px;
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
    border: 1px solid #ddd;
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
    text-align: center;
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