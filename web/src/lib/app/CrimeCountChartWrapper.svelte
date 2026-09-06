<script>
  // @ts-nocheck
  import Chart from 'chart.js/auto';
  import { onMount } from 'svelte';
  export let dataSet = [];
  export let dataLabels = [];
  export let chartType = 'bar';
  export let legendDisplay = false;
  export let customHeight = null;
  export let customFontSize = 13;

  let canvas;
  let chartInstance;

  function processChartConfig() {
    return {
      type: chartType,
      data: {
        labels: dataLabels,
        datasets: [
          {
            label: 'Property Crime',
            data: dataSet.map(e => e.propertyCount),
            backgroundColor: '#5C2587',
            borderColor: '#5C2587',
            type: chartType,
          },
          {
            label: 'Violent Crime',
            data: dataSet.map(e => e.violentCount),
            backgroundColor: '#5EE7AD',
            borderColor: '#5EE7AD',
            type: chartType,
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: {
            labels: {
              padding: 25,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                size: customFontSize
              },
              generateLabels: (chart) => {
                const datasets = chart.data.datasets;
                return datasets.map((dataset, i) => ({
                  text: dataset.label,
                  fillStyle: dataset.backgroundColor,
                  strokeStyle: dataset.borderColor,
                  lineWidth: 0,
                  hidden: !chart.isDatasetVisible(i),
                  datasetIndex: i,
                  pointStyle: 'circle'
                }));
              }
            },
            display: legendDisplay,
            align: 'center',
            position: 'top',
          }
        }
      }
    };
  }

  onMount(() => {
    if (!Array.isArray(dataSet) || dataSet.length === 0) throw new Error('Invalid or missing dataSet.');
    if (!Array.isArray(dataLabels) || dataLabels.length === 0) throw new Error('Invalid or missing dataLabels.');

    const config = processChartConfig();
    chartInstance = new Chart(canvas, config);

    return () => {
      chartInstance.destroy();
    };
  });
</script>

<div style="position: relative; height: {customHeight ? customHeight : (chartType === 'pie' ? '360px' : chartType === 'line' ? '280px' : '350px')}; width: 100%; display: flex; align-items: center; justify-content: center;">
  <canvas bind:this={canvas}></canvas>
</div>
