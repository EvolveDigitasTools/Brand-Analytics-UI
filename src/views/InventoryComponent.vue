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
                                    <template v-if="column.key === 'expiryDate'">
                                        <div class="expiry-filter-wrapper">
                                            <v-select
                                                v-model="filters.expiryYearMonth"
                                                :items="yearMonthOptions"
                                                label="YYYY/MM"
                                                class="filter-select"
                                                clearable
                                                dense
                                                @update:modelValue="onExpiryFilterChange"
                                            ></v-select>
                                        </div>
                                    </template>
                                    <template v-else-if="column.key === 'lowShelf'">
                                        <input v-model="filters.lowShelf" @input="onFilterChange" class="filter-input" />
                                    </template>
                                    <input v-else v-model="filters[column.key]" @click.stop class="filter-input" />
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
                        <td>
                        <template v-for="(detail, index) in row.expiryDetails" :key="index">
                            <span>
                            {{ detail.expiryDate }} ({{ detail.count }})<span v-if="index < row.expiryDetails.length - 1">,</span>
                            </span>
                            <br v-if="index < row.expiryDetails.length - 1">
                        </template>
                        </td>
                        <td>{{ row.lowShelf }}</td>                        
                        <td>{{ row.salesLast15Days }}</td>
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
            lowShelfData: [],
            searchQuery: '',
            activeTab: 'All Inventory',
            // tabs: ['All Inventory', 'Low Inventory', 'Out of Stock', 'Near Expiry Inventory', 'Expired Inventory', 'Slow Moving SKU', 'Sales Last 15 Days'], // Added Sales Last 15 Days tab
            tabs: ['All Inventory', 'Low Inventory', 'Out of Stock', 'Near Expiry Inventory', 'Expired Inventory', 'Slow Moving SKU', 'Low Shelf', 'Sales Last 15 Days'], // Added Sales Last 15 Days tab
            columns: [
                { key: 'skuCode', label: 'SKU Code*' },
                { key: 'productTitle', label: 'Product Title*' },
                { key: 'currentInventory', label: 'Current Inventory' },
                { key: 'expiryDate', label: 'Expiry Date' },
                { key: 'lowShelf', label: 'Low Shelf (%)' },
                { key: 'salesLast15Days', label: 'Sales Last 15 Days' }
            ],
            filters: {
                expiryYearMonth: null,
                lowShelf: ''
            },
            sortConfig: { key: null, asc: true },
            showUpdateModal: false,
            uploadLoading: false,
            vendors: [],
            selectedVendor: 'All',
            inventoryUpdateDate: new Date().toISOString().substr(0, 10),
            yearOptions: Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 0 + i), // e.g., 2020-2029
            monthOptions: [
                { text: 'January', value: '01' },
                { text: 'February', value: '02' },
                { text: 'March', value: '03' },
                { text: 'April', value: '04' },
                { text: 'May', value: '05' },
                { text: 'June', value: '06' },
                { text: 'July', value: '07' },
                { text: 'August', value: '08' },
                { text: 'September', value: '09' },
                { text: 'October', value: '10' },
                { text: 'November', value: '11' },
                { text: 'December', value: '12' }
            ],
            uploadProgress: 0, // To track upload progress
            uploadMessages: [], // To store real-time upload messages
            salesLast15DaysData: [] // New data for sales last 15 days
        };
    },
    computed: {
        yearMonthOptions() {
            const options = [];
            this.yearOptions.forEach(year => {
                this.monthOptions.forEach(month => {
                    options.push(`${year}-${month.value}`);
                });
            });
            return options;
        },
        excelRows() {
            const rows = [];

            if (this.activeTab === 'Sales Last 15 Days' && this.salesLast15DaysData.length > 0) {
                this.salesLast15DaysData.forEach(item => {
                    rows.push({
                        skuCode: item.skuCode,
                        productTitle: item.productTitle || '',
                        salesLast15Days: item.salesLast15Days || 0,
                        currentInventory: 0, 
                        expiryDetails: [],
                        lowShelf: item.lowShelf || 0
                    });
                });
            } else if (this.activeTab === 'Low Shelf' && this.lowShelfData.length > 0) {
                this.lowShelfData.forEach(item => {
                    rows.push({
                        skuCode: item.skuCode,
                        productTitle: item.productTitle,
                        currentInventory: item.currentInventory || 0,
                        expiryDetails: item.expiryDate ? [{
                            expiryDate: item.expiryDate, // ✅ already formatted (YYYY-MM-DD) from backend
                            count: item.currentInventory || 0
                        }] : [],
                        lowShelf: item.expiryProgress || 0,
                        salesLast15Days: item.salesLast15Days || 0,
                    });
                });
            }
            else {
                const lowShelfMap = this.lowShelfData.reduce((map, item) => {
                    map[item.skuCode] = item.expiryProgress || 0;
                    return map;
                }, {});
                this.inventoryData.forEach(item => {
                    if (item.currentInventory && item.currentInventory.length) {
                        const row = {
                            skuCode: item.skuCode,
                            productTitle: item.productTitle,
                            sapCode: item.sapCode,
                            ean: item.ean,
                            salesLast15Days: item.salesLast15Days || 0,
                            expiryDetails: [],
                            lowShelf: lowShelfMap[item.skuCode] || 0
                        };

                        let totalCount = 0;
                        // Collect all expiry dates and counts
                        for (let i = 1; i <= 5; i++) {
                            const record = item.currentInventory[i - 1];
                            if (record) {
                                totalCount += record.count || 0;
                                if (record.expiry) {
                                    row.expiryDetails.push({
                                        expiryDate: record.expiry,
                                        count: record.count
                                    });
                                }
                            }
                        }

                        // ✅ If no expiry dates exist, still show total inventory (non-expiry stock)
                        if (row.expiryDetails.length === 0 && totalCount > 0) {
                            row.expiryDetails.push({
                                expiryDate: null,
                                count: totalCount
                            });
                        }

                        rows.push(row);
                    } else {
                        rows.push({
                            skuCode: item.skuCode,
                            productTitle: item.productTitle,
                            sapCode: item.sapCode,
                            ean: item.ean,
                            currentInventory1: 0,
                            salesLast15Days: item.salesLast15Days || 0,
                            expiryDetails: [],
                            lowShelf: lowShelfMap[item.skuCode] || 0
                        });
                    }
                });
            }
            return rows;
        },
        filteredRows() {
        let filtered = this.excelRows;

        // If expiryYearMonth is set, filter strictly by that year-month across all expiry dates
        if (this.filters.expiryYearMonth) {
            const [filterYear, filterMonth] = this.filters.expiryYearMonth.split('-');

            filtered = filtered
                .map(row => {
                    // Keep only expiryDetails matching selected year-month
                    const matchedExpiryDetails = row.expiryDetails.filter(detail => {
                        if (!detail.expiryDate) return false;
                        const date = new Date(detail.expiryDate);
                        const rowYear = date.getFullYear().toString();
                        const rowMonth = (date.getMonth() + 1).toString().padStart(2, '0');
                        return rowYear === filterYear && rowMonth === filterMonth;
                    });

                    // If no matching expiryDetails, exclude the row entirely
                    if (matchedExpiryDetails.length === 0) return null;

                    return {
                        ...row,
                        expiryDetails: matchedExpiryDetails
                    };
                })
                .filter(Boolean);
        } else {
                // Apply other filters only when no year-month is selected
                filtered = filtered.filter(row => {
                    const matchesSearch = this.searchQuery.toLowerCase().split(' ').every(term =>
                        row.skuCode.toLowerCase().includes(term) ||
                        row.productTitle.toLowerCase().includes(term)
                    );

                    const totalInventory = row.expiryDetails.reduce((sum, detail) => sum + (detail.count || 0), 0);

                    const matchesTab = this.activeTab === 'All Inventory' ||
                        (this.activeTab === 'Low Inventory' && totalInventory < 50 && totalInventory > 0) ||
                        (this.activeTab === 'Out of Stock' && totalInventory === 0) ||
                        (this.activeTab === 'Near Expiry Inventory' && 
                            row.expiryDetails.some(detail => 
                                detail.expiryDate && 
                                new Date(detail.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && 
                                new Date(detail.expiryDate) > new Date()
                            )
                        ) ||
                        (this.activeTab === 'Expired Inventory' && 
                            row.expiryDetails.some(detail => detail.expiryDate && 
                            new Date(detail.expiryDate) < new Date()
                            )
                        ) ||
                        (this.activeTab === 'Slow Moving SKU' && row.salesLast15Days == 0) ||
                        (this.activeTab === 'Low Shelf' && row.lowShelf > 0 && row.lowShelf < 60) ||                       
                        (this.activeTab === 'Sales Last 15 Days');

                    const matchesFilters = Object.entries(this.filters).every(([key, value]) => {
                        if (!value) return true;

                        if (key === 'expiryYearMonth') return true;

                        if (key === 'currentInventory') {
                            const totalInventory = row.expiryDetails.reduce((sum, detail) => sum + (detail.count || 0), 0);
                            return totalInventory.toString().includes(value.toString());
                        }if (key === 'lowShelf') {
                            const filterValue = parseFloat(value) || 0;
                            const rowValue = parseFloat(row.lowShelf) || 0;
                            return rowValue <= filterValue;
                        }
                        return String(row[key] || '').toLowerCase().includes(String(value).toLowerCase());
                    });

                    return matchesSearch && matchesTab && matchesFilters;
                });
            }

            filtered = filtered.map(row => {
                const groupedExpiryDetails = {};
                row.expiryDetails.forEach(detail => {
                    if (detail.expiryDate) {
                        const dateKey = detail.expiryDate;
                        if (!groupedExpiryDetails[dateKey]) {
                            groupedExpiryDetails[dateKey] = 0;
                        }
                        groupedExpiryDetails[dateKey] += detail.count || 0;
                    }
                });

                const expiryDisplay = Object.entries(groupedExpiryDetails)
                    .map(([date, count]) => `${date}(${count})`)
                    .join(', ');

                return {
                    ...row,
                    currentInventory: row.expiryDetails.reduce((sum, detail) => sum + (detail.count || 0), 0),
                    expiryDate: expiryDisplay || '',
                    lowShelf: row.lowShelf ? `${row.lowShelf}%` : '0%'
                };
            });

            if (this.sortConfig.key) {
                filtered = filtered.sort((a, b) => {
                    let aValue = a[this.sortConfig.key];
                    let bValue = b[this.sortConfig.key];
                    if (this.sortConfig.key === 'lowShelf') {
                        aValue = parseFloat(aValue) || 0;
                        bValue = parseFloat(bValue) || 0;
                    }
                    if (aValue < bValue) return this.sortConfig.asc ? -1 : 1;
                    if (aValue > bValue) return this.sortConfig.asc ? 1 : -1;
                    return 0;
                });
            }

            return filtered;
        },
    },
    methods: {
        onFilterChange() {
            // console.log('Filter changed, lowShelf filter:', this.filters.lowShelf); // Debug log
            this.$forceUpdate();
        },
        toggleSort(key) {
            if (this.sortConfig.key === key) {
                this.sortConfig.asc = !this.sortConfig.asc;
            } else {
                this.sortConfig.key = key;
                this.sortConfig.asc = true;
            }
        },
        async fetchInventoryData() {
            const vendorCode = this.$route.params.vendorCode;
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/inventory/${vendorCode}`);
                if (response.data && response.data.success) {
                    this.inventoryData = response.data.data.inventory;
                    await this.fetchLowShelfData();
                }
            } catch (error) {
                console.error('Error fetching inventory:', error);
            }
        },
        async fetchLowShelfData() {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_NODE}/api/expiry-percentage`, {
                    params: { vendorCode: this.$route.params.vendorCode }
                });
                if (response.data) {
                    this.lowShelfData = response.data;
                    // Merge lowShelf data into inventoryData
                    const lowShelfMap = this.lowShelfData.reduce((map, item) => {
                        map[item.skuCode] = item.expiryProgress || 0;
                        return map;
                    }, {});
                    this.inventoryData = this.inventoryData.map(item => ({
                        ...item,
                        lowShelf: lowShelfMap[item.skuCode] || 0
                    }));
                    // console.log('Merged Inventory Data:', this.inventoryData); // Debug log
                }
            } catch (error) {
                console.error('Error fetching low shelf data:', error.message, error.response ? error.response.data : 'No response data');
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
                let skuCodeCol, updatedInvCols = [], expiryCols = [];

                headerRow.eachCell((cell, colNumber) => {
                const header = cell.value ? cell.value.toString().trim() : '';
                if (header === 'SKU Code*') skuCodeCol = colNumber;
                if (header.startsWith('Updated Inventory')) updatedInvCols.push(colNumber);
                if (header.startsWith('Expiry Date')) expiryCols.push(colNumber);
                });

                if (!skuCodeCol || updatedInvCols.length === 0) {
                throw new Error('Missing required columns in Excel file');
                }

                worksheet.eachRow((row, rowNumber) => {
                if (rowNumber === 1) return; // skip header

                const skuCode = row.getCell(skuCodeCol).text.trim();
                if (!skuCode) return;

                const slotUpdates = [];

                updatedInvCols.forEach((col, index) => {
                    const updatedInvCell = row.getCell(col);
                    const expiryCell = row.getCell(expiryCols[index]);

                    let updatedQty = null;
                    let expiryDate = null;

                    // Updated Inventory
                    if (updatedInvCell?.value != null && updatedInvCell.value !== '') {
                    updatedQty = parseFloat(updatedInvCell.value);
                    } else {
                    updatedQty = 0; // treat blank as 0
                    }

                    // Expiry Date
                    if (expiryCell?.value) {
                    if (expiryCell.type === ValueType.Date) {
                        expiryDate = expiryCell.value.toISOString().slice(0, 10);
                    } else {
                        const parsed = new Date(expiryCell.text);
                        if (!isNaN(parsed)) expiryDate = parsed.toISOString().slice(0, 10);
                    }
                    } else {
                    expiryDate = null; // treat blank as null
                    }

                    slotUpdates.push({ updatedInventory: updatedQty, expiryDate });
                });

                updates.push({ skuCode, slotUpdates });
                });

                if (updates.length === 0) {
                this.uploadLoading = false;
                throw new Error('No valid inventory updates found in file');
                }

                const payload = {
                updates,
                updateTimestamp: (() => {
                    const date = new Date(this.inventoryUpdateDate);
                    date.setHours(17, 0, 0, 0); // 5:00 PM
                    return date.toISOString();
                })(),
                };

                await axios.post(`${import.meta.env.VITE_BACKEND_NODE}/api/inventory/update-all-slots`, payload);

                this.uploadLoading = false;
                await this.fetchInventoryData();
                this.showUpdateModal = false;
                alert('Inventory updated successfully!');
            } catch (err) {
                console.error('Error processing file:', err);
                alert(`Error: ${err.message}`);
                this.uploadLoading = false;
            }
            };

            reader.readAsArrayBuffer(file);

        } catch (err) {
            console.error('File read error:', err);
            alert('Error reading uploaded file');
            this.uploadLoading = false;
        }
        },

        async fetchSalesLast15Days() {
            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_NODE}/sales-last-15-days`, { // Adjust URL as needed
                    params: {
                        vendorCode: this.$route.params.vendorCode // Pass vendor context if required
                    }
                });
                if (response.data && response.data.success) {
                    this.salesLast15DaysData = response.data.data; // Store sales data
                }
            } catch (error) {
                console.error('Error fetching sales last 15 days:', error);
            }
        },
        // Keep existing methods (fetchInventoryData, downloadExcel)
        async fetchInventoryData() {
            const vendorCode = this.$route.params.vendorCode;

            try {
                const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/inventory/${vendorCode}`);
                if (response.data && response.data.success) {
                    // Assuming the API response returns inventory data in data.inventory with salesLast15Days
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
                if (this.activeTab === 'Low Shelf') {
                this.fetchLowShelfData();
            }
            });
        },
        async downloadExcel() {
            // Create a new workbook and worksheet using exceljs.
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('Inventory');

            // Define headers for up to 5 slots
            const headers = [
                { header: 'SKU Code*', key: 'skuCode', width: 15 },
                { header: 'Product Title*', key: 'productTitle', width: 30 },
                { header: 'SAP Code', key: 'sapCode', width: 15 },
                { header: 'EAN', key: 'ean', width: 15 },
                // { header: 'Current Inventory 1', key: 'currentInventory1', width: 18 },
                // { header: 'Updated Inventory 1', key: 'updatedInventory1', width: 18 },
                // { header: 'Expiry Date 1 (yyyy-mm-dd)', key: 'expiryDate1', width: 15 },
                // { header: 'Current Inventory 2', key: 'currentInventory2', width: 18 },
                // { header: 'Updated Inventory 2', key: 'updatedInventory2', width: 18 },
                // { header: 'Expiry Date 2 (yyyy-mm-dd)', key: 'expiryDate2', width: 15 },
                // { header: 'Current Inventory 3', key: 'currentInventory3', width: 18 },
                // { header: 'Updated Inventory 3', key: 'updatedInventory3', width: 18 },
                // { header: 'Expiry Date 3 (yyyy-mm-dd)', key: 'expiryDate3', width: 15 },
                // { header: 'Current Inventory 4', key: 'currentInventory4', width: 18 },
                // { header: 'Updated Inventory 4', key: 'updatedInventory4', width: 18 },
                // { header: 'Expiry Date 4 (yyyy-mm-dd)', key: 'expiryDate4', width: 15 },
                // { header: 'Current Inventory 5', key: 'currentInventory5', width: 18 },
                // { header: 'Updated Inventory 5', key: 'updatedInventory5', width: 18 },
                // { header: 'Expiry Date 5 (yyyy-mm-dd)', key: 'expiryDate5', width: 15 }
            ];

            for (let i = 1; i <= 5; i++) {
                headers.push(
                    { header: `Current Inventory ${i}`, key: `currentInventory${i}`, width: 18 },
                    { header: `Updated Inventory ${i}`, key: `updatedInventory${i}`, width: 18 },
                    { header: `Expiry Date ${i} (yyyy-mm-dd)`, key: `expiryDate${i}`, width: 15 }
                );
            }

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

            // Add rows with slot-based data
            this.excelRows.forEach(row => {
                const excelRow = {
                    skuCode: row.skuCode,
                    productTitle: row.productTitle,
                    sapCode: row.sapCode || '',
                    ean: row.ean || ''
                };

                // Populate up to 5 slots
                row.expiryDetails.forEach((detail, index) => {
                    if (index < 5) {
                        excelRow[`currentInventory${index + 1}`] = detail.count || 0;
                        excelRow[`updatedInventory${index + 1}`] = ''; // Empty for user input
                        excelRow[`expiryDate${index + 1}`] = detail.expiryDate || '';
                    }
                });

                // Fill remaining slots with empty values
                for (let i = row.expiryDetails.length + 1; i <= 5; i++) {
                    excelRow[`currentInventory${i}`] = '';
                    excelRow[`updatedInventory${i}`] = '';
                    excelRow[`expiryDate${i}`] = '';
                }

                const addedRow = worksheet.addRow(excelRow);

                // Apply styling to Updated Inventory columns
                headers.forEach((header, index) => {
                    if (header.key && header.key.startsWith('updatedInventory')) {
                        const cell = addedRow.getCell(index + 1);
                        cell.fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFCCE5FF' }
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

            try {
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/octet-stream' });
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'inventory.xlsx';
                link.click();
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error generating Excel file:', error);
                alert('Error generating Excel file');
            }
        },
        onExpiryFilterChange() {
            this.$forceUpdate();
        }
    },
    mounted() {
        // console.log('Component mounted, activeTab:', this.activeTab);
        // this.fetchInventoryData();
        // this.fetchVendors();
        // if (this.activeTab === 'Sales Last 15 Days') {
        //     this.fetchSalesLast15Days();
        // }
        // if (this.activeTab === 'Low Shelf') {
        // this.fetchLowShelfData();
        // }
        this.fetchInventoryData();
        this.fetchVendors();
        this.fetchLowShelfData();
        this.fetchSalesLast15Days();
    
    },
    // watch: {
    //     activeTab(newTab) {
    //         if (newTab === 'Sales Last 15 Days') {
    //             this.fetchSalesLast15Days();
    //         } else if (newTab === 'Low Shelf') {
    //         this.fetchLowShelfData();
    //         }
    //     }
    // }
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
    min-width: 0;
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
    align-items: center;
    /* flex-wrap: wrap; */
}

.filter-select {
    max-width: 200px;
    min-width: 150px;
    margin: 2px 0;
}

.filter-input {
    padding: 4px;
    width: 100%;
    max-width: 120px;
    border: 1px solid #ddd;
}

.expiry-filter-wrapper {
    display: flex;
    gap: 5px;
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

.v-menu__content {
    z-index: 1000 !important;
}

td:nth-child(4) { /* Adjust width for expiryDate column */
    max-width: 220px;
    word-wrap: break-word;
}
</style>