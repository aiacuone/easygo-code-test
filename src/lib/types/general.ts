import type { BlurFilter, Container, ContainerChild, Sprite, Texture } from 'pixi.js';

export interface PokemonSprite extends Sprite {
	pokemon: string;
}

export interface PokemonTexture extends Texture {
	pokemon: string;
}

export interface Reel {
	container: Container<ContainerChild>;
	symbols: PokemonSprite[];
	position: number;
	previousPosition: number;
	blur: BlurFilter;
}

export interface Tween {
	object: Reel;
	property: string;
	propertyBeginValue: any;
	target: number;
	easing: any;
	time: number;
	change: ((t: any) => void) | null;
	complete: ((t: any) => void) | null;
	start: number;
}
