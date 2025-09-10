export enum AppState {
    LANDING = 'LANDING',
    CAMERA = 'CAMERA',
    EDITOR = 'EDITOR',
    LOADING = 'LOADING',
    RESULT = 'RESULT',
}

export type AspectRatio = '1:1' | '9:16' | '16:9';

export interface GeneratedImage {
    src: string;
    alt: string;
    label: string;
}