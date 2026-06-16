import type { ChatMessage, Fragment, MessageNode } from '@/types/chat';

// Color utility function from your ChatOverlay
export function tooLight(color: string, threshold = 140): boolean {
	// Convert color to RGB values
	const rgb = hexToRgb(color);
	if (!rgb)
		return false;

	// Calculate luminance
	const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
	return luminance > threshold;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	// Remove # if present
	hex = hex.replace('#', '');

	// Handle 3-digit hex
	if (hex.length === 3) {
		hex = hex.split('').map(char => char + char).join('');
	}

	const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: Number.parseInt(result[1], 16),
				g: Number.parseInt(result[2], 16),
				b: Number.parseInt(result[3], 16),
			}
		: null;
}

/**
 * Synchronize RGB animations in the document
 */
export function syncRgb() {
	document.getAnimations()
		.filter((a: any) => a.animationName === 'changeColor')
		.forEach((anim) => {
			anim.cancel();
			anim.play();
		});
}

// Marquee utility function
export function shouldMarquee(element: HTMLElement): void {
	const container = element.querySelector('[data-marquee="container"]') as HTMLElement;
	const scroller = element.querySelector('[data-marquee="scroller"]') as HTMLElement;

	if (!container || !scroller)
		return;

	const containerWidth = container.offsetWidth;
	const scrollerWidth = scroller.scrollWidth;

	if (scrollerWidth > containerWidth) {
		scroller.classList.add('marquee-scroll');
	}
	else {
		scroller.classList.remove('marquee-scroll');
	}
}

