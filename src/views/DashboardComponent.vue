<template>
  <div class="inventory-overview">
    <!-- Loading / Error -->
    <div v-if="loading" class="loading">Loading data...</div>
    <div v-else-if="error" class="error">Error loading data!</div>

    <div v-else class="overview-container">
      <!-- Summary Cards -->
      <div class="overview-cards">
        <div v-for="card in cards" :key="card.label" class="card" :class="card.class" @click="filterBySection(card.filter)">
          <h3>{{ card.label }}</h3>
          <p>{{ card.value }}</p>
        </div>
      </div>

      <!-- Sales Last 15 Days by Brand Chart -->
      <div class="sales-trends">
        <div class="trends-header">
          <div>
            <h3>{{
              salesChartMode === 'slowMoving' ? 'Slow Moving SKUs by Brand' :
              salesChartMode === 'expirySoon' ? 'Expiry Soon SKUs by Brand' :
              'Total Units Sales (Last 15 Days)'
            }}</h3>
            <div class="total-amount">
              {{ 
                salesChartMode === 'slowMoving' ? totalSummary.slowMoving :
                salesChartMode === 'expirySoon' ? totalSummary.expirySoon :
                salesData.totalUnits 
              }}
            </div>
          </div>
        </div>

        <div class="chart-wrapper">
          <canvas :key="'bar-' + salesData.brands.length" ref="barChartCanvas" width="600" height="300"></canvas>
        </div>
      </div>

      <!-- Top 10 Selling Products (Last 30 Days) -->
      <div class="top-selling">
        <div class="top-selling-header">
          <h3><strong>Top 10 Selling Products (Last 30 Days)</strong></h3>
        </div>

        <div class="top-selling-list">
          <div v-for="(item, i) in visibleTopSelling" :key="i" class="selling-item">
            <div class="selling-sku-date">
              <div class="sku">{{ item.skuCode }}</div>
              <div class="date">{{ formatDate(item.date) }}</div>
            </div>
            <div class="selling-name">{{ item.productName }}</div>
            <div class="selling-qty" 
                :class="{ positive: item.soldQty > 0, negative: item.soldQty < 0 }"
              >
                <span v-if="item.soldQty > 0" class="mdi mdi-finance"></span>
                {{ item.soldQty }}
            </div>
          </div>
        </div>

        <div class="view-all" v-if="topSelling.length > 5">
          <a href="#" @click.prevent="showAllTopSelling = !showAllTopSelling">
            {{ showAllTopSelling ? 'View Less' : 'View All' }}
          </a>
        </div>
      </div>

      <!-- Donut Chart -->
      <div v-if="data" ref="donutSection" class="chart-container">
        <div class="chart-wrapper">
          <div class="chart-main">
            <canvas ref="donutCanvas"></canvas>
          </div>
          <div class="chart-legend">
            <div class="total-box">
              <h3>Total Inventory</h3>
              <div class="total-value">{{ data.totalInventory }}</div>
              <router-link 
                to="/dashboard/inventory"
                class="view-all-link"
              >
                View All Inventory
              </router-link>
            </div>

            <div class="vendor-list">
              <div 
                v-for="(vendor, index) in filteredVendors"
                :key="vendor.vendorCode"
                class="vendor-item"
                @click="navigateToVendor(vendor.vendorCode)"
              >
                <div 
                  class="color-block"
                  :style="{ backgroundColor: colors[index] }"
                ></div>
                <div class="vendor-details">
                  <div class="vendor-name">{{ vendor.vendorName }}</div>
                  <div class="vendor-count">{{ vendor.inventoryCount }} items</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Brand Table -->
      <table class="overview-table">
        <thead>
          <tr>
            <th>Brand Name</th>
            <th>Total SKUs</th>
            <th>Slow Moving</th>
            <th>Expiry Soon</th>
            <th>Avg Shelf Life (Days)</th>
            <th>Sales (Last 6 Months)</th>
          </tr>
        </thead>

        <tbody>
          <template v-for="(v, i) in filteredOverview" :key="i">
            <tr
              @click="toggleBrandDetails(v.brandName)"
              class="clickable-row"
            >
              <td>{{ v.brandName }}</td>
              <td>{{ v.totalSkus }}</td>
              <td>{{ v.slowMoving }}</td>
              <td>{{ v.expirySoon }}</td>
              <td>{{ v.avgShelfLifeDays ?? '-' }}</td>
              <td>{{ v.salesLast6Months }}</td>
            </tr>

            <tr v-if="expandedBrand === v.brandName" class="sku-details-row">
              <td colspan="6">
                <div v-if="loadingSkus">Loading SKUs...</div>
                <div v-else>
                  <table class="sku-table">
                    <thead>
                      <tr>
                        <th>SKU Code</th>
                        <th>SKU Name</th>
                        <th>Quantity</th>
                        <th>Expiry Date</th>
                        <th>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="sku in brandSkus" :key="sku.id">
                        <td>{{ sku.skuCode }}</td>
                        <td>{{ sku.skuName }}</td>
                        <td>{{ sku.totalQuantity || 0 }}</td>
                        <td>{{ formatDate(sku.earliestExpiry) || '-' }}</td>
                        <td>{{ formatDate(sku.lastUpdated) || '-' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>

          </template>
        </tbody>
      </table>


      <div v-if="activeBrand || activeSection" class="filter-info">
        <strong>Filter:</strong>
        <span v-if="activeBrand">Brand = {{ activeBrand }}</span>
        <span v-if="activeSection"> | Section = {{ activeSection }}</span>
        <button @click="resetFilters">Reset</button>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

export default {
  name: "InventoryOverview",
  data() {
    return {
      loading: true,
      error: false,
      data: null,
      chart: null,
      colors: [],
      overview: [],
      salesData: { brands: [], totalUnits: 0, todayUnits: 0 },
      topSelling: [],
      showAllTopSelling: false,
      timeFilter: "today",
      donutChart: null,
      barChart: null,
      donutColors: ["#28a745", "#ffc107", "#dc3545"],
      activeBrand: null,
      activeSection: null,
      salesChartMode: 'default',
      expandedBrand: null,
      brandSkus: [],
      loadingSkus: false,
    };
  },

  computed: {
    totalSummary() {
      if (!this.overview.length) return {};
      const sum = this.overview.reduce((a, v) => ({
        totalInventory: a.totalInventory + (v.totalInventory || 0),
        slowMoving: a.slowMoving + (v.slowMoving || 0),
        expirySoon: a.expirySoon + (v.expirySoon || 0),
        avgShelfLifeDays: a.avgShelfLifeDays + (v.avgShelfLifeDays || 0),
        salesLast6Months: a.salesLast6Months + (v.salesLast6Months || 0),
      }), { totalInventory: 0, slowMoving: 0, expirySoon: 0, avgShelfLifeDays: 0, salesLast6Months: 0 });
      const n = this.overview.length;
      return { ...sum, avgShelfLifeDays: Math.round(sum.avgShelfLifeDays / n) };
    },
    cards() {
      return [
        { label: "Total Inventory", value: this.totalSummary.totalInventory, class: "total", filter: 'totalInventory' },
        { label: "Slow Moving", value: this.totalSummary.slowMoving, class: "slow", filter: "slowMoving" },
        { label: "Expiry Soon", value: this.totalSummary.expirySoon, class: "expiry", filter: "expirySoon" },
        { label: "Avg Shelf Life", value: `${this.totalSummary.avgShelfLifeDays} days`, class: "shelf", filter: null },
        { label: "Sales Last 6 Months", value: this.totalSummary.salesLast6Months, class: "sales", filter: "salesLast6Months" },
        { label: "Total RTOs", value: this.totalSummary.salesLast6Months, class: "sales", filter: "totalRTOs" },        
      ];
    },
    donutData() {
      const inv = this.totalSummary.totalInventory;
      const slow = this.totalSummary.slowMoving;
      const exp = this.totalSummary.expirySoon;
      return [
        { label: "Healthy Stock", value: Math.max(inv - slow - exp, 0) },
        { label: "Expiry Soon", value: exp },
        { label: "Slow Moving", value: slow },
      ];
    },
    filteredOverview() {
      let data = this.overview;
      if (this.activeBrand) data = data.filter(v => v.brandName === this.activeBrand);
      if (this.activeSection === "slowMoving") data = data.filter(v => v.slowMoving > 0);
      if (this.activeSection === "expirySoon") data = data.filter(v => v.expirySoon > 0);
      return data;
    },
    visibleTopSelling() {
      return this.showAllTopSelling 
        ? this.topSelling 
        : this.topSelling.slice(0, 5);
    },
    filteredVendors() {
      const vendors = this.data?.vendorInventory || [];
      return vendors.filter(v => v && v.inventoryCount > 0);
    },
  },
  mounted() {
    this.loadAllData();
  },
  updated() {
    this.$nextTick(() => {
      if (this.data) this.renderDonut();
      this.renderBarChart();
    });
  },

  methods: {
    async loadAllData() {
      this.loading = true;
      try {
        const [overviewRes, salesRes, sellingRes, vendorRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_NODE}/api/overview-inventory`),
          axios.get(`${import.meta.env.VITE_BACKEND_NODE}/api/sales-last-15-days-by-brand`),
          axios.get(`${import.meta.env.VITE_BACKEND_NODE}/api/top-selling`),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/inventory/overview`)
        ]);

        if (overviewRes.data.success) this.overview = overviewRes.data.data;
        if (salesRes.data.success) this.salesData = salesRes.data.data;
        if (sellingRes.data.success) this.topSelling = sellingRes.data.data.slice(0, 10);
        if (vendorRes.data) {
            this.data = vendorRes.data; 
            const validVendors = (this.data.vendorInventory || []).filter(v => v && v.inventoryCount > 0);
            this.colors = this.generateColors(validVendors.length);
          }
      } catch (err) {
        console.error("Load failed:", err);
        this.error = true;
      } finally {
        this.loading = false;
      }
    },
    async toggleBrandDetails(brandName) {
      if (this.expandedBrand === brandName) {
        this.expandedBrand = null;
        this.brandSkus = [];
        return;
      }

      this.expandedBrand = brandName;
      this.loadingSkus = true;

      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_NODE}/api/brand-skus`, {
          params: { brandName },
        });
        if (res.data.success) {
          this.brandSkus = res.data.data;
        } else {
          this.brandSkus = [];
        }
      } catch (err) {
        console.error('Error fetching SKUs:', err);
        this.brandSkus = [];
      } finally {
        this.loadingSkus = false;
      }
    },

    formatDate(dateStr) {
      if (!dateStr || dateStr === '0000-00-00' || dateStr === 'Invalid Date') return '-';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    },


    viewAllSelling() {
      alert("View All Top Selling Products clicked!");
      
    },

    renderDonut() {
    if (this.donutChart) this.donutChart.destroy();
    const canvas = this.$refs.donutCanvas;
    if (!canvas || !this.data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const vendors = (this.data.vendorInventory || []).filter(v => v && v.inventoryCount > 0);
    if (vendors.length === 0) {
      ctx.font = "16px Arial";
      ctx.fillStyle = "#999";
      ctx.textAlign = "center";
      ctx.fillText("No vendor data", canvas.width / 2, canvas.height / 2);
      return;
    }

    const labels = this.filteredVendors.map(v => v.vendorName);
    const data = this.filteredVendors.map(v => v.inventoryCount);

    if (this.colors.length !== vendors.length) {
      this.colors = this.generateColors(vendors.length);
    }

    this.donutChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: this.colors,
          borderWidth: 2,
          hoverBorderWidth: 3,
          hoverOffset: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "75%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${context.parsed} items`,
            },
          },
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const vendorCode = this.filteredVendors[elements[0].index].vendorCode;
            this.navigateToVendor(vendorCode);
          }
        },
      },
      plugins: [{
        id: "centerText",
        beforeDraw: (chart) => {
          const { ctx, chartArea } = chart;
          ctx.save();
          const x = (chartArea.left + chartArea.right) / 2;
          const y = (chartArea.top + chartArea.bottom) / 2;

          ctx.font = "bold 24px Arial";
          ctx.fillStyle = "#333";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(this.data.totalInventory, x, y);

          ctx.font = "14px Arial";
          ctx.fillText("Total Items", x, y + 30);
          ctx.restore();
        },
      }],
    });
  },

    renderBarChart() {
      if (this.barChart) this.barChart.destroy();
      const canvas = this.$refs.barChartCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let labels = [];
      let data = [];
      let titleText = "Total Units Sales (Last 15 Days)";
      let yAxisLabel = "Units Sold";

      if (this.salesChartMode === 'slowMoving') {
        labels = this.overview.map(v => v.brandName);
        data = this.overview.map(v => v.slowMoving || 0);
        titleText = "Slow Moving SKUs by Brand";
        yAxisLabel = "Slow Moving Count";
      } else if (this.salesChartMode === 'expirySoon') {
        labels = this.overview.map(v => v.brandName);
        data = this.overview.map(v => v.expirySoon || 0);
        titleText = "Expiry Soon SKUs by Brand";
        yAxisLabel = "Expiry Soon Count";
      } else {
        // Default: Sales last 15 days
        const brands = this.salesData.brands || [];
        if (brands.length === 0) {
          ctx.font = "16px Arial";
          ctx.fillStyle = "#999";
          ctx.textAlign = "center";
          ctx.fillText("No sales data", canvas.width / 2, canvas.height / 2);
          return;
        }
        labels = brands.map(b => b.brandName);
        data = brands.map(b => b.totalUnits);
      }

      // Clear and draw title
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = "bold 14px Arial";
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.fillText(titleText, canvas.width / 2, 20);

      this.barChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [{
            label: yAxisLabel,
            data,
            backgroundColor: this.salesChartMode === 'default' ? "#1E90FF" : 
                            this.salesChartMode === 'slowMoving' ? "#ffc107" : "#dc3545",
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: false },
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1 }
            }
          }
        },
      });
    },

    filterByBrand(brand) { this.activeBrand = brand; },
    filterBySection(section) {
      if (section === 'totalInventory') {
        this.$nextTick(() => {
          const el = this.$refs.donutSection;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
        return;
      }
        if (section === 'slowMoving' || section === 'expirySoon') {
          if (this.salesChartMode === section) {
            this.salesChartMode = 'default';
            this.activeSection = null;
          } else {
            this.salesChartMode = section;
            this.activeSection = section;
          }
      } else {
        this.activeSection = section;
      }
        this.$nextTick(() => {
          this.renderBarChart();
        });
    },
    resetFilters() { this.activeBrand = null; this.activeSection = null; },

    generateColors(count) {
    const colors = [];
    const hueStep = count > 0 ? 360 / count : 0;
    for (let i = 0; i < count; i++) {
      colors.push(`hsl(${hueStep * i}, 70%, 50%)`);
    }
      return colors;
    },

    navigateToVendor(vendorCode) {
      this.$router.push(`/dashboard/inventory/${vendorCode}`);
    },
  },
}
</script>

