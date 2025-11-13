<template>
  <div class="meesho-heading"><h4 class="meesho-text">Upload Meesho Inventory Sheet</h4></div>

  <div class="upload-page">
    <input type="file" @change="onFileChange" accept=".xlsx,.xls,.csv" />
    <button @click="uploadFile" :disabled="!file">Upload</button>

    <div v-if="uploading" class="progress-container">
      <div class="progress-bar" :style="{ width: progressPercent + '%' }"></div>
      <span>{{ progressPercent }}%</span>
    </div>

    <!-- ✅ Success message placed OUTSIDE progress container -->
    <div v-if="success && !error" style="color: green; font-weight:bold; margin-top: 15px;">
      ✅ All orders processed successfully!
    </div>

    <div v-if="results.length" class="results-container">
      <h3>Results:</h3>
      <table border="1" cellpadding="6">
        <thead>
          <tr>
            <th>#</th>
            <th>SKU Code</th>
            <!-- <th>Reason</th> -->
            <th>Child/Group SKU</th>
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
            <!-- <td>{{ r.childSku ? r.childSku : (r.type === "normal-with-group" ? "-" : "") }}</td> -->
            <td>
              <span v-if="r.childSku && r.deductedSku">
                {{ r.childSku }} / {{ r.deductedSku }}
              </span>
              <span v-else-if="r.childSku">
                {{ r.childSku }}
              </span>
              <span v-else-if="r.deductedSku">
                {{ r.deductedSku }}
              </span>
              <span v-else>-</span>
            </td>
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
      this.progressPercent = 0;
      this.uploading = true;
      this.error = null;
      this.success = false;

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
                    requestAnimationFrame(() => {
                      this.progressPercent = 100;
                      this.uploading = false;

                      setTimeout(() => {
                        this.success = true;
                      }, 200);
                    });
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

.meesho-heading {
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
  max-width: 1200px;
  margin: 0 auto;
  box-shadow: 10px 10px 20px #d1d9e6, -10px -10px 20px #ffffff;
  transition: all 0.3s ease;
  overflow-y: hidden;
  overflow-x: hidden;
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
  width: 100%;
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
  /* border-radius: 20px;
  padding: 20px; */
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