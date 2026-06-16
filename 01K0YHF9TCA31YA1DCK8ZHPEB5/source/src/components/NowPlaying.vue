<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import Marquee from '@/components/Marquee.vue';

import { spotifyState } from '@/stores/spotify';

const time = ref<number | null>(0);
const interval = ref<NodeJS.Timeout>();
const timeout = ref<NodeJS.Timeout>();

const progressBar = ref<HTMLElement>();
const nowPlayingCard = ref<HTMLElement>();

onMounted(() => {
	clearInterval(interval.value);
	clearTimeout(timeout.value);

	time.value = spotifyState.value.progress_ms ?? 0;
});

onUnmounted(() => {
	clearInterval(interval.value);
	clearTimeout(timeout.value);
});

watch(spotifyState, (newValue, oldValue) => {
	// Run the like animation whenever the current track becomes liked. This is
	// independent of playback — a favorite shouldn't disturb the clock below.
	if (newValue.is_liked && !oldValue?.is_liked) {
		showLikeAnimation();
	}

	// Only events that actually redefine the current time should touch the
	// clock. A metadata-only update (e.g. favoriting) carries the same track,
	// play state and progress as before, so we leave the timer ticking instead
	// of snapping it back to the now-stale progress_ms.
	const playbackChanged
		= oldValue?.item?.id !== newValue.item?.id
			|| oldValue?.is_playing !== newValue.is_playing
			|| oldValue?.progress_ms !== newValue.progress_ms;

	if (!playbackChanged)
		return;

	clearInterval(interval.value);
	clearTimeout(timeout.value);

	progressBar.value?.classList.remove('duration-300');
	timeout.value = setTimeout(() => {
		progressBar.value?.classList.add('duration-300');
	}, 1000);

	time.value = newValue.progress_ms ?? 0;

	if (!newValue.is_playing)
		return;

	// Add shine effect when track changes
	if (oldValue?.item?.id !== newValue.item?.id && newValue.item) {
		addShineEffect();
	}

	interval.value = setInterval(() => {
		time.value = spotifyState.value && time.value ? time.value + 100 : 0;
	}, 100);
});

const width = computed(() => {
	if (!spotifyState.value.item || !time.value) return 0;
	const pct = (time.value / spotifyState.value.item.duration_ms) * 100;
	return Math.min(pct, 100);
});

// Add shine effect to the widget
function addShineEffect() {
	if (!nowPlayingCard.value)
		return;

	nowPlayingCard.value.classList.add('shine-active');

	setTimeout(() => {
		nowPlayingCard.value?.classList.remove('shine-active');
	}, 10000);
}

// Function to trigger when a track is liked
function showLikeAnimation() {
	if (!nowPlayingCard.value)
		return;

	nowPlayingCard.value.classList.add('like-active');

	setTimeout(() => {
		nowPlayingCard.value?.classList.remove('like-active');
	}, 3000);
}
</script>

<template>
	<div class="card" :class="{ hidden: !spotifyState.item }">
		<div ref="nowPlayingCard"
			class="flex flex-col rounded-lg p-4 gap-y-3.5 w-[500px] overflow-hidden relative now-playing-card"
		>
			<div id="background" class="absolute rounded-md overflow-hidden inset-0 -z-10" />
			<div class="flex items-center gap-x-4 overflow-hidden transition-all duration-300">
				<div class="relative">
					<img :src="spotifyState.item?.album.images.at(0)?.url" :alt="`${spotifyState.item?.name} album art`"
						class="w-16 h-16 rounded-md transition-all duration-300"
					>
					<div class="heart-animation">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-12 h-12">
							<path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
						</svg>
					</div>
				</div>
				<div :key="spotifyState.item?.name" class="flex flex-col w-available flex-1 overflow-hidden">
					<div class="text-theme-100 font-bold text-xl overflow-hidden transition-all duration-300">
						<Marquee :text="spotifyState.item?.name" />
					</div>
					<div class="text-theme-100 text-lg transition-all duration-300 text-semibold">
						{{ spotifyState.item?.artists?.map(artist => artist.name).join(', ') }}
					</div>
					<!--            <div class="text-theme-100 text-md transition-all duration-300"> -->
					<!--              {{ spotifyState.is_playing ? 'Now Playing' : 'Paused' }} -->
					<!--            </div> -->
				</div>
			</div>
			<div class="w-full">
				<div class="relative w-full h-1 bg-gradient-to-r from-theme-700 to-50% to-theme-400 rounded">
					<div ref="progressBar" class="absolute top-0 left-0 h-full bg-theme-200 rounded"
						:style="{ width: `${width}%` }"
					/>
				</div>
			</div>
		</div>
	</div>
</template>

<style scoped>
.card {
	align-self: self-end;
}
.now-playing-card {
	position: relative;
	transition: all 0.5s ease-in-out;
	z-index: 0;
}

.now-playing-card #background {
	background-image: linear-gradient(
		45deg,
		hsl(from var(--color-300) h s l / 50%),
		hsl(from var(--color-600) h s l / 50%) 15%,
		hsl(from var(--color-900) h s l / 90%)
	);
	z-index: -9;
}

/* Shine overlay effect */
.now-playing-card::after {
	--rotate: inherit;
	content: '';
	z-index: 5;
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	transform: translateX(-100%);
	pointer-events: none;
}

.now-playing-card.shine-active {
	scale: 1.2;
	translate: -10% -12%;
}

.now-playing-card.shine-active::after {
	animation: slide 5s forwards;
	background: linear-gradient(
		-65deg,
		rgba(255, 255, 255, 0) 0%,
		rgba(255, 255, 255, 0) 35%,
		rgba(255, 255, 255, 0.2) 50%,
		rgba(128, 186, 232, 0) 65%,
		rgba(128, 186, 232, 0) 99%,
		rgba(125, 185, 232, 0) 100%
	);
}

/* Like animation styling */
.heart-animation {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%) scale(0);
	color: #ef4444;
	opacity: 0;
	z-index: 10;
	transition:
		transform 0.5s,
		opacity 0.5s;
	filter: drop-shadow(0 0 8px #ef4444);
}

.now-playing-card.like-active::before {
	opacity: 1;
	animation: pulse 3s ease-out;
}

.now-playing-card.like-active .heart-animation {
	animation: heart-pop 1.5s ease-out forwards;
}

@keyframes heart-pop {
	0% {
		transform: translate(-50%, -50%) scale(0);
		opacity: 0;
	}
	25% {
		transform: translate(-50%, -50%) scale(1.2);
		opacity: 1;
	}
	50% {
		transform: translate(-50%, -50%) scale(1);
		opacity: 1;
	}
	75% {
		transform: translate(-50%, -50%) scale(1.1);
		opacity: 1;
	}
	100% {
		transform: translate(-50%, -50%) scale(0);
		opacity: 0;
	}
}

@keyframes slide {
	10% {
		transform: translateX(-75%);
	}
	30%,
	100% {
		transform: translateX(100%);
	}
}

@keyframes pulse {
	0% {
		opacity: 0.3;
	}
	50% {
		opacity: 1;
	}
	100% {
		opacity: 0.3;
	}
}
</style>
