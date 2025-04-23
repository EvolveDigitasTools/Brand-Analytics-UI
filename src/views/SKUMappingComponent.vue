<template>
    <div class="sku-mapping-page">
        <h1>SKU Mapping</h1>
        <div class="download-button-container">
            <button @click="downloadSkuMappingExcel">Download SKU Mapping Excel</button>
        </div>
        <div class="upload-button-container">
            <input type="file" @change="handleSkuMappingUpload" accept=".xlsx">
            <button :disabled="uploadLoading">Upload SKU Mapping Excel</button>
        </div>
        <div class="progress-bar-container" v-if="uploadLoading">
            <progress-bar :value="uploadProgress" />
        </div>
        <div class="error-message-container" v-if="errorMessage">
            <p>{{ errorMessage }}</p>
        </div>
    </div>
</template>

<script>
import { Workbook } from 'exceljs'
import axios from 'axios';
export default {
    data() {
        return {
            uploadLoading: false,
            uploadProgress: 0,
            errorMessage: '',
        };
    },
    methods: {
        async downloadSkuMappingExcel() {
            const workbook = new Workbook();
            const worksheet = workbook.addWorksheet('SKU Mapping');

            // Set header row
            worksheet.addRow(['Mapping SKU Code', 'SKU 1', 'Quantity 1', 'SKU 2', 'Quantity 2', 'SKU 3', 'Quantity 3', 'SKU 4', 'Quantity 4', 'SKU 5', 'Quantity 5', 'SKU 6', 'Quantity 6', 'SKU 7', 'Quantity 7', 'SKU 8', 'Quantity 8', 'SKU 9', 'Quantity 9', 'SKU 10', 'Quantity 10']);

            // Save workbook to file
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sku_mapping.xlsx';
            a.click();
        },
        async handleSkuMappingUpload(event) {
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
                        const skuMappingData = [];

                        // Process rows
                        worksheet.eachRow((row, rowNumber) => {
                            if (rowNumber === 1) return; // Skip header

                            const mappingSkuCode = row.getCell(1).text.trim();
                            const mappings = [];

                            // Check if sku1 is present
                            const sku1 = row.getCell(2).text.trim();
                            if (sku1) {
                                const quantity1 = row.getCell(3).text ? parseFloat(row.getCell(3).text) : 0;
                                mappings.push({ skuCode: sku1, quantity: quantity1 });

                                // Check if sku2 is present
                                const sku2 = row.getCell(4).text.trim();
                                if (sku2) {
                                    const quantity2 = row.getCell(5).text ? parseFloat(row.getCell(5).text) : 0;
                                    mappings.push({ skuCode: sku2, quantity: quantity2 });
                                }

                                // Check if sku3 is present
                                const sku3 = row.getCell(6).text.trim();
                                if (sku3) {
                                    const quantity3 = row.getCell(7).text ? parseFloat(row.getCell(7).text) : 0;
                                    mappings.push({ skuCode: sku3, quantity: quantity3 });
                                }

                                // Check if sku4 is present
                                const sku4 = row.getCell(8).text.trim();
                                if (sku4) {
                                    const quantity4 = row.getCell(9).text ? parseFloat(row.getCell(9).text) : 0;
                                    mappings.push({ skuCode: sku4, quantity: quantity4 });
                                }

                                // Check if sku5 is present
                                const sku5 = row.getCell(10).text.trim();
                                if (sku5) {
                                    const quantity5 = row.getCell(11).text ? parseFloat(row.getCell(11).text) : 0;
                                    mappings.push({ skuCode: sku5, quantity: quantity5 });
                                }

                                // Check if sku6 is present
                                const sku6 = row.getCell(12).text.trim();
                                if (sku6) {
                                    const quantity6 = row.getCell(13).text ? parseFloat(row.getCell(13).text) : 0;
                                    mappings.push({ skuCode: sku6, quantity: quantity6 });
                                }
                                // Check if sku7 is present
                                const sku7 = row.getCell(14).text.trim();
                                if (sku7) {
                                    const quantity7 = row.getCell(15).text ? parseFloat(row.getCell(15).text) : 0;
                                    mappings.push({ skuCode: sku7, quantity: quantity7 });
                                }
                                // Check if sku8 is present
                                const sku8 = row.getCell(16).text.trim();
                                if (sku8) {
                                    const quantity8 = row.getCell(17).text ? parseFloat(row.getCell(17).text) : 0;
                                    mappings.push({ skuCode: sku8, quantity: quantity8 });
                                }
                                // Check if sku9 is present
                                const sku9 = row.getCell(18).text.trim();
                                if (sku9) {
                                    const quantity9 = row.getCell(19).text ? parseFloat(row.getCell(19).text) : 0;
                                    mappings.push({ skuCode: sku9, quantity: quantity9 });
                                }
                                // Check if sku10 is present
                                const sku10 = row.getCell(20).text.trim();
                                if (sku10) {
                                    const quantity10 = row.getCell(21).text ? parseFloat(row.getCell(21).text) : 0;
                                    mappings.push({ skuCode: sku10, quantity: quantity10 });
                                }

                            }

                            if (mappings.length > 0) {
                                skuMappingData.push({ mappingSkuCode, mappings });
                            }
                        });
                        console.log(skuMappingData);

                        // Send SKU mapping data to backend API
                        await axios.put(`${import.meta.env.VITE_BACKEND_URL}/sku/update-mapping`, skuMappingData);
                        this.uploadLoading = false;
                        alert('SKU mapping updated successfully!');
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
        }
    },
};
</script>

<style scoped>
.sku-mapping-page {
    max-width: 800px;
    margin: 40px auto;
    padding: 20px;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 10px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.download-button-container {
    margin-bottom: 20px;
}

.upload-button-container {
    margin-bottom: 20px;
}

.progress-bar-container {
    margin-bottom: 20px;
}

.error-message-container {
    margin-bottom: 20px;
    color: #f00;
}

button {
    background-color: #4CAF50;
    color: #fff;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
}

button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
}

input[type="file"] {
    margin-bottom: 10px;
}

progress-bar {
    width: 100%;
    height: 10px;
    background-color: #ccc;
    border-radius: 5px;
    overflow: hidden;
}

progress-bar::before {
    content: "";
    display: block;
    width: 0;
    height: 100%;
    background-color: #4CAF50;
    transition: width 0.5s ease-in-out;
}

progress-bar[aria-valuenow="100"]::before {
    width: 100%;
}
</style>