<script>
  // @ts-nocheck
  import { onMount } from 'svelte';
  import Chart from 'chart.js/auto';

  export let dataSet = [];
  export let dataLabels = [];
  export let chartType = 'bar';
  export let legendDisplay = false;

  let canvas;
  let chartInstance;

  // Base chart config
  function processChartConfig() {
    return {
      type: chartType,
      data: {
        labels: dataLabels,
        datasets: [{
          data: dataSet,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { usePointStyle: true },
            display: legendDisplay,
            align: 'start',
            position: 'top',
          },
        },
      },
    };
  }

  onMount(() => {
    if (!Array.isArray(dataSet) || dataSet.length === 0) throw new Error('Invalid or missing dataSet.');
    if (!Array.isArray(dataLabels) || dataLabels.length === 0) throw new Error('Invalid or missing dataLabels.');
    if (!chartType) throw new Error('Invalid or missing chartType.');

    const config = processChartConfig();
    chartInstance = new Chart(canvas, config);

    return () => {
      chartInstance.destroy();
    };
  });
</script>

<canvas bind:this={canvas}></canvas>
