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

  const nationalityColors = {
    English: "#6A9FD2",
    England: "#6A9FD2",
    Australian: "#78C267",
    Australia: "#78C267",
    Irish: "#51C491",
    Scottish: "#8093D1",
    Chinese: "#EF6F6C",
    China: "#EF6F6C",
    "Australian Aboriginal": "#A59C9C",
    Indian: "#FFBA49",
    India: "#FFBA49",
    Italian: "#7CCFA0",
    Italy: "#7CCFA0",
    Lebanese: "#F49097",
    Lebanon: "#F49097",
    Vietnamese: "#F25C54",
    Vietnam: "#F25C54",
    "New Zealand": "#B5B5B5",
    Philippines: "#FFD66B",
    Nepal: "#F2A2C0",
    Iraq: "#F29E61"
  };

  $: backgroundColors = dataLabels.map(label => nationalityColors[label]);

  function processChartConfig() {
    return {
      type: chartType,
      data: {
        labels: dataLabels,
        datasets: [{
          data: dataSet,
          backgroundColor: backgroundColors,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            bottom: chartType === 'pie' ? 40 : 10,
            left: 10,
            right: 10
          }
        },
        plugins: {
          title: {
            display: chartType === 'pie',
            text: '',
            padding: { bottom: 30 } // Adds the requested gap between legend and chart
          },
          legend: {
            display: legendDisplay,
            align: 'start', // vertically stacking items more naturally by starting from left
            position: chartType === 'pie' ? 'top' : 'left',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                size: customFontSize
              }
            }
          },
        },
      },
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
