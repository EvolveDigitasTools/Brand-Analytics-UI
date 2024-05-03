import { createRouter, createWebHistory } from 'vue-router'
// import DashboardComponent from '../views/DashboardComponent.vue'
import LandingPage from '@/views/LandingPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: LandingPage },
    // {
    //   path: '/dashboard',
    //   component: DashboardComponent
    // },
  ]
})

export default router
