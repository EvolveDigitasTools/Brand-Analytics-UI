<template>
    <div class="amazon-heading"><h4 class="amazon-text">Upload Amazon Inventory Sheet</h4></div>
    
  <div class="upload-page">
    <!-- <h2>Upload Amazon Inventory Sheet</h2> -->

    <input type="file" @change="onFileChange" accept=".xlsx,.xls,.csv" />

    <button @click="uploadFile" :disabled="!file">Upload</button>

    <div v-if="loading">Uploading...</div>

    <div v-if="results.length">
      <h3>Results:</h3>
      <table border="1" cellpadding="6">
        <thead>
          <tr>
            <th>SKU Code</th>
            <th>Old Qty</th>
            <th>Deducted</th>
            <th>New Qty</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, index) in results" :key="index">
            <td>{{ r.originalSku || (r.comboSku) || (r.skuCode) }}</td>
            <td>{{ r.oldQty ?? "-" }}</td>
            <td>{{ r.deducted ?? "-" }}</td>
            <td>{{ r.newQty ?? "-" }}</td>
            <td>{{ r.error ? r.error : "Updated" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from "axios";

export default {
  name: "UploadAmazon",
  data() {
    return {
      file: null,
      results: [],
      loading: false,
      baseUrls: [
        "https://brand-analytics-node.onrender.com",
        "http://localhost:4000"
      ],
    };
  },
  methods: {
    onFileChange(e) {
      this.file = e.target.files[0];
    },

    async uploadFile() {
      if (!this.file) return;

      this.loading = true;
      this.results = [];

      const formData = new FormData();
      formData.append("file", this.file);

      let uploaded = false;

      for (const base of this.baseUrls) {
        try {
          const res = await axios.post(`${base}/upload-amazon`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });

          this.results = res.data.results;
          uploaded = true;
          break; // ✅ stop trying if successful
        } catch (err) {
          console.warn(`Failed to upload to ${base}/upload-amazon, trying next...`, err.message);
        }
      }

      if (!uploaded) {
        alert("Upload failed on both live and local servers!");
      }

      this.loading = false;
    },
  },
};
</script>

<style scoped>
.amazon-heading {
    height: fit-content;
    width: fit-content;
    margin: 20px 0 20px 100px;
}

.amazon-text {
    font-size: 2.125rem !important;
    font-weight: 400;
    line-height: 1.175;
    letter-spacing: 0.0073529412em !important;
    font-family: "Roboto", sans-serif;
    text-transform: none !important;
}
.upload-page {
  max-width: 700px;
  justify-content: center;
  align-items: center;
  margin: 20px auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
button {
  margin-top: 10px;
  padding: 8px 16px;
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
</style>
