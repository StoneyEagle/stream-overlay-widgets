export interface MessageNode {
	type: string;
	id?: string;
	classes?: string[];
	attribs?: Record<string, any>;
	text?: string;
	children?: MessageNode[];
}

export interface ChatMessage {
	id: string;
	is_command: boolean;
	is_cheer: boolean;
	is_highlighted: boolean;
	color_hex: string;
	badges: Badge[];
	user_type: string;
	user: User;
	channel_id: string;
	broadcaster: null;
	message: string;
	fragments: Fragment[];
	message_node:	MessageNode;
	tmi_sent_ts: Date;
	replies: any[];
	created_at: Date;
	updated_at: Date;
	animationState?: 'entering' | 'active' | 'leaving';
	is_decorated?: boolean;
	decoration_style?: string;
}

export interface Badge {
	id: string;
	info: string;
	set_id: string;
	urls:	Record<string, string>;
}

export interface User {
	id: string;
	user_name: string;
	display_name: string;
	nickname: string;
	timezone: null;
	timezone_info: null;
	description: string;
	profile_image_url: string;
	offline_image_url: string;
	color: string;
	broadcaster_type: string;
	enabled: boolean;
	pronoun: Pronoun;
	created_at: Date;
	updated_at: Date;
}

export interface Pronoun {
	id: number;
	name: string;
	subject: string;
	object: string;
	singular: boolean;
}

export interface Fragment {
	type: Type;
	text: string;
	emote?: Emote;
	html_preview?: HTMLPreview;
	mention: Mention | null;
}

export interface Emote {
	id: string;
	emote_set_id: string;
	owner_id: string;
	format: string[];
	provider: string;
	is_gigantified?: boolean;
	urls: { [key: string]: string };
}

export interface HTMLPreview {
	host: string;
	title: string;
	description: string;
	image_url: string;
}

export enum Type {
	Emote = 'emote',
	Text = 'text',
	Mention = 'mention',
	URL = 'url',
	HTML = 'html',
	Spotify = 'spotify',
}

export interface OGMetadata {
	title?: string;
	description?: string | null;
	image?: string | null;
	host?: string | null;
}

export interface Mention {
	id: string;
	user_name: string;
	display_name: string;
	color_hex: string;
}