<script lang="ts">
  export let canValidateMilestone: boolean;
  export let onCheckin: (minutes: 30 | 60) => void;
  export let onValidateMilestone: () => void;
</script>

<div class="quickbar">
  <button class="btn primary" on:click={() => onCheckin(30)}>+30 min</button>
  <button class="btn primary" on:click={() => onCheckin(60)}>+1 h</button>
  <button class="btn accent" disabled={!canValidateMilestone} on:click={onValidateMilestone}>
    ✓ Valider le jalon
  </button>
</div>
