<script setup lang="ts">
import { ref } from 'vue';
import LandingNavbar from '../components/landingNavbar/LandingNavbar.vue';

const username = ref('');
const password = ref('');

const handleSubmit = () => {
    // Add your login logic here
    console.log('Username:', username.value);
    console.log('Password:', password.value);
};
</script>

<template>
    <LandingNavbar />
    <div class="landing-content h-[calc(100%-50px)] bg-background-light dark:bg-background-dark w-full flex items-center justify-center">
        <div
            class="h-[80%] dark:border-[1px] w-[40%] flex flex-col justify-between dark:border-background-light overflow-hidden rounded-3xl bg-gradient-to-br from-brand-teal to-brand-teal-alt dark:bg-gradient-to-br dark:from-brand-navy dark:to-blue-800 shadow-2xl p-8">
            
            <div>
                <h2 class="text-white text-2xl font-bold mb-4">Login</h2>
                <input v-model="username" type="text" placeholder="Username" class="input-field" />
                <input v-model="password" type="password" placeholder="Password" class="input-field mt-4" />
            </div>
            
            <button @click="handleSubmit" class="bg-white text-brand-teal py-2 px-4 rounded-full shadow-md hover:bg-opacity-75 transition duration-300">Submit</button>
        </div>
    </div>
</template>

<style scoped>
.input-field {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    margin-top: 8px;
    font-size: 16px;
}

.input-field:focus {
    outline: none;
}

button {
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    cursor: pointer;
}
</style>