const httpRegex = /^https?:\/\/(?:www\.)?[-\w@:%.+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b[-\w()@:%+.~#?&/=]*$/;

function parseHTML(html: string): DocumentFragment {
	const template = document.createElement('template');
	template.innerHTML = html;
	return template.content;
}

const emoteHostPatterns = [
	'static-cdn.jtvnw.net/emoticons/',
	'cdn.betterttv.net/emote/',
	'cdn.7tv.app/emote/',
	'cdn.frankerfacez.com/',
];

function isEmoteImg(element: Element): boolean {
	if (element.tagName.toLowerCase() !== 'img') return false;
	const src = element.getAttribute('src') || '';
	return emoteHostPatterns.some(pattern => src.includes(pattern));
}

function hasUserSizing(element: Element): boolean {
	const style = element.getAttribute('style') || '';
	return element.hasAttribute('width')
		|| element.hasAttribute('height')
		|| /(?:^|;)\s*(?:width|height|max-height|max-width)\s*:/.test(style);
}

function createEmoteImgNode(element: Element, messageId: string, index: number): MessageNode {
	const src = element.getAttribute('src') || '';
	const alt = element.getAttribute('alt') || '';
	const style = element.getAttribute('style') || undefined;
	const sizeClass = hasUserSizing(element) ? 'w-auto mx-1 inline' : 'h-20 w-auto mx-1 inline';

	return {
		type: 'emote',
		id: `${messageId}-emote-${index}`,
		classes: ['message-emote', sizeClass],
		attribs: { src, alt, ...(style && { style }) },
	};
}

function elementToMessageNode(element: Element, messageId: string, index: number): MessageNode {
	if (element.nodeType === 3) {
		return {
			type: 'p',
			id: `${messageId}-text-${index}`,
			classes: ['message-text'],
			text: element.textContent || '',
		};
	}

	if (isEmoteImg(element))
		return createEmoteImgNode(element, messageId, index);

	const tagName = element.tagName.toLowerCase();
	const node: MessageNode = {
		type: tagName,
		id: `${messageId}-${tagName}-${index}`,
		classes: ['message-custom'],
		attribs: {},
		children: [],
	};

	Array.from(element.attributes).forEach((attr) => {
		if (node.attribs) {
			node.attribs[attr.name] = attr.value;
		}
	});

	// Check if element has only text content (no child elements)
	const hasOnlyText = Array.from(element.childNodes).every(child => child.nodeType === 3);

	if (hasOnlyText && element.textContent?.trim()) {
		// If the element only contains text, set it directly without wrapping in children
		node.text = element.textContent;
		node.children = []; // Clear children array
	}
	else {
		// Otherwise, process children recursively
		element.childNodes.forEach((child, childIndex) => {
			if (child instanceof Element) {
				node.children?.push(elementToMessageNode(child, messageId, childIndex));
			}
			else if (child.nodeType === 3 && child.textContent?.trim()) {
				node.children?.push({
					type: 'span',
					id: `${messageId}-text-${index}-${childIndex}`,
					classes: ['message-text'],
					text: child.textContent,
				});
			}
		});
	}

	return node;
}

function createLinkNode(messageId: string, url: string, index: number): MessageNode {
	return {
		type: 'a',
		id: `${messageId}-link-${index}`,
		classes: ['message-link'],
		text: url,
		attribs: {
			'href': url,
			'target': '_blank',
			'rel': 'noopener noreferrer',
			'data-og-fetch': 'true',
		},
		children: [],
	};
}

function createTextNode(messageId: string, fragment: Fragment, index: number): MessageNode {
	return {
		type: 'p',
		id: `${messageId}-text-${index}`,
		classes: [
			'message-text',
		],
		text: fragment.text,
	};
}

function createMentionNode(messageId: string, fragment: Fragment, index: number): MessageNode {
	return {
		type: 'mention',
		id: `${messageId}-mention-${index}`,
		classes: [
			'message-text',
			'mention',
		],
		text: fragment.text,
		attribs: {
			'style': `color: ${fragment.mention?.color_hex};`,
		},
	};
}

function createEmoteNode(messageId: string, fragment: Fragment, index: number, emoteOnly = false): MessageNode {
	const isGigantified = fragment.emote?.is_gigantified;
	let sizeClass = 'h-7 w-auto mx-1 inline';
	let src = fragment.emote?.urls['2'];

	if (isGigantified) {
		sizeClass = 'h-96 w-auto mx-1 inline';
		src = fragment.emote?.urls['3'] || fragment.emote?.urls['2'];
	} else if (emoteOnly) {
		sizeClass = 'h-[72px] w-auto mx-1 inline';
		src = fragment.emote?.urls['3'] || fragment.emote?.urls['2'];
	}

	return {
		type: 'emote',
		id: `${messageId}-emote-${index}`,
		classes: [
			'message-emote',
			sizeClass,
		],
		attribs: {
			src,
			alt: fragment.text,
		},
	};
}

function createUrlNode(messageId: string, fragment: Fragment, index: number): MessageNode {
	return {
		type: 'a',
		id: `${messageId}-url-${index}`,
		classes: ['message-link'],
		text: fragment.text,
		attribs: {
			href: fragment.text,
			target: '_blank',
			rel: 'noopener noreferrer',
		},
	};
}

function createOgPreviewNode(messageId: string, fragment: Fragment, index: number): MessageNode {
	return {
		type: 'og-preview',
		id: `${messageId}-og-preview-${index}`,
		classes: ['message-og-preview', 'w-full', 'empty:hidden'],
		attribs: {
			title: fragment.html_preview?.title,
			description: fragment.html_preview?.description,
			image: fragment.html_preview?.image_url,
			host: fragment.html_preview?.host,
		},
		children: [],
	};
}

function createSpotifyCardNode(messageId: string, fragment: Fragment, index: number): MessageNode {
	return {
		type: 'spotify-card',
		id: `${messageId}-spotify-${index}`,
		classes: ['message-spotify-card', 'w-full'],
		attribs: {
			title: fragment.html_preview?.title,
			description: fragment.html_preview?.description,
			image: fragment.html_preview?.image_url,
			url: fragment.text,
		},
		children: [],
	};
}

export function isEmoteOnlyMessage(message: ChatMessage): boolean {
	if (!message.fragments || message.fragments.length === 0) return false;
	return message.fragments.every(f =>
		f.type === 'emote' || (f.type === 'text' && f.text.trim() === ''),
	);
}

export function createMessageNode(message: ChatMessage): MessageNode {
	const emoteOnly = isEmoteOnlyMessage(message);

	const nodes: MessageNode = {
		type: 'rootNode',
		id: message.id,
		classes: emoteOnly ? ['message', 'emote-only'] : ['message'],
		children: [],
	};

	const ogPreviewNodes: MessageNode[] = [];

	if (message.fragments && message.fragments.length > 0) {
		message.fragments.forEach((fragment, index) => {
			if (fragment.type === 'text') {
				nodes.children?.push(createTextNode(message.id, fragment, index));
			}
			else if (fragment.type === 'mention') {
				console.log('Creating mention node for fragment:', message);
				nodes.children?.push(createMentionNode(message.id, fragment, index));
			}
			else if (fragment.type === 'emote') {
				nodes.children?.push(createEmoteNode(message.id, fragment, index, emoteOnly));
			}
			else if (fragment.type === 'spotify') {
				nodes.children?.push(createSpotifyCardNode(message.id, fragment, index));
			}
			else if (fragment.type === 'url') {
				nodes.children?.push(createUrlNode(message.id, fragment, index));
				// Collect OG preview node if html_preview exists
				if (fragment.html_preview) {
					ogPreviewNodes.push(createOgPreviewNode(message.id, fragment, index));
				}
			}
			else if (fragment.type === 'html') {
				const htmlFragment = parseHTML(fragment.text);
				htmlFragment.childNodes.forEach((child, childIndex) => {
					if (child instanceof Element) {
						nodes.children?.push(elementToMessageNode(child, message.id, childIndex));
					}
					else if (child.nodeType === 3 && child.textContent?.trim()) {
						nodes.children?.push({
							type: 'p',
							id: `${message.id}-text-${index}-${childIndex}`,
							classes: ['message-text'],
							text: child.textContent,
						});
					}
				});
			}
		});
	}
	else {
		const fragment = parseHTML(message.message);
		let plainText = '';

		fragment.childNodes.forEach((node, index) => {
			if (node.nodeType === 3) {
				plainText += node.textContent;
			}
			else if (node instanceof Element) {
				if (plainText) {
					const textNodes = processTextWithLinks(message.id, plainText, index);
					nodes.children?.push(...textNodes);
					plainText = '';
				}
				nodes.children?.push(elementToMessageNode(node, message.id, index));
			}
		});

		if (plainText) {
			const textNodes = processTextWithLinks(message.id, plainText, 0);
			nodes.children?.push(...textNodes);
		}
	}

	// Append all OG preview nodes at the end
	nodes.children?.push(...ogPreviewNodes);

	return nodes;
}

function processTextWithLinks(messageId: string, text: string, index: number): MessageNode[] {
	const nodes: MessageNode[] = [];
	const words = text.split(' ');
	let currentText = '';

	words.forEach((word, wordIndex) => {
		if (httpRegex.test(word)) {
			if (currentText) {
				nodes.push({
					type: 'p',
					id: `${messageId}-text-${index}-${wordIndex}`,
					classes: ['message-text'],
					text: currentText.trim(),
				});
				currentText = '';
			}
			nodes.push(createLinkNode(messageId, word, wordIndex));
			currentText = ' ';
		}
		else {
			currentText += (currentText ? ' ' : '') + word;
		}
	});

	if (currentText.trim()) {
		nodes.push({
			type: 'p',
			id: `${messageId}-text-${index}-final`,
			classes: ['message-text'],
			text: currentText.trim(),
		});
	}

	return nodes;
}
