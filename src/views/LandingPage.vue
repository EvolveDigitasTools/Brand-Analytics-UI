<script setup lang="ts">
import LandingNavbar from '../components/landingNavbar/LandingNavbar.vue';


</script>
<template>
    <LandingNavbar />
    <div
        class="landing-content h-[calc(100%-50px)] bg-background-light dark:bg-background-dark w-full flex items-center justify-center">
        <div
            class="h-[80%] dark:border-[1px] w-[90%] flex justify-between dark:border-background-light overflow-hidden rounded-3xl bg-gradient-to-br from-brand-teal to-brand-teal-alt dark:bg-gradient-to-br dark:from-brand-navy dark:to-blue-800 shadow-2xl">
            <div class="left-content flex flex-col justify-center p-8 w-1/2">
                <h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight mb-4">Unlock Insights,
                    Drive Growth</h1>
                <h3 class="text-base sm:text-lg text-white mb-6">Actionable intelligence to fuel your brand's success.
                </h3>
                <RouterLink to="/dashboard"
                    class="bg-white text-brand-teal py-2 px-6 rounded-full shadow-md hover:bg-opacity-75 transition duration-300 text-center">
                    View Dashboard
                </RouterLink>
            </div>
            <div class="right-content w-1/2"><img src="/analytics-dashboard.png" /></div>
        </div>
    </div>
</template>