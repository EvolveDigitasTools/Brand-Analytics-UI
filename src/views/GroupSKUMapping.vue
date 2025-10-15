<template>
  <div class="group-sku-mapping-card">
    <h3>Group SKU Mapping</h3>

    <button @click="downloadTemplate" class="btn btn-success">
      Download Group SKU Template
    </button>

    <input type="file" @change="handleFileChange" />
    <button @click="uploadFile" class="btn btn-success" :disabled="!selectedFile">
      Upload Group SKU Excel
    </button>

    <!-- ✅ Progress Bar -->
    <div v-if="uploading" class="progress-container">
      <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
      <span>{{ progressPercent }}%</span>
    </div>

    <!-- ✅ Summary Display -->
    <div v-if="uploadSummary" class="summary">
      <h4>Upload Summary</h4>
      <p>New Group: <b>{{ uploadSummary.newCombos }}</b></p>
      <p>Existing Group: <b>{{ uploadSummary.existingCombos }}</b></p>
      <p>New SKU Items Added: <b>{{ uploadSummary.newSkuItems }}</b></p>
      <p>Skipped (Already Existing or Invalid): <b>{{ uploadSummary.skippedSkuItems }}</b></p>
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
  name: "ComboSkuMapping",
  data() {
    return {
      selectedFile: null,
      uploading: false,
      progressPercent: 0,
      uploadSummary: null,
      baseUrls: [
        `${import.meta.env.VITE_BACKEND_NODE}`
      ],
    };
  },
  methods: {
    handleFileChange(event) {
      this.selectedFile = event.target.files[0];
    },

    async fetchWithFallback(path, options) {
      for (const base of this.baseUrls) {
        try {
          const response = await fetch(`${base}${path}`, options);
          if (!response.ok) throw new Error(`Server responded with ${response.status}`);
          return response;
        } catch (err) {
          console.warn(`Failed on ${base}${path}, trying next...`, err);
        }
      }
      throw new Error("All servers failed");
    },

    async uploadFile() {
    if (!this.selectedFile) return alert("Please select a file");

    this.uploading = true;
    this.progressPercent = 0;
    this.uploadSummary = null;

    // Simulate progress
    const progressInterval = setInterval(() => {
        if (this.progressPercent < 90) {
        this.progressPercent += 10;
        }
    }, 200);

    const formData = new FormData();
    formData.append("file", this.selectedFile);

    try {
        const response = await this.fetchWithFallback("/api/group-sku/upload", {
        method: "POST",
        body: formData,
        });

        const data = await response.json();
        clearInterval(progressInterval); // Stop simulated progress

        if (data.success) {
        this.progressPercent = 100;
        this.uploading = false;
        this.uploadSummary = {
            newCombos: data.summary.newGroups || 0,
            existingCombos: data.summary.existingGroups || 0,
            newSkuItems: data.summary.newSkuItems || 0,
            skippedSkuItems: data.summary.skippedSkuItems || 0,
            missingSkus: data.summary.missingSkus || [],
        };
        } else {
        throw new Error(data.message || "Upload failed");
        }
    } catch (error) {
        clearInterval(progressInterval);
        this.uploading = false;
        this.progressPercent = 0;
        alert("Upload failed: " + error.message);
    }
    },

    async downloadTemplate() {
      try {
        const response = await this.fetchWithFallback("/api/group-sku/template", {
          method: "GET",
        });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "normal_sku_group_template.xlsx";
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        alert("Failed to download template: " + error.message);
      }
    },
  },
};
</script>

<style scoped>
.group-sku-mapping-card {
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
.btn:hover {
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
