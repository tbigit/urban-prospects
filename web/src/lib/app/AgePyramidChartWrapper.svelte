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

  const colors = ['#E6D9F7', '#D5BEF3', '#C4A3ED', '#B488E8', '#A66DE4', '#9552DE', '#8437D9', '#732CCF', '#6221C4', '#5216BA', '#430CAC', '#360A9B', '#2B097E', '#20075F', '#160540', '#0D0223']; // brand colors to cycle through
  $: backgroundColors = dataSet.map((_, i) => colors[i % colors.length]);

  function processChartConfig() {
    return {
      type: chartType,
      data: {
        labels: dataLabels,
        datasets: [{
          data: dataSet,
          backgroundColor: backgroundColors,
          borderColor: backgroundColors,
          borderWidth: 2,
        }],
      },
      options: {
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 10,
            bottom: chartType === 'pie' ? 40 : 10,
            left: 10,
            right: 10
          }
        },
        indexAxis: 'y',
        elements: {
          bar: {
            borderWidth: 2,
          }
        },
        responsive: true,
        plugins: {
          title: {
            display: chartType === 'pie',
            text: '',
            padding: { bottom: 30 }
          },
          legend: {
            display: legendDisplay,
            align: 'start',
            position: chartType === 'pie' ? 'top' : 'right',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                size: customFontSize
              }
            }
          },
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
