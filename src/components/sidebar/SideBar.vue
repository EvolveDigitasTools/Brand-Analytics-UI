<template>
    <v-navigation-drawer expand-on-hover rail>
        <v-list>
            <v-list-item prepend-avatar="/pluugin-site-icon.png" subtitle="Global Pluugin" title="Brand Analytics" />
        </v-list>
        <v-divider></v-divider>
        <v-list density="compact" nav>
            <v-list-item v-for="(item, index) in menuItems" :key="index" link :to="item.route">
                <template #prepend>
                    <v-icon v-if="item.icon">{{ item.icon }}</v-icon>
                    <!-- <v-avatar v-else-if="item.avatar" size="24" class="mr-4">
                        <v-img :src="item.avatar" />
                    </v-avatar> -->
                </template>
                <v-list-item-title>{{ item.title }}</v-list-item-title>
            </v-list-item>
        </v-list>
    </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const menuItems = ref([
    { title: 'Overview', route: '/dashboard/overview', icon: 'mdi-view-dashboard' },
    { title: 'Inventory', route: '/dashboard/inventory', icon: 'mdi-package' },
    // { title: 'Meesho Inventory', route: '/dashboard/meesho-inventory', avatar: '/assets/logo/meesho_logo.png' },
    // { title: 'Marketplace Orders', route: '/dashboard/marketplace-orders', icon: 'mdi-shopping' },
    { title: 'Update Orders', route: '/dashboard/update-orders', icon: 'mdi-package-up' },
    { title: 'SKU Mapping', route: '/dashboard/sku-mapping', icon: 'mdi-package-variant' },
])
</script>