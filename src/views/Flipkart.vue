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

              // 🔹 Update progress
              if (json.progressPercent !== undefined) {
                this.progressPercent = json.progressPercent;
              }

              // 🔹 Push item updates
              if (json.uploadedSku || json.comboSku || json.error) {
                this.results.push(json);
              }

              // ✅ Process completed
              if (json.done) {
                this.progressPercent = 100;
                this.uploading = false;
                this.processing = false;
                this.successMessage = "All Flipkart inventory data updated successfully!";
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
.flipkart-heading {
  margin: 20px 0 20px 100px;
}
.flipkart-text {
  font-size: 2.125rem !important;
  font-weight: 400;
  font-family: "Roboto", sans-serif;
}
.upload-page {
  max-width: 1200px;
  margin: 20px auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
input {
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 85%;
  padding: 5px;
}
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
.progress-container {
  margin-top: 10px;
  background: #eee;
  border-radius: 8px;
  position: relative;
  height: 20px;
  width: 100%;
  overflow: hidden;
}
.progress-bar {
  background: #4caf50;
  height: 100%;
  transition: width 0.4s ease;
}
.progress-container span {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #333;
}
.results-container {
  margin-top: 20px;
}
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  border: 1px solid #d3cbcb;
  padding: 6px 10px;
  text-align: left;
}
thead {
  background: #f0f0f0;
}
.error-message {
  color: red;
  margin-top: 15px;
  font-weight: bold;
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
</style>