<style scoped>
.inventory-overview { 
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); 
}
.overview-cards { 
  display: flex; 
  flex-wrap: wrap; 
  gap: 1rem; 
  margin: 1.5rem 0; 
}
.card { 
  flex: 1; 
  min-width: 180px; 
  background: #f8f9fa; 
  border-radius: 10px; 
  padding: 1rem; 
  text-align: center; 
  cursor: pointer; 
  box-shadow: 0 1px 4px rgba(0,0,0,0.1); 
  transition: 0.2s; 
}
.card:hover { 
  transform: translateY(-3px); 
}
.card.active {
  background: #e3f2fd;
  border: 2px solid #1e90ff;
  font-weight: bold;
}
.chart-container { 
  display: flex; 
  justify-content: space-around; 
  align-items: center; 
  flex-wrap: wrap; 
  margin: 1.5rem 0; 
}
.chart-main { 
  width: 300px; 
  height: 300px; 
}
.chart-legend {
  width: 300px;
  padding: 1rem;
  border-left: 1px solid #eee;
}
.overview-table { 
  width: 100%; 
  border-collapse: collapse; 
  margin-top: 1rem; 
}
.overview-table th, .overview-table td { 
  padding: 0.75rem; 
  border: 1px solid #ddd; 
  text-align: center; 
  font-size: 14px; 
}
.clickable-row:hover { 
  background: #f3f8ff; 
  cursor: pointer; 
}
.sales-trends { 
  margin: 2rem 0; 
  padding: 1.5rem; 
  background: #fff; 
  border-radius: 12px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.05); 
}
.trends-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  margin-bottom: 1rem; 
}
.trends-header h3 { 
  margin: 0; 
  font-size: 1.1rem; 
  color: #555; 
}
.total-amount { 
  font-size: 2rem; 
  font-weight: bold; 
  color: #333; 
  margin-top: 0.5rem; 
}
.trends-controls { 
  display: flex; 
  gap: 0.5rem; 
  align-items: center; 
}
.trends-controls select { 
  padding: 0.4rem 0.8rem; 
  border: 1px solid #ddd; 
  border-radius: 6px; 
}
.export-btn { 
  background: #f8f9fa; 
  border: 1px solid #ddd; 
  padding: 0.4rem 1rem; 
  border-radius: 6px; 
  cursor: pointer; 
  font-size: 0.9rem; 
}
.chart-wrapper {
  display: flex;
  gap: 2rem;
  position: relative;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}

