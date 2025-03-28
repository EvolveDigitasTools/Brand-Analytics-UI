<template>
    <LandingNavbar />
    <v-app>
        <Sidebar />
        <v-main>
            <router-view />
        </v-main>
    </v-app>
</template>

<script setup lang="ts">
import LandingNavbar from '@/components/landingNavbar/LandingNavbar.vue';
import Sidebar from '@/components/sidebar/SideBar.vue';
</script>