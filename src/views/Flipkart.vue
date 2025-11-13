<template>
  <div class="flipkart-heading"><h4 class="flipkart-text">Upload Flipkart Inventory Sheet</h4></div>

  <div class="upload-page">
    <input type="file" @change="onFileChange" accept=".xlsx,.xls,.csv" />
    <button @click="uploadFile" :disabled="!file">Upload</button>

    <div v-if="uploading" class="progress-container">
      <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
      <span>{{ progressPercent }}%</span>
    </div>

    <div v-if="successMessage" class="success-message">
      ✅ {{ successMessage }}
    </div>

    <div v-if="results.length" class="results-container">
      <h3>Results:</h3>
      <table border="1" cellpadding="6">
        <thead>
          <tr>
            <th>#</th>
            <th>SKU Code</th>
            <th>Child SKU</th>
            <th>Old Qty</th>
            <th>Deducted</th>
            <th>New Qty</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, index) in results" :key="r.uploadedSku + '_' + index">
            <td>{{ index + 1 }}</td>
            <td>{{ r.uploadedSku || r.comboSku || r.groupSku || r.skuCode || "-" }}</td>
            <td>{{ r.childSku ? r.childSku : (r.type === "normal-with-group" ? "-" : "") }}</td>
            <td>{{ r.oldQty ?? "-" }}</td>
            <td>{{ r.deducted ?? "-" }}</td>
            <td>{{ r.newQty ?? "-" }}</td>
             <td :class="{ error: r.error }">
              {{ r.skipped ? `Skipped - ${r.reason}` : r.error ? `❌ ${r.error}` : "✅ Updated" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
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
      processing: false,
      progressPercent: 0,
      error: null,
      successMessage: "",
    };
  },
  methods: {
    onFileChange(e) {
      this.file = e.target.files[0];
      this.results = [];
      this.error = null;
      this.progressPercent = 0;
      this.successMessage = "";
    },

    async uploadFile() {
      if (!this.file) return;

      const formData = new FormData();
      formData.append("file", this.file);

      this.results = [];
      this.progressPercent = 0;
      this.uploading = true;
      this.processing = true;
      this.error = null;
      this.successMessage = "";

      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_NODE}/flipkart-sse`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((line) => line.startsWith("data: "));

          for (const line of lines) {
            try {
              const json = JSON.parse(line.replace("data: ", ""));

              if (json.progressPercent !== undefined) {
                this.progressPercent = json.progressPercent;
              }

              if (json.uploadedSku || json.comboSku || json.error) {
                this.results.push(json);
              }

              if (json.done) {
                this.progressPercent = 100;
                this.uploading = false;
                this.processing = false;
                this.successMessage = "All orders data updated successfully!";
              }

              // ❌ Fatal error
              if (json.error && !json.uploadedSku) {
                this.error = json.error;
                this.uploading = false;
                this.processing = false;
              }
            } catch (err) {
              console.warn("JSON parse error:", err.message);
            }
          }
        }
      } catch (err) {
        this.uploading = false;
        this.processing = false;
        this.error = `Upload failed: ${err.message}`;
      }
    },
  },
};
</script>

<style scoped>
button {
  margin: 10px 0 10px 10px;
  padding: 6px 16px;
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

.success-message {
  color: #28a745;
  margin-top: 15px;
  font-weight: bold;
  text-align: center;
  animation: fadeIn 0.6s ease;
}
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
td.error {
  color: red;
}

button {
  margin: 10px 0 10px 10px;
  padding: 5px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.flipkart-heading {
  text-align: center;
  font-size: 32px;
  margin-top: 30px;
  margin-bottom: 30px;
  font-weight: 600;
  color: #333;
}

.upload-page {
  display: block;
  
  align-items: center;
  
  background: #f2f5f7;
  padding: 40px;
  border-radius: 20px;
  max-width: 1100px;
  margin: 0 auto;
  box-shadow: 10px 10px 20px #d1d9e6, -10px -10px 20px #ffffff;
  transition: all 0.3s ease;
}

input[type="file"] {
  border: none;
  outline: none;
  border-radius: 10px;
  background: #f2f5f7;
  padding: 14px 16px;
  width: 85%;
  font-size: 15px;
  cursor: pointer;
  box-shadow: inset 2px 2px 5px #d1d9e6, inset -2px -2px 5px #fff;
  transition: all 0.2s ease-in-out;
}

input[type="file"]:hover {
  box-shadow: inset 1px 1px 3px #d1d9e6, inset -1px -1px 3px #fff;
}

button {
  padding: 14px 40px;
  background: #7ac4b6;
  border: none;
  border-radius: 40px;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
  margin-left: 15px;
  box-shadow: 4px 4px 8px #c4ccd4, -4px -4px 8px #ffffff;
  transition: all 0.2s ease-in-out;
}

button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
  box-shadow: inset 2px 2px 5px #d1d9e6, inset -2px -2px 5px #fff;
}

.progress-container {
  margin-top: 20px;
  width: 80%;
  height: 20px;
  background: #f2f5f7;
  border-radius: 10px;
  box-shadow: inset 2px 2px 5px #d1d9e6, inset -2px -2px 5px #fff;
  position: relative;
  overflow: hidden;
}

.progress-bar {
  background: #7ac4b6;
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s ease;
}

.progress-container span {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #333;
  font-size: 12px;
  font-weight: bold;
}

.results-container {
  margin-top: 30px;
  width: 100%;
  background: #f2f5f7;
  border-radius: 20px;
  padding: 20px;
 
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  border-radius: 10px;
  overflow: hidden;
  font-size: 14px;
}

thead {
  background: #7ac4b6;
  color: #fff;
}

th, td {
  padding: 12px;
  text-align: left;
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