.top-selling {
  margin: 2rem 0;
  padding: 1.5rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.top-selling-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.top-selling-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.add-new-btn {
  background: #f8f9fa;
  border: 1px solid #ddd;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  cursor: pointer;
}

.top-selling-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.selling-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #eee;
}

.selling-sku-date {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  color: #666;
}

.sku {
  font-weight: 600;
  color: #1a73e8;
}

.date {
  font-size: 0.8rem;
}

.selling-name {
  flex: 1;
  margin-left: 1rem;
  font-weight: 500;
}

.selling-qty {
  font-weight: bold;
  font-size: 1rem;
}

.positive { color: #28a745; }
.negative { color: #dc3545; }

.view-all {
  text-align: center;
  margin-top: 1rem;
}

.view-all a {
  color: #1a73e8;
  text-decoration: none;
  font-weight: 500;
}

.view-all a:hover {
  text-decoration: underline;
}

.total-value {
  font-size: 2.5rem;
  font-weight: bold;
  color: #2c3e50;
  margin: 1rem 0;
}

.view-all-link {
  display: inline-block;
  color: #3498db;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 1px solid #3498db;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.view-all-link:hover {
  background-color: #3498db;
  color: white;
}

.vendor-list {
  max-height: 300px;
  overflow-y: auto;
}

.vendor-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  margin: 0.5rem 0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.vendor-item:hover {
  background-color: #f8f9fa;
  transform: translateX(5px);
}

.color-block {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  margin-right: 1rem;
}

.vendor-details {
  flex: 1;
}

.vendor-name {
  font-weight: 500;
  color: #2c3e50;
}

.vendor-count {
  font-size: 0.9rem;
  color: #7f8c8d;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  font-size: 1.2rem;
}

.error {
  color: #dc3545;
}

canvas {
  cursor: pointer;
  transition: transform 0.2s;
}

canvas:hover {
  transform: scale(1.02);
}

/* Table Expended Data */
.sku-details-row {
  background: #fafafa;
}
.sku-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
}
.sku-table th,
.sku-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: center;
}
.sku-table th {
  background: #f3f6fb;
  font-weight: bold;
}

</style>