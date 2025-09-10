export interface ColorSuggestion {
    name: string;
    hex: string;
}

export interface HairstyleSuggestion {
    name: string;
    colors: ColorSuggestion[];
}

export const HAIRSTYLE_SUGGESTIONS: HairstyleSuggestion[] = [
    {
        name: "Corte Bob clássico",
        colors: [
            { name: "Castanho Chocolate", hex: "#5B3A29" },
            { name: "Loiro Mel", hex: "#E3B473" },
            { name: "Preto Intenso", hex: "#1C1C1C" },
        ],
    },
    {
        name: "Corte Pixie moderno",
        colors: [
            { name: "Loiro Platinado", hex: "#E6E8FA" },
            { name: "Cinza Prateado", hex: "#C0C0C0" },
            { name: "Ruivo Acobreado", hex: "#B87333" },
        ],
    },
    {
        name: "Long Bob com ondas",
        colors: [
            { name: "Morena Iluminada", hex: "#8A5A44" },
            { name: "Loiro Dourado", hex: "#FFD700" },
            { name: "Castanho Avermelhado", hex: "#8B4513" },
        ],
    },
    {
        name: "Corte longo e liso",
        colors: [
            { name: "Preto Azulado", hex: "#191970" },
            { name: "Loiro Baunilha", hex: "#F3E5AB" },
            { name: "Castanho Natural", hex: "#6F4E37" },
        ],
    },
    {
        name: "Corte curto e texturizado",
        colors: [
            { name: "Branco Neve", hex: "#FFFAFA" },
            { name: "Rosa Pastel", hex: "#FFD1DC" },
            { name: "Azul Petróleo", hex: "#008080" },
        ],
    },
    {
        name: "Corte com franjas laterais",
        colors: [
            { name: "Loiro Morango", hex: "#FFB0A9" },
            { name: "Castanho Claro", hex: "#A0522D" },
            { name: "Cor de Vinho", hex: "#800000" },
        ],
    },
    {
        name: "Corte em camadas desconectadas",
        colors: [
            { name: "Loiro Acinzentado", hex: "#BDB7AB" },
            { name: "Roxo Lavanda", hex: "#E6E6FA" },
            { name: "Verde Esmeralda", hex: "#50C878" },
        ],
    },
    {
        name: "Corte reto e suave",
        colors: [
            { name: "Castanho Escuro", hex: "#3B270C" },
            { name: "Loiro Champanhe", hex: "#F7E7CE" },
            { name: "Ruivo Cereja", hex: "#D2042D" },
        ],
    },
    {
        name: "Corte em V para cabelos longos",
        colors: [
            { name: "Ombré Caramelo", hex: "#C68642" },
            { name: "Loiro Areia", hex: "#C2B280" },
            { name: "Marrom Café", hex: "#4B3621" },
        ],
    },
    {
        name: "Corte com volume",
        colors: [
            { name: "Ruivo Natural", hex: "#A52A2A" },
            { name: "Loiro Escuro", hex: "#A88B59" },
            { name: "Castanho Dourado", hex: "#C7893C" },
        ],
    },
];
