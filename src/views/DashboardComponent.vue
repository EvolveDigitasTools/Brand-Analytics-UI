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
            <h3>Total Units Sales (Last 15 Days)</h3>
            <div class="total-amount">📦{{ salesData.totalUnits }}</div>
          </div>
          <div class="trends-controls">
            <select v-model="timeFilter">
              <option value="today">Today ({{ salesData.todayUnits }})</option>
            </select>
            <button class="export-btn">Export</button>
          </div>
        </div>

        <div class="chart-wrapper">
          <canvas :key="'bar-' + salesData.brands.length" ref="barChartCanvas" width="600" height="300"></canvas>
        </div>
      </div>

      <!-- NEW: Recent Activity – Top 10 Selling Products -->
      <div class="top-selling">
        <div class="top-selling-header">
          <h3>Top 10 Selling Products</h3>
          <button class="add-new-btn">+ Add New</button>
        </div>

        <div class="top-selling-list">
          <div v-for="(item, i) in topSelling" :key="i" class="selling-item">
            <div class="selling-sku-date">
              <div class="sku">#{{ item.skuCode }}</div>
              <div class="date">{{ formatDate(item.date) }}</div>
            </div>
            <div class="selling-name">{{ item.productName }}</div>
            <div class="selling-qty" :class="{ positive: item.soldQty > 0, negative: item.soldQty < 0 }">
              {{ item.soldQty > 0 ? '+' : '' }}{{ item.soldQty }}
            </div>
          </div>
        </div>

        <div class="view-all">
          <a href="#" @click.prevent="viewAllActivity">View All</a>
        </div>
      </div>

      <!-- Donut Chart -->
      <div class="chart-container">
        <div class="chart-main">
          <canvas :key="'donut-' + overview.length" ref="donutCanvas" width="300" height="300"></canvas>
        </div>
        <div class="chart-legend">
          <div v-for="(item, i) in donutData" :key="i" class="legend-item">
            <div class="color-block" :style="{ backgroundColor: donutColors[i] }"></div>
            <div class="legend-label">{{ item.label }} ({{ item.value }})</div>
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
          <tr v-for="(v, i) in filteredOverview" :key="i" @click="filterByBrand(v.brandName)" class="clickable-row">
            <td>{{ v.brandName }}</td>
            <td>{{ v.totalInventory || 0 }}</td>
            <td>{{ v.slowMoving }}</td>
            <td>{{ v.expirySoon }}</td>
            <td>{{ v.avgShelfLifeDays ?? '-' }}</td>
            <td>{{ v.salesLast6Months }}</td>
          </tr>
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
      overview: [],
      salesData: { brands: [], totalUnits: 0, todayUnits: 0 },
      topSelling: [],
      timeFilter: "today",
      donutChart: null,
      barChart: null,
      donutColors: ["#28a745", "#ffc107", "#dc3545"],
      activeBrand: null,
      activeSection: null,
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
        { label: "Total Inventory", value: this.totalSummary.totalInventory, class: "total", filter: null },
        { label: "Slow Moving", value: this.totalSummary.slowMoving, class: "slow", filter: "slowMoving" },
        { label: "Expiry Soon", value: this.totalSummary.expirySoon, class: "expiry", filter: "expirySoon" },
        { label: "Avg Shelf Life", value: `${this.totalSummary.avgShelfLifeDays} days`, class: "shelf", filter: null },
        { label: "Sales (6M)", value: this.totalSummary.salesLast6Months, class: "sales", filter: "salesLast6Months" },
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
  },

  mounted() {
    this.loadAllData();
  },

  updated() {
    this.$nextTick(() => {
      this.renderDonut();
      this.renderBarChart();
    });
  },

  methods: {
    async loadAllData() {
      this.loading = true;
      try {
        const [overviewRes, salesRes, sellingRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_NODE}/api/overview-inventory`),
          axios.get(`${import.meta.env.VITE_BACKEND_NODE}/api/sales-last-15-days-by-brand`),
          axios.get(`${import.meta.env.VITE_BACKEND_NODE}/api/top-selling`)
        ]);

        if (overviewRes.data.success) this.overview = overviewRes.data.data;
        if (salesRes.data.success) this.salesData = salesRes.data.data;
        if (sellingRes.data.sucess) this.topSelling = sellingRes.data.data.slice(0, 10);

      } catch (err) {
        console.error("Load failed:", err);
        this.error = true;
      } finally {
        this.loading = false;
      }
    },

    formatDate(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB');
    },

    viewAllSelling() {
      alert("View All Top Selling Products clicked!");
      
    },

    renderDonut() {
      if (this.donutChart) this.donutChart.destroy();
      const canvas = this.$refs.donutCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      this.donutChart = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: this.donutData.map(i => i.label),
          datasets: [{ data: this.donutData.map(i => i.value), backgroundColor: this.donutColors }],
        },
        options: { responsive: true, cutout: "70%", plugins: { legend: { display: false } } },
      });
    },

    renderBarChart() {
      if (this.barChart) this.barChart.destroy();
      const canvas = this.$refs.barChartCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const brands = this.salesData.brands || [];
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (brands.length === 0) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#999";
        ctx.textAlign = "center";
        ctx.fillText("No sales data", canvas.width / 2, canvas.height / 2);
        return;
      }

      const labels = brands.map(b => b.brandName);
      const data = brands.map(b => b.totalUnits);

      this.barChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            { label: "Sold", data, backgroundColor: "#1E90FF", stack: "stack0" },
            { label: "Remaining", data: data.map(d => 100 - d), backgroundColor: "#E3F2FD", stack: "stack0" },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { stacked: true },
            y: { stacked: true, min: 0, max: 10000, ticks: { stepSize: 10 } },
          },
        },
      });
    },

    filterByBrand(brand) { this.activeBrand = brand; },
    filterBySection(section) { this.activeSection = section; },
    resetFilters() { this.activeBrand = null; this.activeSection = null; },
  },
};
</script>

<style scoped>
.inventory-overview { padding: 1.5rem; }
.overview-cards { display: flex; flex-wrap: wrap; gap: 1rem; margin: 1.5rem 0; }
.card { flex: 1; min-width: 180px; background: #f8f9fa; border-radius: 10px; padding: 1rem; text-align: center; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.1); transition: 0.2s; }
.card:hover { transform: translateY(-3px); }

.chart-container { display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; margin: 1.5rem 0; }
.chart-main { width: 300px; height: 300px; }

.overview-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
.overview-table th, .overview-table td { padding: 0.75rem; border: 1px solid #ddd; text-align: center; font-size: 14px; }
.clickable-row:hover { background: #f3f8ff; cursor: pointer; }

.sales-trends { margin: 2rem 0; padding: 1.5rem; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.trends-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.trends-header h3 { margin: 0; font-size: 1.1rem; color: #555; }
.total-amount { font-size: 2rem; font-weight: bold; color: #333; margin-top: 0.5rem; }
.trends-controls { display: flex; gap: 0.5rem; align-items: center; }
.trends-controls select { padding: 0.4rem 0.8rem; border: 1px solid #ddd; border-radius: 6px; }
.export-btn { background: #f8f9fa; border: 1px solid #ddd; padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; }

.chart-wrapper {
  height: 300px;
  width: 100%;
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
</style>