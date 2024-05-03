<script setup lang="ts">
import { useDark } from '@vueuse/core';
import ThemeSwitcher from '../ThemeSwitcher.vue';

const isDark = useDark()

</script>

<template>
    <navbar class="h-[50px] w-full flex justify-between bg-navbar-light dark:bg-navbar-dark">
        <div class="logo-container w-[240px] h-full flex justify-center">
            <img class="h-full" :src="isDark ? '/plugin-logo.png' : '/plugin-logo-dark.png'" />
        </div>
        <ThemeSwitcher />
    </navbar>
</template>
