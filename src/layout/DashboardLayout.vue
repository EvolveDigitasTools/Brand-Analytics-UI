<template>
    <div class="dashboard-layout">
        <LandingNavbar class="navbar" />
        <v-app class="app">
            <Sidebar />
            <v-main>
                <router-view />
            </v-main>
        </v-app>
    </div>
</template>

<script setup lang="ts">
import LandingNavbar from '@/components/landingNavbar/LandingNavbar.vue';
import Sidebar from '@/components/sidebar/SideBar.vue';
</script>

<style scoped>
.dashboard-layout {
    display: flex;
    flex-direction: column;
    height: 100vh; /* Full viewport height */
}

.navbar {
    height: 50px; /* Fixed height for the navbar */
    flex-shrink: 0; /* Prevent shrinking */
}

.app {
    height: calc(100vh - 50px); /* Subtract navbar height from total viewport height */
    display: flex;
    flex-direction: row; /* Adjust for sidebar and main content */
}

v-main {
    flex: 1; /* Ensure the main content takes up remaining space */
    overflow-y: auto; /* Allow scrolling only for the main content */
}
</style>