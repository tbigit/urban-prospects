<script>
  // @ts-nocheck
  import Chart from 'chart.js/auto';
  import { onMount } from 'svelte';
  export let dataSet = [];
  export let chartType = 'bubble';
  export let legendDisplay = false;
  export let lga = '';
  export let customHeight = null;
  export let customFontSize = 13;

  let canvas;
  let chartInstance;

  function processChartConfig() {
    return {
      type: chartType,
      data: {
        datasets: [
          {
            label: 'LGA Crime Rankings',
            data: dataSet.map(d => ({
              x: d.violentRank,
              y: d.propertyRank,
              r: 6,
              lga: d.lga
            })),
            backgroundColor: dataSet.map(d =>
              String(d.lga).toLowerCase() === String(lga).toLowerCase()
                ? 'rgba(92, 37, 135, 0.8)'
                : 'rgba(94, 231, 173, 0.5)'),
            borderColor: dataSet.map(d =>
              String(d.lga).toLowerCase() === String(lga).toLowerCase()
                ? 'rgba(92, 37, 135, 0.8)'
                : 'rgba(94, 231, 173, 1)')
          },
          {
            type: 'line',
            data: [{ x: 0, y: 0 }, { x: 120, y: 120 }],
            pointStyle: false
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) => {
                const d = context.raw;
                return [
                  `${d.lga}`,
                  `Violent Crime Rank: ${d.x}`,
                  `Property Crime Rank: ${d.y}`
                ];
              }
            }
          },
          legend: {
            display: legendDisplay,
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                size: customFontSize
              }
            }
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Violent Crime Rank' },
            beginAtZero: true,
          },
          y: {
            title: { display: true, text: 'Property Crime Rank' },
            beginAtZero: true,
          }
        }
      }
    };
  }

  onMount(() => {
    if (!Array.isArray(dataSet) || dataSet.length === 0) throw new Error('Invalid or missing dataSet.');

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
