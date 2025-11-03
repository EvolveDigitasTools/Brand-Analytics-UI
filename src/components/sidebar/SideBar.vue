<template>
  <v-navigation-drawer expand-on-hover rail>
    <v-list>
      <v-list-item
        prepend-avatar="/pluugin-site-icon.png"
        subtitle="Global Pluugin"
        title="Brand Analytics"
      />
    </v-list>

    <v-divider></v-divider>

    <v-list density="compact" nav>
      <template v-for="(item, index) in menuItems" :key="index">
        <!-- Internal route -->
        <v-list-item
          v-if="!item.external"
          :to="item.route"
          link
        >
          <template #prepend>
            <v-icon v-if="item.icon">{{ item.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>

        <!-- External link -->
        <v-list-item
          v-else
          tag="a"
          :href="item.url"
          target="_blank"
          rel="noopener noreferrer"
        >
          <template #prepend>
            <v-icon v-if="item.icon">{{ item.icon }}</v-icon>
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </template>
    </v-list>
  </v-navigation-drawer>
</template>


<script setup lang="ts">
import { ref } from 'vue'

const menuItems = ref([
    { title: 'Overview', route: '/dashboard/overview', icon: 'mdi-view-dashboard' },
    { title: 'Inventory', route: '/dashboard/inventory', icon: 'mdi-package' },
    // { title: 'All Inventory', route: '/dashboard/all-inventory', icon: 'mdi-package' }, //All Inventory - H    
    // { title: 'Meesho Inventory', route: '/dashboard/meesho-inventory', avatar: '/assets/logo/meesho_logo.png' },
    // { title: 'Marketplace Orders', route: '/dashboard/marketplace-orders', icon: 'mdi-shopping' },
    // { title: 'Update Orders', route: '/dashboard/update-orders', icon: 'mdi-package-up' },
    { title: 'Update Orders', route: '/dashboard/update-daily-orders', icon: 'mdi-progress-upload' },
    // { title: 'Update Daily Orders', route: '/dashboard/update-daily-orders', icon: 'mdi-package-up' },//Backup   
    // { title: 'SKU Mapping', route: '/dashboard/sku-mapping', icon: 'mdi-package-variant' },
    { title: 'Combo SKU Mapping', route: '/dashboard/combo-sku', icon: 'mdi-vector-combine' }, // H
    { title: 'Normal SKU Mapping', route: '/dashboard/group-sku', icon: 'mdi-vector-combine' }, // H
    { title: 'RTO', url: 'https://rto.globalplugin.com/', icon: 'mdi-truck-cargo-container', external: true }, // H
    { title: 'GRN', url: 'https://grn.globalplugin.com/', icon: 'mdi-file-chart-check-outline', external: true }, // H        
    { title: 'Sales Overview', route: '/dashboard/sales-overview', icon: 'mdi-finance' }, // H
])
</script>