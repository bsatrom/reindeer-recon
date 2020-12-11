<script>
  import Map from './Map.svelte';
</script>

<main>
	<img src="assets/reindeer.svg" alt="reindeer leaping" />
	<h1>Reindeer Recon 2020</h1>
</main>

<Map />

<style>
	main {
		text-align: center;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 3em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>