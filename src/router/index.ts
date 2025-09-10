import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/views/LandingPage.vue'
// import LoginComponent from '@/views/LoginComponent.vue'
import DashboardLayout from '@/layout/DashboardLayout.vue'
import InventoryComponent from '@/views/InventoryComponent.vue'
import AllInventory from '@/views/AllInventory.vue' //All Inventory - H
import OrderUpdateComponent from '@/views/OrderUpdateComponent.vue'
import DashboardComponent from '@/views/DashboardComponent.vue'
import SKUMappingComponent from '@/views/SKUMappingComponent.vue'
import DailyOrderUpdateComponent from '@/views/DailyOrderUpdateComponent.vue'
import Meesho from '@/views/Meesho.vue'
import Amazon from '@/views/Amazon.vue'
import Flipkart from '@/views/Flipkart.vue'
import ComboSKUComponent from '@/views/ComboSKUComponent.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: LandingPage },
    // { path: '/login', component: LoginComponent },
    {
      path: '/dashboard',
      component: DashboardLayout,
      children: [
        { path: '', redirect: '/dashboard/overview' },
        { path: 'overview', component: DashboardComponent },
        { path: 'inventory/:vendorCode?', component: InventoryComponent },
        { path: 'all-inventory', name: 'AllInventory', component: AllInventory }, // Added - H      
        { path: 'update-orders', component: OrderUpdateComponent},
        { path: 'update-daily-orders', component: DailyOrderUpdateComponent}, // Added - H
        { path: 'sku-mapping', component: SKUMappingComponent },
        { path: 'meesho', name: 'Meesho', component: Meesho }, // Added - H
        { path: 'amazon', name: 'Amazon', component: Amazon }, // Added - H
        { path: 'flipkart', name: 'Flipkart', component: Flipkart }, // Added - H
        { path: 'combo-sku', name: 'SKU Mapping', component: ComboSKUComponent }, // Added - H
      ]
    }
  ]
})

export default router
