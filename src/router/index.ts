import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '@/views/LandingPage.vue'
import LoginComponent from '@/views/LoginComponent.vue'
import DashboardLayout from '@/layout/DashboardLayout.vue'
import InventoryComponent from '@/views/InventoryComponent.vue'
import MeeshoInventoryComponent from '@/views/MeeshoInventoryComponent.vue'
import InventoryUpdateComponent from '@/views/InventoryUpdateComponent.vue'
import DashboardComponent from '@/views/DashboardComponent.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: LandingPage },
    { path: '/login', component: LoginComponent },
    {
      path: '/dashboard',
      component: DashboardLayout,
      children: [
        { path: '', redirect: '/dashboard/overview' },
        { path: 'overview', component: DashboardComponent },
        { path: 'inventory/:vendorCode?', component: InventoryComponent },
        { path: 'meesho-inventory', component: MeeshoInventoryComponent },
        { path: 'update-inventory', component: InventoryUpdateComponent}
      ]
    }
  ]
})

export default router
