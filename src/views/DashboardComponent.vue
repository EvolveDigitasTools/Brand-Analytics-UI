<template>
  <div class="inventory-overview">
    <div v-if="loading" class="loading">Loading inventory data...</div>
    <div v-if="error" class="error">Error loading inventory data!</div>

    <div v-if="data" class="chart-container">
      <div class="chart-wrapper">
        <div class="chart-main">
          <canvas ref="chartCanvas"></canvas>
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
  </div>
</template>

<script>
import { Chart, registerables } from 'chart.js'
import axios from 'axios'

Chart.register(...registerables)

export default {
  name: 'InventoryOverview',
  data() {
    return {
      loading: false,
      error: false,
      data: null,
      chart: null,
      colors: []
    }
  },
  computed: {
    filteredVendors() {
      return this.data?.vendorInventory.filter(v => v.inventoryCount > 0) || []
    }
  },
  mounted() {
    this.fetchData()
  },
  methods: {
    async fetchData() {
      this.loading = true
      this.error = false
      try {
        const response = await axios.get('http://localhost:8080/api/inventory/overview')
        this.data = response.data
        this.colors = this.generateColors(this.filteredVendors.length)
        this.$nextTick(() => {
          this.renderChart()
        })
      } catch (error) {
        console.error('Error fetching inventory overview:', error)
        this.error = true
      } finally {
        this.loading = false
      }
    },

    renderChart() {
      if (this.chart) {
        this.chart.destroy()
      }

      const ctx = this.$refs.chartCanvas.getContext('2d')
      
      this.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: this.filteredVendors.map(v => v.vendorName),
          datasets: [{
            data: this.filteredVendors.map(v => v.inventoryCount),
            backgroundColor: this.colors,
            borderWidth: 2,
            hoverBorderWidth: 3,
            hoverOffset: 10
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '75%',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => {
                  return `${context.label}: ${context.parsed} items`
                }
              }
            }
          },
          onClick: (event, elements) => {
            if (elements.length > 0) {
              const vendorCode = this.filteredVendors[elements[0].index].vendorCode
              this.navigateToVendor(vendorCode)
            }
          }
        },
        plugins: [{
          id: 'centerText',
          beforeDraw: (chart) => {
            if (!this.data) return
            const { ctx, chartArea } = chart
            ctx.save()
            
            // Draw total in center
            const x = (chartArea.left + chartArea.right) / 2
            const y = (chartArea.top + chartArea.bottom) / 2
            
            ctx.font = 'bold 24px Arial'
            ctx.fillStyle = '#333'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(this.data.totalInventory, x, y)

            ctx.font = '14px Arial'
            ctx.fillText('Total Items', x, y + 30)
            ctx.restore()
          }
        }]
      })
    },

    generateColors(count) {
      const colors = []
      const hueStep = 360 / count
      for (let i = 0; i < count; i++) {
        colors.push(`hsl(${hueStep * i}, 70%, 50%)`)
      }
      return colors
    },

    navigateToVendor(vendorCode) {
      this.$router.push(`/dashboard/inventory/${vendorCode}`)
    }
  }
}
</script>

<style scoped>
.inventory-overview {
  max-width: 1200px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.chart-wrapper {
  display: flex;
  gap: 2rem;
}

.chart-main {
  flex: 1;
  position: relative;
  height: 400px;
}

.chart-legend {
  width: 300px;
  padding: 1rem;
  border-left: 1px solid #eee;
}

.total-box {
  text-align: center;
  padding: 1rem;
  margin-bottom: 2rem;
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
</style>