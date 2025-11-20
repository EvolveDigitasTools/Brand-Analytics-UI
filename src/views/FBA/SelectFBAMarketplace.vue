<template>
  <div class="market-container">
    <h2>Select Marketplace</h2>

    <div class="buttons">
      <button class="mp-btn amazon" @click="$router.push('/dashboard/amazon-fba')">
        Amazon FBA
      </button>

      <button class="mp-btn flipkart" @click="$router.push('/dashboard/flipkart-fba')">
        Flipkart FBA
      </button>
    </div>

    <button class="back-btn" @click="$router.back()">⬅ Back</button>
  </div>
</template>

<style scoped>
.market-container {
  max-width: 600px;
  margin: 80px auto;
  text-align: center;
}

.buttons {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin: 40px 0;
}

.mp-btn {
  padding: 14px;
  border: none;
  font-size: 20px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: bold;
  color: white;
}

.amazon { background: #ff9900; }
.flipkart { background: #2874f0; }

.back-btn {
  padding: 10px 20px;
  background: #ccc;
  border-radius: 10px;
}
</style>
