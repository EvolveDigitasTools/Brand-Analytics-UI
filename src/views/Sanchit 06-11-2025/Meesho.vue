<template>
  <div class="meesho-heading"><h4 class="meesho-text">Upload Meesho Inventory Sheet</h4></div>

  <div class="upload-page">
    <input type="file" @change="onFileChange" accept=".xlsx,.xls,.csv" />
    <button @click="uploadFile" :disabled="!file">Upload</button>

    <div v-if="uploading" class="progress-container">
      <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
      <span>{{ progressPercent }}%</span>
    </div>

    <div v-if="results.length" class="results-container">
      <h3>Results:</h3>
      <table border="1" cellpadding="6">
        <thead>
          <tr>
            <th>#</th>
            <th>SKU Code</th>
            <!-- <th>Reason</th> -->
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
            <!-- <td>{{ r.reason ?? "-" }}</td> -->
            <td>{{ r.childSku ? r.childSku : (r.type === "normal-with-group" ? "-" : "") }}</td>
            <td>{{ r.oldQty ?? "-" }}</td>
            <td>{{ r.deducted ?? "-" }}</td>
            <td>{{ r.newQty ?? "-" }}</td>
            <td>{{ r.skipped ? `Skipped - ${r.reason}` : r.error ? r.error : "Updated" }}</td>
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
      progressPercent: 0,
      error: null,
    };
  },
  methods: {
    onFileChange(e) {
      this.file = e.target.files[0];
      this.results = [];
      this.error = null;
    },

    uploadFile() {
      if (!this.file) return;

      const formData = new FormData();
      formData.append("file", this.file);

      this.results = [];
      this.progressPercent = 0;
      this.uploading = true;
      this.error = null;

      fetch(`${import.meta.env.VITE_BACKEND_NODE}/meesho-sse`,
        {
        method: "POST",
        body: formData,
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          const reader = res.body.getReader();
          const decoder = new TextDecoder();

          const read = () => {
            reader.read().then(({ done, value }) => {
              if (done) {
                this.uploading = false;
                // console.log("Stream completed, total results:", this.results.length);
                return;
              }
              const chunk = decoder.decode(value, { stream: true });
              // console.log("Received chunk:", chunk);
              const lines = chunk.split("\n").filter(Boolean);

              lines.forEach((line) => {
                if (line.startsWith("data:")) {
                  try {
                    const obj = JSON.parse(line.replace("data: ", ""));
                    if (obj.uploadedSku || obj.error) { // Individual result
                      this.results.push(obj); // Add each update instantly
                      this.$nextTick(() => {
                        // Ensure DOM updates after state change
                      });
                    }
                    if (obj.progressPercent !== undefined) {
                      this.progressPercent = obj.progressPercent; // Real-time progress
                    }
                    if (obj.error && !obj.uploadedSku) { // Global error
                      this.results.push({ error: obj.error });
                    }
                    if (obj.done) {
                      this.uploading = false;
                    }
                  } catch (parseErr) {
                    // console.error("Error parsing SSE data:", parseErr, line);
                    this.error = `Parsing error: ${parseErr.message}`;
                  }
                }
              });

              read(); // Continue reading the stream
            }).catch((err) => {
              // console.error("Error reading stream:", err);
              this.uploading = false;
              this.error = `Stream read failed: ${err.message}`;
              this.results.push({ error: `Stream read failed: ${err.message}` });
            });
          };

          read();
        })
        .catch((err) => {
          // console.error("SSE upload failed:", err);
          this.uploading = false;
          this.error = `Upload failed: ${err.message}`;
          this.results.push({ error: `Upload failed: ${err.message}` });
        });
    },
  },
};
</script>

<style scoped>
.meesho-heading {
  height: fit-content;
  width: fit-content;
  margin: 20px 0 20px 100px;
}

.meesho-text {
  font-size: 2.125rem !important;
  font-weight: 400;
  line-height: 1.175;
  letter-spacing: 0.0073529412em !important;
  font-family: "Roboto", sans-serif;
  text-transform: none !important;
}

.upload-page {
  max-width: 1200px;
  justify-content: center;
  align-items: center;
  margin: 20px auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

input {
  border: 1px solid;
  border-radius: 5px;
  width: 85%;
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

.results-container {
  margin-top: 10px;
}

table {
  width: 100%;
  text-indent: 10px;
  text-align: left;
}

thead {
  background: #ededed;
  width: 100%;
  height: 30px;
}

table, td, tr {
  border: 1px solid #d3cbcb;
}

.error-message {
  color: red;
  margin-top: 10px;
  font-weight: bold;
}
</style>