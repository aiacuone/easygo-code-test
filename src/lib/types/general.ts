import type { BlurFilter, Container, ContainerChild, Sprite } from 'pixi.js';

export interface Reel {
	container: Container<ContainerChild>;
	symbols: Sprite[];
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
