<template>
  <div class="amazon-heading">
    <h4 class="amazon-text">Upload Amazon Inventory Sheet</h4>
  </div>

  <div class="upload-page">
    <!-- 📁 File Input -->
    <input type="file" @change="onFileChange" accept=".xlsx,.xls,.csv" />
    <button @click="uploadFile" :disabled="!file || uploading">
      {{ uploading ? "Uploading..." : "Upload" }}
    </button>

    <!-- 🔁 Progress Bar -->
    <div v-if="processing" class="progress-container">
      <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
      <span>{{ Math.floor(progressPercent) }}%</span>
    </div>

    <!-- ✅ Real-Time Results -->
    <div v-if="results.length" class="results-container">
      <h3>Results:</h3>
      <table border="1" cellpadding="6">
        <thead>
          <tr>
            <th>#</th>
            <th>SKU Type</th>
            <th>SKU / Combo SKU</th>
            <th>Child SKU (if combo)</th>
            <th>Old Qty</th>
            <th>Deducted</th>
            <th>New Qty</th>
            <th>Order ID</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, index) in results" :key="index">
            <td>{{ index + 1 }}</td>
            <td>{{ r.skuType || "NORMAL" }}</td>
            <td>{{ r.originalSku || r.comboSku || r.skuCode || "-" }}</td>
            <td>{{ r.childSku || "-" }}</td>
            <td>{{ r.oldQty ?? "-" }}</td>
            <td>{{ r.deducted ?? "-" }}</td>
            <td>{{ r.newQty ?? "-" }}</td>
            <td>{{ r.orderId || "-" }}</td>
            <td :class="{ error: r.error }">
              {{ r.error ? `❌ ${r.error}` : "✅ Updated" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ❌ Error Display -->
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
      processing: false,
    };
  },
  methods: {
    onFileChange(e) {
      this.file = e.target.files[0];
      this.results = [];
      this.error = null;
      this.progressPercent = 0;
    },

    async uploadFile() {
      if (!this.file) return;

      this.uploading = true;
      this.processing = true;
      this.results = [];
      this.progressPercent = 0;
      this.error = null;

      const formData = new FormData();
      formData.append("file", this.file);

      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_NODE}/amazon-sse`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            try {
              const json = JSON.parse(line.replace("data: ", ""));

              // 🧩 Real-time percentage updates
              if (json.progressPercent !== undefined) {
                this.progressPercent = json.progressPercent;
              }

              // 📦 SKU status messages
              if (json.originalSku || json.comboSku || json.error) {
                this.results.push(json);
              }

              // ✅ Processing finished
              if (json.done) {
                this.progressPercent = 100;
                this.uploading = false;
                this.processing = false;
              }

              // ❌ Error during processing
              if (json.error && !json.originalSku) {
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
.amazon-heading {
  margin: 20px 0 20px 100px;
}
.amazon-text {
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
  background: #0073e6;
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
  background: #0073e6;
  height: 100%;
  transition: width 0.2s ease;
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
th, td {
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
td.error {
  color: red;
}
</style>
