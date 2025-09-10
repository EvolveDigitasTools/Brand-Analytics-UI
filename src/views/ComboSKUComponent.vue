<template>
  <div class="sku-mapping-card">
    <h3>SKU Mapping</h3>

    <button @click="downloadTemplate" class="btn btn-success">
      Download SKU Mapping Excel
    </button>

    <input type="file" @change="handleFileChange" />
    <button @click="uploadFile" class="btn btn-success" :disabled="!selectedFile">
      Upload SKU Mapping Excel
    </button>

    <!-- ✅ Progress Bar -->
    <div v-if="uploading" class="progress-container">
      <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
      <span>{{ progressPercent }}%</span>
    </div>

    <!-- ✅ Summary Display -->
    <div v-if="uploadSummary" class="summary">
      <h4>Upload Summary</h4>
      <p>New Combos: <b>{{ uploadSummary.newCombos }}</b></p>
      <p>Existing Combos: <b>{{ uploadSummary.existingCombos }}</b></p>
      <p>New SKU Items Added: <b>{{ uploadSummary.newSkuItems }}</b></p>
      <p>Skipped (Already Existing): <b>{{ uploadSummary.skippedSkuItems }}</b></p>
      <div v-if="uploadSummary.missingSkus.length > 0" class="missing">
        <p><b>Missing SKUs:</b></p>
        <ul>
          <li v-for="sku in uploadSummary.missingSkus" :key="sku">{{ sku }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      selectedFile: null,
      uploading: false,
      progressPercent: 0,
      uploadSummary: null,
    };
  },
  methods: {
    handleFileChange(event) {
      this.selectedFile = event.target.files[0];
    },
    async uploadFile() {
      if (!this.selectedFile) return alert("Please select a file");

      this.uploading = true;
      this.progressPercent = 0;
      this.uploadSummary = null;

      const formData = new FormData();
      formData.append("file", this.selectedFile);

      // Use Fetch API because Axios doesn’t support streaming progress from server
      const response = await fetch("http://localhost:4000/api/combo-sku/upload", {
        method: "POST",
        body: formData,
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n");

        // Process complete lines
        buffer = messages.pop();
        for (const msg of messages) {
          if (!msg.trim()) continue;
          const data = JSON.parse(msg);
          if (data.type === "progress") {
            this.progressPercent = data.percent;
          } else if (data.type === "done") {
            this.uploading = false;
            this.uploadSummary = data.summary;
          }
        }
      }
    },
    downloadTemplate() {
      window.location.href = "http://localhost:4000/api/combo-sku/template";
    },
  },
};
</script>

<style scoped>
.sku-mapping-card {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0px 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 700px;
  margin: 30px auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.btn {
  padding: 12px 20px;
  background: #4caf50;
  font-size: 16px;
  border-radius: 6px;
  cursor: pointer;
}
.btn:hover{
    transform: translate(-0.25rem, -0.25rem);
}
.btn-success {
  background: #4caf50;
  color: white;
  border: none;
}
.summary {
  margin-top: 20px;
  padding: 15px;
  background: #eef5ff;
  border-radius: 6px;
  border-left: 4px solid #4cafef;
}

.summary h4 {
  margin-bottom: 10px;
  color: #0077cc;
}

.missing {
  margin-top: 10px;
  color: red;
  font-weight: bold;
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
</style>
