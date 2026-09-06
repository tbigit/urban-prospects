<script>
  // @ts-nocheck
  export let property;

  const zoningZones = ["R1", "R2", "R3", "R4"];
  function isApplicableZone(zone) {
    return zoningZones.some(z => zone.includes(z));
  }

  // Zoning data parsed from CSV, keyed by building type and zone
  const zoningData = {
    "Apartment R1/R2": {
      minLotSize: 500,
      minLotWidth: 12,
      maxFSR_0_400: "0.8:1",
      maxFSR_400_800: "0.8:1",
      maxHeight_0_400: "9.5",
      maxHeight_400_800: "9.5"
    },
    "Apartments R3/R4": {
      minLotSize: "N/A",
      minLotWidth: "N/A",
      maxFSR_0_400: "2.2:1",
      maxFSR_400_800: "1.5:1",
      maxHeight_0_400: "22",
      maxHeight_400_800: "17.5"
    },
    "Shop Top Housing": {
      minLotSize: "N/A",
      minLotWidth: "N/A",
      maxFSR_0_400: "2.2:1",
      maxFSR_400_800: "N/A",
      maxHeight_0_400: "24",
      maxHeight_400_800: "N/A"
    },
    "Manor Home & Dual Occupancies": {
      minLotSize: 450,
      minLotWidth: 12,
      maxFSR_0_400: "0.65:1",
      maxFSR_400_800: "0.65:1",
      maxHeight_0_400: "9.5",
      maxHeight_400_800: "9.5"
    },
    "Multi-Dwelling Houses": {
      minLotSize: 600,
      minLotWidth: 12,
      maxFSR_0_400: "0.7:1",
      maxFSR_400_800: "0.7:1",
      maxHeight_0_400: "9.5",
      maxHeight_400_800: "9.5"
    },
    "Multi-Dwelling (Terraces) Houses": {
      minLotSize: 500,
      minLotWidth: 18,
      maxFSR_0_400: "0.7:1",
      maxFSR_400_800: "0.7:1",
      maxHeight_0_400: "9.5",
      maxHeight_400_800: "9.5"
    }
  };

  // List of building types to display
  const buildingTypes = [
    "Apartment",
    "Shop Top Housing",
    "Manor Home & Dual Occupancies",
    "Multi-Dwelling Houses",
    "Multi-Dwelling (Terraces) Houses"
  ];

  // Determine zoning data key based on building type and property's lzn_label
  function selectZoningKey(buildingType) {
    const label = (property.lzn_label || "").toUpperCase();

    if (buildingType === "Apartment") {
      if (label.includes("R1") || label.includes("R2")) return "Apartment R1/R2";
      if (label.includes("R3") || label.includes("R4")) return "Apartments R3/R4";
    }
    if (buildingType === "Shop Top Housing") return "Shop Top Housing";
    if (buildingType === "Manor Home & Dual Occupancies") return "Manor Home & Dual Occupancies";
    if (buildingType === "Multi-Dwelling Houses") return "Multi-Dwelling Houses";
    if (buildingType === "Multi-Dwelling (Terraces) Houses") return "Multi-Dwelling (Terraces) Houses";

    return null;
  }

  // Select value depending on distance to railway station
  function selectByDistance(value0_400, value400_800) {
    const dist = property.closest_railway_station_distance;
    if (dist <= 400) return value0_400;
    if (dist <= 800) return value400_800;
    return "N/A";
  }
</script>

<style>
  .info-type {
    font-size: 0.7125rem;
    color:var(--up-c-aaaaaa);
  }
  h4 {
    color: var(--up-c-31144d);
    font-weight: 500;
  }
  p {
    font-size: 0.75rem;
  }
</style>

{#if property.closest_railway_station_distance <= 800 && !isApplicableZone(property.lzn_label)}
  <div class="padding-top padding-bottom">
    <p><strong>The LMR development controls are not applicable to the zoning of this site <a href="https://legislation.nsw.gov.au/view/html/inforce/current/epi-2021-0714#ch.6" target="_blank" rel="noopener noreferrer"><i class=" icon-external-link"></i></a></strong></p>
  </div>
{:else if property.closest_railway_station_distance <= 800}
  {#each buildingTypes as buildingType}
    {#key buildingType}
      <div class="padding-top">
        <p class="uppercase"><strong>{buildingType}</strong></p>
      </div>

      <div class="flex">
        {#await Promise.resolve(selectZoningKey(buildingType)) then zoningKey}
          {#if zoningKey && zoningData[zoningKey]}
            <div class="one-quarter">
              <div class="padding-top padding-bottom">
                <h6 class="info-type">MIN LOT SIZE</h6>
              </div>
              {#if property.lot_size && zoningData[zoningKey].minLotSize !== "N/A"}
                <h4>{zoningData[zoningKey].minLotSize} sqm</h4>
              {:else}
                <h4 class="unclickable">-- sqm</h4>
              {/if}
            </div>
            <div class="one-quarter">
              <div class="padding-top padding-bottom">
                <h6 class="info-type">MIN LOT WIDTH</h6>
              </div>
              {#if zoningData[zoningKey].minLotWidth !== "N/A"}
                <h4><i class=" icon-move-horizontal"></i> {zoningData[zoningKey].minLotWidth} m</h4>
              {:else}
                <h4 class="unclickable">-- m</h4>
              {/if}
            </div>
            <div class="one-quarter">
              <div class="padding-top padding-bottom">
                <h6 class="info-type">HEIGHT</h6>
              </div>
              <h4><i class="  icon-building"></i> {selectByDistance(zoningData[zoningKey].maxHeight_0_400, zoningData[zoningKey].maxHeight_400_800)} m</h4>
            </div>
            <div class="one-quarter">
              <div class="padding-top padding-bottom">
                <h6 class="info-type">FLOOR SPACE RATIOS</h6>
              </div>
              <h4><i class=" icon-align-vertical-space-around"></i> {selectByDistance(zoningData[zoningKey].maxFSR_0_400, zoningData[zoningKey].maxFSR_400_800)}</h4>
            </div>
          {:else}
            <p>No zoning data for {buildingType}</p>
          {/if}
        {/await}
      </div>
    {/key}
  {/each}
{/if}
