<template>
  <div class="amazon-heading">
    <h4 class="amazon-text">Upload Amazon FBA Sheet</h4>
  </div>

  <div class="upload-page">

    <!-- FILE INPUT -->
    <div class="file-section">
      <input type="file" @change="onFileChange" accept=".xlsx,.xls,.csv" />
      <button class="load-btn" @click="extractExcel" :disabled="!file">Load Excel</button>
    </div>

    <!-- ============================= -->
    <!-- 1. SHIPMENT META SECTION       -->
    <!-- ============================= -->
    <div v-if="meta" class="meta-container animate">
      <h3>Shipment Details</h3>

      <table class="meta-table">
        <tr><td>Shipment ID:</td><td>{{ meta.shipmentId }}</td></tr>
        <tr><td>Name:</td><td>{{ meta.name }}</td></tr>
        <tr><td>Plan ID:</td><td>{{ meta.planId }}</td></tr>
        <tr><td>Ship To:</td><td>{{ meta.shipTo }}</td></tr>
        <tr><td>Total SKUs:</td><td>{{ meta.totalSkus }}</td></tr>
        <tr><td>Total Units:</td><td>{{ meta.totalUnits }}</td></tr>
      </table>

      <button class="start-btn" 
              @click="startDeduction" 
              :disabled="deductionStarted || !excelRows.length">
        ▶ Start Deduction
      </button>
    </div>

    <!-- ============================= -->
    <!-- 2. RAW EXCEL TABLE DISPLAY    -->
    <!-- ============================= -->
    <div v-if="excelRows.length" class="results-container animate">
      <h3>Excel Data Preview (As it is)</h3>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th v-for="(v, key, index) in excelRows[0]" :key="key">
                {{ key }}
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="(row, index) in excelRows" :key="index">
              <td v-for="(v, key2) in row" :key="key2">{{ v }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============================= -->
    <!-- 3. SSE PROGRESS SECTION       -->
    <!-- ============================= -->
    <div v-if="deductionStarted" class="sse-section animate">

      <!-- Progress Bar -->
      <div v-if="uploading" class="progress-container">
        <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
        <span class="progress-text">{{ progressPercent }}%</span>
      </div>

      <!-- Success -->
      <div v-if="success && !error" class="success-msg">
        ✅ Amazon FBA processed successfully!
      </div>

      <!-- Deduction Log Table -->
      <div v-if="results.length" class="results-container animate">
        <h3>Processed Deduction Log</h3>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Merchant SKU</th>
                <th>Base SKU</th>
                <th>Child SKU</th>
                <th>Shipped</th>
                <th>Multiplier</th>
                <th>Total Deduct</th>
                <th>Before</th>
                <th>After</th>
                <th>ASIN</th>
                <th>FNSKU</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="(r, index) in results" :key="index">
                <td>{{ index + 1 }}</td>
                <td>{{ r.merchantSku }}</td>
                <td>{{ r.baseSku }}</td>
                <td>{{ r.childSkuCode }}</td>
                <td>{{ r.shippedQty }}</td>
                <td>{{ r.multiplier }}</td>
                <td>{{ r.totalDeductQty }}</td>
                <td>{{ r.beforeQty }}</td>
                <td>{{ r.afterQty }}</td>
                <td>{{ r.asin }}</td>
                <td>{{ r.fnsku }}</td>
                <td>{{ r.error ? r.error : "Updated" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ERROR -->
      <div v-if="error" class="error-message animate">{{ error }}</div>
    </div>

  </div>
</template>

<script>
export default {
  data() {
    return {
      file: null,
      meta: null,
      excelRows: [],
      deductionStarted: false,

      // SSE
      results: [],
      uploading: false,
      progressPercent: 0,
      error: null,
      success: false,
    };
  },

  methods: {
    onFileChange(e) {
      this.file = e.target.files[0];

      // reset everything
      this.meta = null;
      this.excelRows = [];
      this.deductionStarted = false;
      this.results = [];
      this.progressPercent = 0;
      this.success = false;
      this.error = null;
    },

    /** STEP 1: Extract Excel for Preview */
    extractExcel() {
      if (!this.file) return;

      const formData = new FormData();
      formData.append("file", this.file);

      fetch(`${import.meta.env.VITE_BACKEND_NODE}/?source=extract-amazon-fba`, {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (!data.success) {
            this.error = data.message;
            return;
          }

          this.meta = data.meta;
          this.excelRows = data.table;
        })
        .catch((err) => {
          this.error = err.message;
        });
    },

    /** STEP 2: Start Deduction */
    startDeduction() {
      this.deductionStarted = true;
      this.uploadFile();
    },

    /** STEP 3: SSE Upload */
    uploadFile() {
      const formData = new FormData();
      formData.append("file", this.file);

      this.uploading = true;

      fetch(`${import.meta.env.VITE_BACKEND_NODE}/?source=amazon`, {
        method: "POST",
        body: formData,
      }).then((res) => {
        if (!res.ok) throw new Error("HTTP error");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        const read = () => {
          reader.read().then(({ done, value }) => {
            if (done) {
              this.uploading = false;
              return;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n").filter(Boolean);

            for (const line of lines) {
              if (!line.startsWith("data:")) continue;

              const obj = JSON.parse(line.replace("data:", "").trim());

              if (obj.rowType === "row") this.results.push(obj);

              if (obj.progressPercent !== undefined)
                this.progressPercent = obj.progressPercent;

              if (obj.error && !obj.rowType)
                this.error = obj.error;

              if (obj.done) {
                this.progressPercent = 100;
                this.uploading = false;
                setTimeout(() => (this.success = true), 350);
              }
            }

            read();
          });
        };

        read();
      });
    },
  },
};
</script>

<style scoped>
.success {
  color: green;
  font-weight: bold;
  margin-top: 15px;
}

.meta-container {
  margin-top: 20px;
  padding: 20px;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 0 10px #ccc;
}

.meta-table td {
  padding: 6px 10px;
  font-size: 14px;
}

.start-btn {
  margin-top: 20px;
  padding: 12px 24px;
  background: #1d7dff;
  border-radius: 8px;
  color: #fff;
  cursor: pointer;
  font-weight: bold;
}

.progress-container {
  margin-top: 20px;
  width: 100%;
  height: 22px;
  background: #f0f0f0;
  border-radius: 10px;
  position: relative;
}

.progress-bar {
  background: #3bb78f;
  height: 100%;
  border-radius: 10px;
  transition: width 0.2s ease;
}

.results-container {
  margin-top: 25px;
}

.error-message {
  color: red;
  font-weight: bold;
  margin-top: 20px;
}


/* (your existing styles reused — adding meta styles) */

.meta-container {
  margin-top: 20px;
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 2px 2px 10px #ccc;
}

.meta-table td {
  padding: 8px 14px;
  font-size: 15px;
}

.start-btn {
  margin-top: 20px;
  padding: 12px 24px;
  background: #278bff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
}

.start-btn:disabled {
  background: #aaa;
}

button {
  margin: 10px 0 10px 10px;
  padding: 5px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.amazon-heading {
  text-align: center;
  font-size: 32px;
  margin-top: 30px;
  margin-bottom: 30px;
  font-weight: 600;
  color: #333;
}

.upload-page {
  display: block;
  background: #f2f5f7;
  padding: 40px;
  border-radius: 20px;
  max-width: 100%;
  margin: 0 auto;
  box-shadow: 10px 10px 20px #d1d9e6, -10px -10px 20px #ffffff;
}

input[type="file"] {
  border-radius: 10px;
  background: #f2f5f7;
  padding: 14px 16px;
  width: 85%;
  font-size: 15px;
  cursor: pointer;
}

button {
  padding: 14px 40px;
  background: #7ac4b6;
  border-radius: 40px;
  color: #fff;
  font-size: 16px;
  font-weight: bold;
  margin-left: 15px;
}

.progress-container {
  margin-top: 20px;
  width: 100%;
  height: 20px;
  background: #f2f5f7;
  border-radius: 10px;
  position: relative;
}

.progress-bar {
  background: #7ac4b6;
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.results-container {
  margin-top: 30px;
  width: 100%;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: #7ac4b6;
  color: #fff;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #d3cbcb;
}

tr:nth-child(even) {
  background: #f9f9f9;
}

.error-message {
  color: red;
  margin-top: 15px;
  font-weight: bold;
  text-align: center;
}
</style>
