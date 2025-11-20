<template>
  <div class="amazon-heading">
    <h4 class="amazon-text">Upload Amazon FBA Sheet</h4>
  </div>

  <div class="upload-page">
    <input type="file" @change="onFileChange" accept=".xlsx,.xls,.csv" />
    <button @click="uploadFile" :disabled="!file">Upload</button>

    <!-- Progress Bar -->
    <div v-if="uploading" class="progress-container">
      <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
      <span>{{ progressPercent }}%</span>
    </div>

    <!-- Success -->
    <div
      v-if="success && !error"
      style="color: green; font-weight: bold; margin-top: 15px;"
    >
      ✅ Amazon FBA processed successfully!
    </div>

    <!-- Table -->
    <div v-if="results.length" class="results-container">
      <h3>Processed Deduction Log:</h3>

      <table border="1" cellpadding="6">
        <thead>
          <tr>
            <th>#</th>
            <th>Merchant SKU</th>
            <th>Base SKU</th>
            <th>Child SKU</th>
            <th>Shipped Qty</th>
            <th>Multiplier</th>
            <th>Total Deduct</th>

            <th>Before Qty</th>
            <th>After Qty</th>

            <th>Title</th>
            <th>ASIN</th>
            <th>FNSKU</th>
            <th>External ID</th>
            <th>Condition</th>
            <th>Prep</th>
            <th>Label</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(r, index) in results" :key="index">
            <td>{{ index + 1 }}</td>
            <td>{{ r.merchantSku }}</td>
            <td>{{ r.baseSku }}</td>
            <td>{{ r.childSkuCode || '-' }}</td>

            <td>{{ r.shippedQty }}</td>
            <td>{{ r.multiplier }}</td>
            <td>{{ r.totalDeductQty }}</td>

            <td>{{ r.beforeQty }}</td>
            <td>{{ r.afterQty }}</td>

            <td>{{ r.title }}</td>
            <td>{{ r.asin }}</td>
            <td>{{ r.fnsku }}</td>
            <td>{{ r.externalId }}</td>
            <td>{{ r.itemCondition }}</td>
            <td>{{ r.whoWillPrep }}</td>
            <td>{{ r.whoWillLabel }}</td>

            <td>{{ r.error ? r.error : "Updated" }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Error -->
    <div v-if="error" class="error-message">{{ error }}</div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      file: null,
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
      this.results = [];
      this.error = null;
      this.success = false;
      this.progressPercent = 0;
      this.uploading = false;
    },

    uploadFile() {
      if (!this.file) return;

      const formData = new FormData();
      formData.append("file", this.file);

      this.results = [];
      this.error = null;
      this.success = false;
      this.progressPercent = 0;
      this.uploading = true;

      fetch(`${import.meta.env.VITE_BACKEND_NODE}/source?=amazon`, {
        method: "POST",
        body: formData,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

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

                try {
                  const obj = JSON.parse(line.replace("data:", "").trim());

                  // Row result
                  if (obj.rowType === "row") {
                    this.results.push(obj);
                  }

                  // Progress
                  if (obj.progressPercent !== undefined) {
                    this.progressPercent = obj.progressPercent;
                  }

                  // Final done
                  if (obj.done) {
                    this.progressPercent = 100;
                    this.uploading = false;

                    setTimeout(() => {
                      this.success = true;
                    }, 250);
                  }

                  // Global error
                  if (obj.error && !obj.rowType) {
                    this.error = obj.error;
                  }
                } catch (e) {
                  this.error = `Parse error: ${e.message}`;
                }
              }

              read();
            });
          };

          read();
        })
        .catch((err) => {
          this.error = `Upload failed: ${err.message}`;
          this.uploading = false;
        });
    },
  },
};
</script>

<style scoped>
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
  max-width: 1200px;
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
