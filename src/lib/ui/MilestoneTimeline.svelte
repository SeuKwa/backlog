<script lang="ts">
  import type { Milestone } from '$lib/domain/types';
  import { maskMilestones } from '$lib/domain/fog';

  export let milestones: Milestone[];
  export let fogEnabled: boolean;
  export let onValidate: (id: string) => void;
  export let onEdit: (id: string) => void;
  export let onDelete: (id: string) => void;

  $: masked = maskMilestones(milestones, fogEnabled);
</script>

{#if masked.length === 0}
  <p class="muted">Aucun jalon défini. Ajoutez des étapes neutres (sans spoiler) pour suivre votre progression.</p>
{:else}
  <ol class="timeline">
    {#each masked as m (m.id)}
      <li class="tl-item tl-{m.state}">
        <span class="tl-dot" aria-hidden="true"></span>
        <div class="tl-content">
          <div class="tl-label">{m.label}</div>
          {#if m.hint}
            <div class="tl-hint">{m.hint}</div>
          {/if}
          {#if m.state === 'current'}
            <button class="btn primary sm" on:click={() => onValidate(m.id)}>✓ Valider cette étape</button>
          {/if}
          {#if m.state !== 'locked'}
            <div class="tl-actions">
              <button class="btn ghost sm" on:click={() => onEdit(m.id)}>Modifier</button>
              <button class="btn ghost sm danger" on:click={() => onDelete(m.id)}>Supprimer</button>
            </div>
          {/if}
        </div>
      </li>
    {/each}
  </ol>
{/if}
