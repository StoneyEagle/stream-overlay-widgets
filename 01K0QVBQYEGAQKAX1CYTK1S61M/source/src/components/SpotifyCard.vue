<script setup lang="ts">
import type { PropType } from 'vue';

interface SpotifyMetadata {
	title?: string;
	description?: string;
	image?: string;
	url?: string;
}

defineProps({
	metadata: {
		type: Object as PropType<SpotifyMetadata>,
		required: true,
	},
});
</script>

<template>
	<div v-if="metadata" class="spotify-card flex items-center gap-3 rounded-lg p-2.5 mt-1 overflow-hidden">
		<img v-if="metadata.image" :src="metadata.image" :alt="metadata.title || 'Album art'"
			class="w-14 h-14 rounded object-cover flex-shrink-0 not-prose shadow-lg">
		<div v-else class="w-14 h-14 rounded bg-neutral-700 flex-shrink-0 flex items-center justify-center">
			<svg class="w-6 h-6 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
				<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
			</svg>
		</div>
		<div class="flex flex-col min-w-0 flex-1">
			<span class="font-semibold text-white text-sm truncate leading-tight">
				{{ metadata.title || 'Spotify Track' }}
			</span>
			<span v-if="metadata.description" class="text-xs text-white/50 truncate leading-tight mt-0.5">
				{{ metadata.description }}
			</span>
			<span class="text-xs text-[#1DB954] mt-1 flex items-center gap-1 leading-none">
				<svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
					<path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
				</svg>
				Song Request
			</span>
		</div>
	</div>
</template>

<style scoped>
.spotify-card {
	background: linear-gradient(135deg, rgba(29, 185, 84, 0.12) 0%, rgba(29, 185, 84, 0.04) 100%);
	border: 1px solid rgba(29, 185, 84, 0.2);
}
</style>
