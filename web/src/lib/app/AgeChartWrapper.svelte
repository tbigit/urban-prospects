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

  function hexToHSL(hex) {
    hex = hex.replace(/^#/, '');
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if(max === min){
        h = s = 0; // achromatic
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
  }

  function getGradientColor(index, total, startColor = { h: 210, s: 70, l: 85 }, endColor = hexToHSL("#5C2587")) {
    const t = index / Math.max(total - 1, 1);
    const h = startColor.h + t * (endColor.h - startColor.h);
    const s = startColor.s + t * (endColor.s - startColor.s);
    const l = startColor.l + t * (endColor.l - startColor.l);
    return `hsl(${h}, ${s}%, ${l}%)`;
  }


  $: backgroundColors = dataSet.map((_, i) => getGradientColor(i, dataSet.length));

  function processChartConfig() {
    return {
      type: chartType,
      data: {
        labels: dataLabels,
        datasets: [{
          data: dataSet,
          backgroundColor: backgroundColors
        }]
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
            padding: { bottom: 30 }
          },
          legend: {
            display: legendDisplay,
            align: 'start',
            position: chartType === 'pie' ? 'top' : 'left',
            labels: {
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              font: {
                size: customFontSize
              }
            }
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
