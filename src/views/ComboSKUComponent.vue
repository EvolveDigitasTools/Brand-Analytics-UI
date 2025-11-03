<template class="main-ui">
  <div class="sku_mapp">
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
      baseUrls: [`${import.meta.env.VITE_BACKEND_NODE}`
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
          if (!response.ok) throw new Error("Server responded with error");
          return response;
        } catch (err) {
          console.warn(`Failed on ${base}${path}, trying next...`);
        }
      }
      throw new Error("All servers failed");
    },

    async uploadFile() {
      if (!this.selectedFile) return alert("Please select a file");

      this.uploading = true;
      this.progressPercent = 0;
      this.uploadSummary = null;

      const formData = new FormData();
      formData.append("file", this.selectedFile);

      try {
        // Try local first, fallback to live if fails
        const response = await this.fetchWithFallback("/api/combo-sku/upload", {
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

          buffer = messages.pop(); // keep incomplete line
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
      } catch (error) {
        this.uploading = false;
        alert("Upload failed on both local and live server: " + error.message);
      }
    },

    async downloadTemplate() {
      try {
        const response = await this.fetchWithFallback("/api/combo-sku/template", {
          method: "GET",
        });

        // Convert response to Blob and trigger download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "sku-mapping-template.xlsx";
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        alert("Failed to download template from both servers: " + error.message);
      }
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
  border-left: 4px solid #75bfb0;
}

.summary h4 {
  margin-bottom: 10px;
  color: #75bfb0;
}

.missing {
  margin-top: 0px;
  color: red !important;
  font-weight: bold;
   padding-bottom: 20px;
    padding-top: 20px;
}

.missing p {
  margin-top: 10px;
  color: red !important;
  font-weight: bold;
}

.missing p b {
    font-weight: 600;
    letter-spacing: 0.5px;
    font-size: 15px;
}

.missing ul li {
    color: #ea1414 !important;
    display: inline-flex;
    gap: 20px;
    padding-left: 0px;
        font-weight: 600;
    padding-right: 20px;
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
  color: #fff;
}


/* sanchit css */

.sku_mapp {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px;
  height: 100%;
  background: #f2f5f7;
}

.sku-mapping-card {
  background: #f2f5f7;
  border-radius: 20px;
  padding: 30px;
  width: 580px;
  box-shadow: 10px 10px 20px #d1d9e6, -10px -10px 20px #ffffff;
  text-align: center;
  transition: all 0.3s ease;
}

.sku-mapping-card:hover {
  box-shadow: inset 5px 5px 10px #d1d9e6, inset -5px -5px 10px #ffffff;
}

.sku-mapping-card h3 {
  font-weight: 600;
  
  color: #333;
}

/* ✅ Buttons (neumorphic) */
.sku-mapping-card .btn {
  width: 100%;
  margin: 10px 0;
  padding: 12px;
  border: none;
  border-radius: 50px;
  background: #75BFB0;
  color: white;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  /* box-shadow: 0px 0px 0px #75BFB0, 0px 0px 12px #75BFB0; */
  transition: all 0.25s ease-in-out;
}

.sku-mapping-card .btn:hover {
  background: linear-gradient(145deg, #75BFB0, #75BFB0);
  /* box-shadow: inset 0px 0px 0px #75BFB0, inset 0px 0px 6px #75BFB0; */
  transform: translateY(2px);
}

.sku-mapping-card input[type="file"] {
 margin: 10px 0 20px;
  border-radius: 8px;
  padding: 10px 12px;
  background: #f2f5f7;
  border: none;
  box-shadow: inset 2px 2px 5px #d1d9e6, inset -2px -2px 5px #fff;
  width: 100%;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease-in-out;
}

/* ✅ Progress Bar */
.progress-container {
  margin-top: 15px;
  text-align: left;
}

.progress-bar {
  height: 20px;
  background: linear-gradient(90deg, #4caf50, #81c784);
  border-radius: 10px;
  box-shadow: inset 2px 2px 5px rgba(0,0,0,0.1);
  transition: width 0.3s ease;
}

/* ✅ Summary */
.summary {
  margin-top: 25px;
  text-align: left;
  padding: 15px;
  border-radius: 12px;
  background: #f2f5f7;
  box-shadow: inset 4px 4px 8px #d1d9e6, inset -4px -4px 8px #ffffff;
}

.summary h4 {
  margin-bottom: 10px;
  color: #333;
  font-size: 15px;
    font-weight: 600;
}

.summary p,
.summary li {
  font-size: 13px;
  color: #555;
}

.summary .missing ul {
  margin-top: 5px;
  padding-left: 15px;
}



</style>
