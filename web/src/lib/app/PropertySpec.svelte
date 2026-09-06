<script>
  // @ts-nocheck
  export let property;

  const formatNiceCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

</script>

<div class="padding-top span-info flex flex-static">
  <div class="one-quarter">
    <div class="span-label">
      FRONTAGE WIDTH
    </div>
    <i class=" icon-move-horizontal"></i> {property.primary_frontage_length_m ?? property.width ?? '--'} m
  </div>
  <div class="one-quarter">
    <div class="span-label">
      DEPTH
    </div>
    <i class=" icon-move-vertical"></i> {property.lot_depth_m ?? property.depth ?? '--'} m
  </div>
  <div class="one-quarter">
    <div class="span-label">
      PERMISSIBLE HEIGHT
    </div>
    <i class="  icon-building"></i> {property.hob_max_b_h || '--'} m
  </div>
  <div class="one-quarter">
    <div class="span-label">
      FRS
    </div>
    <i class=" icon-align-vertical-space-around"></i> {property.fsr_fsr || '--'} fsr
  </div>
</div>

<div class="padding-top span-info flex flex-static">
  <div class="one-quarter">
    {#if property.planlabel || property.lotnumber}
      {#if property.lotnumber}
        <div class="span-label">
          LOT NO
        </div>
        {property.lotnumber}/{property.planlabel}
      {:else}
        <div class="span-label">
          PLAN NO
        </div>
        {property.planlabel}
      {/if}
    {/if}
  </div>
  <div class="one-quarter">
    <div class="span-label">
      MIN LOT SIZE
    </div>
    {#if property.lot_size}
    {parseInt(property.lot_size)} sqm
    {:else}
    -- sqm
    {/if}
  </div>
  <div class="one-quarter">
    <div class="span-label">
      AREA OF LAND
    </div>
    {property.area ? parseInt(property.area): '--'} sqm
  </div>
  <div class="one-quarter">
    <div class="span-label">
      ZONING
    </div>
    {property.lzn_label}
  </div>
</div>

<div class="padding-top span-info flex flex-static">
  {#if property.estimated_price}<div class="one-quarter"><div class="span-label"></div><div><i class=" icon-dollar-sign"></i> {formatNiceCurrency(property.estimated_price)}</div></div>{/if}
  {#if property.no_of_beds}<div class="one-quarter"><div class="span-label"></div><div><i class=" icon-bed-double"></i> {property.no_of_beds}</div></div>{/if}
  {#if property.no_of_baths}<div class="one-quarter"><div class="span-label"></div><div><i class=" icon-shower-head"></i> {property.no_of_baths}</div></div>{/if}
  {#if property.no_of_cars}<div class="one-quarter"><div class="span-label"></div><div><i class=" icon-car"></i> {property.no_of_cars}</div></div>{/if}
</div>

