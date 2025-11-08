<template>
    <div class="marketplaces-heading"><h4 class="marketplaces-text">Upload Daily Inventory Sheet</h4></div>
    
        <div class="mrkt-btn">
            <div class="sheet-btn">
                <!-- Button to go to Meesho component -->
                <button @click="goToMeesho">Meesho</button>
            </div>

            <div class="sheet-btn">
                <!-- Button to go to Meesho component -->
                <button @click="goToAmazon">Amazon</button>
            </div>

            <div class="sheet-btn">
                <!-- Button to go to Meesho component -->
                <button @click="goToFlipkart">Flipkart</button>
            </div>
        </div>

</template>

<script>

export default {
  name: "MarketplaceButton",
  methods: {
    goToMeesho() {
      this.$router.push({ name: "Meesho" }); 
    },
    goToAmazon() {
      this.$router.push({ name: "Amazon" }); 
    },
    goToFlipkart() {
      this.$router.push({ name: "Flipkart" }); 
    },
  },
};
</script>

<style scoped>
.marketplaces-heading {
    height: fit-content;
    width: fit-content;
    margin: 20px 0 20px 100px;
}

.marketplaces-text {
    font-size: 2.125rem !important;
    font-weight: 400;
    line-height: 1.175;
    letter-spacing: 0.0073529412em !important;
    font-family: "Roboto", sans-serif;
    text-transform: none !important;
}

.mrkt-btn {
    display: flex;
    gap: 20px;
    justify-content: center;
}

.upload-page {
  max-width: 700px;
  margin: 20px auto;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}
button {
  color: #090909;
  padding: 0.7em 1.7em;
  font-size: 18px;
  border-radius: 0.5em;
  background: #e8e8e8;
  cursor: pointer;
  border: 1px solid #e8e8e8;
  transition: all 0.3s;
  box-shadow: 6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff;
}
button:hover{
    background: #e8e8e8;
    transform: translate(-0.25rem, -0.25rem);
    background: var(--hover-bg);
    box-shadow: 0.25rem 0.25rem var(--bg);
}
button:active {
  color: #666;
  box-shadow: inset 4px 4px 12px #c5c5c5, inset -4px -4px 12px #ffffff;
}
</style>
