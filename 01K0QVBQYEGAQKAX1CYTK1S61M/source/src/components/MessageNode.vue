<script lang="ts" setup>
import type { PropType } from 'vue';
import type { MessageNode, OGMetadata } from '@/types/chat';
import { features } from '@/stores/config';
import OGMetaPreview from './OGMetaPreview.vue';
import SpotifyCard from './SpotifyCard.vue';

const props = defineProps({
	node: {
		type: Object as PropType<MessageNode>,
		required: true,
	},
});

console.log('Rendering MessageNode:', props.node);
</script>

<template>
	<template v-if="node.type == 'video' || node.type == 'audio'"></template>
	<div v-if="node.type === 'rootNode'" :id="node.id" :class="node.classes"
		class="message gap-0.5 break-words"
		:style="node.classes?.includes('emote-only') ? 'display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem;' : ''"
	>
		<template v-for="child in node.children ?? []" :key="child.id">
			<MessageNode :node="child" />
		</template>
	</div>
	<img v-else-if="node.type === 'emote'" :id="node.id" :alt="node.attribs?.alt" :class="node.classes" v-bind="node.attribs" class="not-prose"
	>
	<img v-else-if="node.type === 'emote-placeholder'" :id="node.id" :alt="node.attribs?.alt" :class="node.classes"
		class="h-7 w-auto mx-1 inline not-prose" v-bind="node.attribs"
	>
	<img v-else-if="node.type === 'img'" :id="node.id" :alt="node.attribs?.alt" :class="node.classes"
		class="w-full h-auto max-h-96 inline not-prose" v-bind="node.attribs"
	>
	<div v-else-if="node.type === 'og-preview'" :id="node.id" :class="node.classes">
		<OGMetaPreview v-if="features.ogPreviews" :metadata="node.attribs as OGMetadata" />
	</div>
	<div v-else-if="node.type === 'spotify-card'" :id="node.id" :class="node.classes">
		<SpotifyCard :metadata="node.attribs as any" />
	</div>
	<div v-else-if="node.type === 'mention'" :id="node.id" :class="node.classes" class="inline break-words"
		v-bind="node.attribs"
	>
		<template v-for="child in node.children ?? []" :key="child.id">
			<MessageNode :node="child" />
		</template>
		{{ node.text }}
	</div>
	<component :is="node.type" v-else :id="node.id" :class="node.classes" class="inline break-words w-full h-auto max-h-96"
		v-bind="node.attribs"
	>
		<template v-for="child in node.children ?? []" :key="child.id">
			<MessageNode :node="child" />
		</template>
		{{ node.text }}
	</component>
</template>
