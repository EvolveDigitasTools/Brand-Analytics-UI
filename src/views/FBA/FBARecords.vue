<template>
  <div class="page-container">

    <!-- Header -->
    <div class="top-row">
      <div class="left">
        <h2 class="page-title">Amazon FBA Records</h2>

        <!-- Filters -->
        <div class="filters">
          <input v-model="filters.shipmentId" placeholder="🔍 Search Shipment ID" />
          <input v-model="filters.merchantSku" placeholder="🔍 Merchant SKU" />
          <input v-model="filters.childSku" placeholder="🔍 Child SKU" />

          <select v-model="filters.shipTo">
            <option value="">-- Ship To (All) --</option>
            <option v-for="s in uniqueShipTos" :key="s" :value="s">{{ s }}</option>
          </select>

          <div class="date-row">
            <input type="date" v-model="filters.from" />
            <input type="date" v-model="filters.to" />
          </div>

          <button class="clear" @click="clearFilters">Clear</button>
        </div>
      </div>

      <div class="right">
        <button class="upload-btn" @click="goToSelectMarketplace">+ Upload New FBA Sheet</button>
      </div>
    </div>

    <!-- Shipments Table -->
    <div class="records-container">
      <table class="main-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Shipment ID</th>
            <th>Shipment Name</th>
            <th>Ship To</th>
            <th>Total SKUs</th>
            <th>Total Units</th>
            <th>Created At</th>
            <th>View Details</th>
          </tr>
        </thead>

        <tbody>
          <template v-for="(shipment, idx) in pagedShipments" :key="shipment.shipmentId">

            <!-- MAIN ROW -->
            <tr class="shipment-row">
              <td>{{ (page - 1) * perPage + idx + 1 }}</td>
              <td>{{ shipment.shipmentId }}</td>
              <td>{{ shipment.shipmentName }}</td>
              <td>{{ shipment.shipTo }}</td>
              <td>{{ shipment.totalSkus }}</td>
              <td>{{ shipment.totalUnits }}</td>
              <td>{{ formatDate(shipment.createdAt) }}</td>

              <td>
                <button
                  class="view-btn"
                  @click="toggleOpen(shipment.shipmentId)"
                >
                  {{ opened[shipment.shipmentId] ? "Hide" : "View" }}
                </button>
              </td>
            </tr>

            <!-- DETAIL SECTION -->
            <tr v-if="opened[shipment.shipmentId]">
              <td colspan="8">
                <div class="detail-box">
                  <h4>Shipment Details — {{ shipment.shipmentId }}</h4>

                  <div class="detail-meta">
                    <div><strong>Name:</strong> {{ shipment.shipmentName }}</div>
                    <div><strong>Ship To:</strong> {{ shipment.shipTo }}</div>
                    <div><strong>Total SKUs:</strong> {{ shipment.totalSkus }}</div>
                    <div><strong>Total Units:</strong> {{ shipment.totalUnits }}</div>
                  </div>

                  <div class="detail-table-wrap">
                    <table class="detail-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Merchant SKU</th>
                          <th>Base SKU</th>
                          <th>Child SKU</th>
                          <th>Title</th>
                          <th>ASIN</th>
                          <th>FNSKU</th>
                          <th>Shipped</th>
                          <th>Deducted</th>
                          <th>Before</th>
                          <th>After</th>
                          <th>Created At</th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr v-for="(r, i) in shipment.itemsFiltered" :key="r.id">
                          <td>{{ i + 1 }}</td>
                          <td>{{ r.merchantSku }}</td>
                          <td>{{ r.baseSku }}</td>
                          <td>{{ r.childSkuCode }}</td>
                          <td class="title-cell">{{ r.title }}</td>
                          <td>{{ r.asin }}</td>
                          <td>{{ r.fnsku }}</td>
                          <td>{{ r.shippedQty }}</td>
                          <td>{{ r.totalDeductQty }}</td>
                          <td>{{ r.beforeQty }}</td>
                          <td>{{ r.afterQty }}</td>
                          <td>{{ formatDate(r.createdAt) }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                </div>
              </td>
            </tr>

          </template>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pager">
      <div>
        Show
        <select v-model.number="perPage">
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="20">20</option>
        </select>
        per page
      </div>

      <div class="pages">
        <button @click="prevPage" :disabled="page === 1">Prev</button>
        <span>Page {{ page }} / {{ totalPages }}</span>
        <button @click="nextPage" :disabled="page === totalPages">Next</button>
      </div>
    </div>

    <button class="back-btn" @click="$router.back()">⬅ Back</button>
  </div>
</template>

<script>
export default {
  data() {
    return {
      rawRecords: [],
      shipments: [],
      opened: {},
      filters: {
        shipmentId: "",
        merchantSku: "",
        childSku: "",
        shipTo: "",
        from: "",
        to: ""
      },
      perPage: 10,
      page: 1,
      loading: false,
      error: null
    };
  },

  computed: {
    uniqueShipTos() {
      const set = new Set(this.rawRecords.map(r => r.shipTo).filter(Boolean));
      return [...set];
    },

    filteredShipments() {
      const f = this.filters;

      return this.shipments
        .map(s => {
          // Filter items inside each shipment
          const itemsFiltered = s.items.filter(i => {
            if (f.merchantSku && !i.merchantSku.toLowerCase().includes(f.merchantSku.toLowerCase()))
              return false;
            if (f.childSku && !i.childSkuCode.toLowerCase().includes(f.childSku.toLowerCase()))
              return false;
            return true;
          });

          return { ...s, itemsFiltered };
        })
        .filter(s => {
          // Hide shipments if items get filtered out
          if ((f.merchantSku || f.childSku) && s.itemsFiltered.length === 0) return false;

          if (f.shipmentId && !s.shipmentId.toLowerCase().includes(f.shipmentId.toLowerCase()))
            return false;

          if (f.shipTo && s.shipTo !== f.shipTo) return false;

          if (f.from) {
            if (new Date(s.createdAt) < new Date(f.from)) return false;
          }

          if (f.to) {
            const toDate = new Date(f.to);
            toDate.setHours(23, 59, 59, 999);
            if (new Date(s.createdAt) > toDate) return false;
          }

          return true;
        });
    },

    totalPages() {
      return Math.ceil(this.filteredShipments.length / this.perPage) || 1;
    },

    pagedShipments() {
      const start = (this.page - 1) * this.perPage;
      return this.filteredShipments.slice(start, start + this.perPage);
    }
  },

  created() {
    this.fetchFbaRecords();
  },

  methods: {
    async fetchFbaRecords() {
      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_NODE}/fba-records`);
        const data = await res.json();

        if (data.success) {
          this.rawRecords = data.records;
          this.groupShipments();
        }
      } catch (err) {
        console.error(err);
      }
    },

    groupShipments() {
      const groups = {};

      for (const r of this.rawRecords) {
        if (!groups[r.shipmentId]) {
          groups[r.shipmentId] = {
            shipmentId: r.shipmentId,
            shipmentName: r.shipmentName,
            shipTo: r.shipTo,
            totalSkus: r.totalSkus,
            totalUnits: r.totalUnits,
            createdAt: r.createdAt,
            items: []
          };
        }

        groups[r.shipmentId].items.push(r);
      }

      this.shipments = Object.values(groups).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    },

    toggleOpen(id) {
    this.opened = {
        ...this.opened,
        [id]: !this.opened[id]
    };
    },

    formatDate(dt) {
      if (!dt) return "-";
      return new Date(dt).toLocaleString();
    },

    clearFilters() {
      this.filters = {
        shipmentId: "",
        merchantSku: "",
        childSku: "",
        shipTo: "",
        from: "",
        to: ""
      };
    },

    goToSelectMarketplace() {
      this.$router.push({ name: "Select FBA Marketplace" });
    },

    prevPage() {
      if (this.page > 1) this.page--;
    },

    nextPage() {
      if (this.page < this.totalPages) this.page++;
    }
  }
};
</script>

<style scoped>
.page-container {
  max-width: 1300px;
  margin: auto;
  padding: 25px;
  font-family: Inter;
}

/* Top Row */
.top-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.page-title {
  color: #1f6d5a;
  font-weight: 700;
  margin-bottom: 10px;
}

/* Filters styling */

.filters input,
.filters select {
  padding: 10px 16px;
  border-radius: 25px;
  background: #ffffff;
  border: 1px solid #d9e4e2;
  box-shadow: inset 2px 2px 5px rgba(0,0,0,0.05);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.date-row input {
  width: 150px;
}

.clear {
  background: #ddd;
  padding: 8px 14px;
  border-radius: 8px;
}

/* Upload button */
.upload-btn {
  background: #7ac4b6;
  border: none;
  padding: 10px 18px;
  color: #fff;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
}

/* Main Table */
.records-container {
  background: #f2f5f7;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 6px 6px 18px rgba(0, 0, 0, 0.05);
}

.main-table {
  width: 100%;
  border-collapse: collapse;
}

.main-table th {
  background: #7ac4b6;
  color: #fff;
  padding: 12px;
}

.main-table td {
  padding: 12px;
  background: #ffffff;
  border-bottom: 1px solid #e8ecef;
}

/* View Button */
.view-btn {
  background: #1f6d5a;
  color: white;
  padding: 7px 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Detail Box */
.detail-table-wrap {
  overflow-x: auto !important;
  width: 100% !important;
}

.detail-table-wrap::-webkit-scrollbar {
  height: 8px;
}

.detail-table-wrap::-webkit-scrollbar-thumb {
  background: #7ac4b6;
  border-radius: 10px;
}

.detail-table-wrap::-webkit-scrollbar-track {
  background: #e6e6e6;
}

.detail-box {
  background: white;
  padding: 20px;
  margin-top: 12px;
  border-radius: 10px;
  box-shadow: 5px 5px 15px rgba(0,0,0,0.08);
}

.detail-meta {
  display: flex;
  gap: 30px;
  margin-bottom: 15px;
}

.detail-table td, .detail-table th {
  white-space: normal !important;
  word-break: break-word !important;
  overflow-wrap: break-word !important;
}

/* Detail Table */
.detail-table th {
  background: #7ac4b6;
  color: #fff;
  padding: 10px;
}

.detail-table td {
  padding: 10px;
  background: white;
  border-bottom: 1px solid #eee;
}

.title-cell {
  min-width: 350px;
  max-width: 500px;
  white-space: normal !important;
  word-break: break-word;
}

/* Pagination */
.pager {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.back-btn {
  margin-top: 20px;
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #ccc;
}
</style>
