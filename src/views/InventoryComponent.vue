<template>
    <div class="inventory-container">
        <!-- Header Section -->
        <header class="inventory-header">
            <h1>Inventory Management</h1>
            <div class="header-controls">
                <div>
                    <div>
                        <v-autocomplete label="Select Vendor"
                            :items="['All', ...vendors.map(vendor => vendor.brandName)]" v-model="selectedVendor"
                            @update:modelValue="onVendorChange"
                            style="min-width: 200px; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                            class="custom-autocomplete"></v-autocomplete>
                    </div>
                </div>
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
                    <label class="modal-btn">
                        Date of Inventory Update:
                        <input type="date" v-model="inventoryUpdateDate" class="date-input" />
                    </label>
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
            tabs: ['All Inventory', 'Low Inventory', 'Out of Stock', 'Near Expiry Inventory', 'Expired Inventory'],
            columns: [
                { key: 'skuCode', label: 'SKU Code*' },
                { key: 'productTitle', label: 'Product Title*' },
                { key: 'currentInventory', label: 'Current Inventory' },
                { key: 'expiryDate', label: 'Expiry Date' },
            ],
            filters: {},
            sortConfig: { key: null, asc: true },
            showUpdateModal: false,
            uploadLoading: false,
            vendors: [],
            selectedVendor: 'All',
            inventoryUpdateDate: new Date().toISOString().substr(0, 10),
        };
    },
    computed: {
        filteredRows() {
            let filtered = this.excelRows.filter(row => {
                const matchesSearch = this.searchQuery.toLowerCase().split(' ').every(term =>
                    row.skuCode.toLowerCase().includes(term) ||
                    row.productTitle.toLowerCase().includes(term)
                );

                const totalInventory = (row.currentInventory1 ?? 0) +
                    (row.currentInventory2 ?? 0) +
                    (row.currentInventory3 ?? 0) +
                    (row.currentInventory4 ?? 0) +
                    (row.currentInventory5 ?? 0)
                const matchesTab = this.activeTab === 'All Inventory' ||
                    (this.activeTab === 'Low Inventory' && totalInventory < 50 && totalInventory > 0) ||
                    (this.activeTab === 'Out of Stock' && totalInventory === 0) ||
                    (this.activeTab === 'Near Expiry Inventory' && row.expiryDate1 && new Date(row.expiryDate1) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && new Date(row.expiryDate1) > new Date()) ||
                    (this.activeTab === 'Expired Inventory' && row.expiryDate1 && new Date(row.expiryDate1) < new Date());

                const matchesFilters = Object.entries(this.filters).every(([key, value]) =>
                    !value || String(row[key]).toLowerCase().includes(value.toLowerCase())
                );

                return matchesSearch && matchesTab && matchesFilters;
            }).map(row => {
                return {
                    ...row,
                    currentInventory: ['Near Expiry Inventory', 'Expired Inventory'].includes(this.activeTab) ? (row.currentInventory1 ?? 0) :
                        (row.currentInventory1 ?? 0) +
                        (row.currentInventory2 ?? 0) +
                        (row.currentInventory3 ?? 0) +
                        (row.currentInventory4 ?? 0) +
                        (row.currentInventory5 ?? 0),
                    expiryDate: row.expiryDate1 ? `${row.expiryDate1}(${row.currentInventory1})` : ''
                };
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
                    const row = {
                        skuCode: item["SKU Code"],
                        productTitle: item["Product Title"],
                        sapCode: item["SAP Code"],
                        ean: item["EAN"],
                    };
                    item["Current Inventory"].forEach((inv, i) => {
                        row[`currentInventory${i + 1}`] = inv.count;
                        row[`updatedInventory${i + 1}`] = '';
                        row[`expiryDate${i + 1}`] = inv.expiry ?? '';
                    });
                    rows.push(row);
                } else {
                    // For SKUs with no inventory, add one row with 0 and a blank row below.
                    rows.push({
                        skuCode: item["SKU Code"],
                        productTitle: item["Product Title"],
                        sapCode: item["SAP Code"],
                        ean: item["EAN"],
                        currentInventory1: 0
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
                        let skuCodeCol, currentInvCols = [], updatedInvCols = [], expiryDateCols = [];

                        headerRow.eachCell((cell, colNumber) => {
                            const header = cell.value.trim();
                            if (header === 'SKU Code*') skuCodeCol = colNumber;
                            if (header.startsWith('Current Inventory')) currentInvCols.push(colNumber);
                            if (header.startsWith('Updated Inventory')) updatedInvCols.push(colNumber);
                            if (header.startsWith('Expiry Date')) expiryDateCols.push(colNumber);
                        });

                        if (!skuCodeCol || updatedInvCols.length === 0) {
                            throw new Error('Missing required columns in Excel file');
                        }

                        // Process rows
                        worksheet.eachRow((row, rowNumber) => {
                            if (rowNumber === 1) return; // Skip header

                            const skuCode = row.getCell(skuCodeCol).text.trim();
                            if (!skuCode) return;

                            updatedInvCols.forEach((updatedCol, index) => {
                                const currentInv = parseFloat(row.getCell(currentInvCols[index]).value) || 0;
                                const updatedInvCell = row.getCell(updatedCol);
                                const updatedInv = updatedInvCell?.value !== undefined && updatedInvCell?.value !== null ? parseFloat(updatedInvCell.value)
                                    : null;

                                if (updatedInv === null || isNaN(updatedInv)) return;

                                if (updatedInv !== currentInv) {
                                    const expiryDateCell = row.getCell(expiryDateCols[index]);
                                    const expiryDate = expiryDateCell?.value
                                        ? expiryDateCell.type === ValueType.Date
                                            ? expiryDateCell.value.toISOString().split('T')[0]
                                            : expiryDateCell.text
                                        : null;

                                    updates.push({
                                        skuCode,
                                        updatedInventory: updatedInv,
                                        expiryDate: expiryDate || null,
                                    });
                                }
                            });
                        });

                        if (updates.length === 0) {
                            this.uploadLoading = false;
                            throw new Error('No valid inventory updates found in file');
                        }

                        // Send data to backend
                        const payload = {
                            updates,
                            updateTimestamp: (() => {
                                const date = new Date(this.inventoryUpdateDate);
                                date.setHours(17, 0, 0, 0); // Set time to 5:00 PM (17:00:00)
                                return date.toISOString();
                            })(),
                        };

                        await axios.post(`${import.meta.env.VITE_BACKEND_URL}/inventory/update`, payload);
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
            const vendorCode = this.$route.params.vendorCode;

            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/inventory/${vendorCode}`);
                if (response.data && response.data.success) {
                    // Assuming the API response returns inventory data in data.inventory
                    this.inventoryData = response.data.data.inventory;
                }
            } catch (error) {
                console.error('Error fetching inventory:', error);
            }
        },
        async fetchVendors() {
            try {
                const vendorCode = this.$route.params.vendorCode;
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/vendor/all`);
                if (response.data) {
                    // Assuming the API response returns vendor data in data.vendors
                    this.vendors = response.data;
                    this.selectedVendor = this.vendors.find(vendor => vendor.vendorCode === vendorCode)?.brandName || 'All';
                }
            } catch (error) {
                console.error('Error fetching vendors:', error);
            }
        },
        onVendorChange(selectedBrandName) {
            const selectedVendor = this.vendors.find(vendor => vendor.brandName === selectedBrandName);
            const vendorCode = selectedVendor ? selectedVendor.vendorCode : null;

            // Update the URL with the selected vendorCode
            this.$router.push({
                name: this.$route.name,
                params: { vendorCode: vendorCode || '' },
            }).then(() => {
                // Fetch inventory data after the route has been updated
                this.fetchInventoryData();
            });
        },
        async downloadExcel() {
            // Create a new workbook and worksheet using exceljs.
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Inventory');

            // Define the headers.
            const headers = [
                { header: 'SKU Code*', key: 'skuCode', width: 15 },
                { header: 'Product Title*', key: 'productTitle', width: 30 },
                { header: 'SAP Code', key: 'sapCode', width: 15 },
                { header: 'EAN', key: 'ean', width: 15 },
                { header: 'Current Inventory 1', key: 'currentInventory1', width: 18 },
                { header: 'Updated Inventory 1', key: 'updatedInventory1', width: 18 },
                { header: 'Expiry Date 1 (yyyy-mm-dd)', key: 'expiryDate1', width: 15 },
                { header: 'Current Inventory 2', key: 'currentInventory2', width: 18 },
                { header: 'Updated Inventory 2', key: 'updatedInventory2', width: 18 },
                { header: 'Expiry Date 2 (yyyy-mm-dd)', key: 'expiryDate2', width: 15 },
                { header: 'Current Inventory 3', key: 'currentInventory3', width: 18 },
                { header: 'Updated Inventory 3', key: 'updatedInventory3', width: 18 },
                { header: 'Expiry Date 3 (yyyy-mm-dd)', key: 'expiryDate3', width: 15 },
                { header: 'Current Inventory 4', key: 'currentInventory4', width: 18 },
                { header: 'Updated Inventory 4', key: 'updatedInventory4', width: 18 },
                { header: 'Expiry Date 4 (yyyy-mm-dd)', key: 'expiryDate4', width: 15 },
                { header: 'Current Inventory 5', key: 'currentInventory5', width: 18 },
                { header: 'Updated Inventory 5', key: 'updatedInventory5', width: 18 },
                { header: 'Expiry Date 5 (yyyy-mm-dd)', key: 'expiryDate5', width: 15 }
            ];
            worksheet.columns = headers;

            // Freeze the first row and first column
            worksheet.views = [
                { state: 'frozen', xSplit: 1, ySplit: 1 } // Freeze first row and first column
            ];

            const headerRow = worksheet.getRow(1);
            headerRow.height = 35; // Set height for the header row
            headerRow.eachCell((cell) => {
                cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }; // Enable text wrapping
                cell.font = { bold: true }; // Make header text bold
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFCCCCCC' } // Light gray background for headers
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FF000000' } },
                    left: { style: 'thin', color: { argb: 'FF000000' } },
                    bottom: { style: 'thin', color: { argb: 'FF000000' } },
                    right: { style: 'thin', color: { argb: 'FF000000' } }
                };
            });

            // Add rows to the worksheet.
            this.excelRows.forEach(row => {
                const addedRow = worksheet.addRow(row);

                // Apply color styling to "Updated Inventory" columns
                headers.forEach((header, index) => {
                    if (header.key && header.key.startsWith('updatedInventory')) {
                        const cell = addedRow.getCell(index + 1); // Get the cell for the current column
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFCCE5FF' } // Light blue background for updated inventory
                        };
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FF000000' } },
                            left: { style: 'thin', color: { argb: 'FF000000' } },
                            bottom: { style: 'thin', color: { argb: 'FF000000' } },
                            right: { style: 'thin', color: { argb: 'FF000000' } }
                        };
                    }
                });
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
        this.fetchVendors();
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

.custom-autocomplete {
    margin: 0;
    /* Remove extra space */
    padding: 0;
    /* Remove extra space */
    display: inline-block;
    /* Ensure it only takes up the necessary space */
}

.custom-autocomplete .v-input {
    white-space: nowrap;
    /* Prevent text wrapping */
    overflow: hidden;
    /* Hide overflowing text */
    text-overflow: ellipsis;
    /* Add ellipsis for long text */
}

.custom-autocomplete .v-input__control {
    min-width: 200px;
    /* Set a minimum width */
    max-width: 100%;
    /* Allow it to grow as needed */
}
</style>