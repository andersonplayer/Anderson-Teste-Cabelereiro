import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { AppState, GeneratedImage, AspectRatio } from './types';
import { HAIRSTYLE_SUGGESTIONS } from './constants';
import { CameraIcon } from './components/CameraIcon';
import { UploadIcon } from './components/UploadIcon';
import { SparklesIcon } from './components/SparklesIcon';
import { DownloadIcon } from './components/DownloadIcon';
import { ExpandIcon } from './components/ExpandIcon';
import { ShareIcon } from './components/ShareIcon';
import { WhatsAppIcon } from './components/WhatsAppIcon';
import { InstagramIcon } from './components/InstagramIcon';

// Movi as mensagens de carregamento para dentro do componente, pois não são mais usadas em outros lugares.
const LOADING_MESSAGES: string[] = [
    "A mágica está acontecendo...",
    "Preparando sua transformação...",
    "Consultando nossos melhores estilistas...",
    "Dando os toques finais no seu novo visual...",
    "Quase pronto para revelar sua beleza!"
];


const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.LANDING);
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [hairstyle, setHairstyle] = useState<string>('');
    const [customHairstyle, setCustomHairstyle] = useState<string>('');
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [loadingMessage, setLoadingMessage] = useState<string>(LOADING_MESSAGES[0]);
    const [error, setError] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const [isGeneratingLook, setIsGeneratingLook] = useState<boolean>(false);
    const [completeLookImage, setCompleteLookImage] = useState<GeneratedImage | null>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    if (!process.env.API_KEY) {
        return (
            <div className="bg-red-900 text-red-100 p-4 min-h-screen flex items-center justify-center">
                <p>Erro: A variável de ambiente API_KEY não está configurada.</p>
            </div>
        );
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (appState === AppState.LOADING) {
            interval = setInterval(() => {
                setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
            }, 2500);
        }
        return () => clearInterval(interval);
    }, [appState]);

    const handleImageUpload = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setOriginalImage(e.target?.result as string);
            setAppState(AppState.EDITOR);
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleImageUpload(e.target.files[0]);
        }
    };

    const generateSingleImage = async (prompt: string): Promise<GeneratedImage | null> => {
        if (!originalImage) return null;
        const model = 'gemini-2.5-flash-image-preview';
        const base64Data = originalImage.split(',')[1];
        const mimeType = originalImage.split(';')[0].split(':')[1];

        const response = await ai.models.generateContent({
            model,
            contents: { parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] },
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
        });

        const imagePart = response.candidates[0].content.parts.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            return {
                src: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
                alt: `Visual gerado com ${customHairstyle || hairstyle}`,
                label: '' // Label will be set in the calling function
            };
        }
        return null;
    };

    const handleGenerate = async () => {
        if (!originalImage || (!hairstyle && !customHairstyle)) {
            setError("Por favor, envie uma foto e escolha ou descreva um estilo.");
            return;
        }

        setError(null);
        setAppState(AppState.LOADING);
        setGeneratedImages([]);
        setCompleteLookImage(null);

        try {
            const finalHairstyle = customHairstyle || hairstyle;
            const newImages: GeneratedImage[] = [];

            setLoadingMessage("Criando o visual frontal...");
            const promptFrontal = `Altere APENAS o cabelo da pessoa na foto para o seguinte estilo: "${finalHairstyle}". A imagem final deve ter a proporção de ${aspectRatio}. É MUITO IMPORTANTE que o rosto, a expressão facial, a maquiagem e o fundo da imagem original permaneçam EXATAMENTE os mesmos, sem nenhuma alteração.`;
            const frontalImage = await generateSingleImage(promptFrontal);
            if (frontalImage) {
                newImages.push({ ...frontalImage, label: 'Frontal' });
            } else {
                throw new Error("Não foi possível gerar a imagem frontal. Tente novamente.");
            }
            setGeneratedImages([...newImages]);
            
            setLoadingMessage("Criando a visão de perfil...");
            const promptProfile = `Usando a foto original, aplique o mesmo estilo de cabelo "${finalHairstyle}" e mostre a pessoa em uma visão de perfil (meio de lado). A imagem final deve ter a proporção de ${aspectRatio}. É MUITO IMPORTANTE que o rosto e as características principais permaneçam os mesmos.`;
            const profileImage = await generateSingleImage(promptProfile);
            if (profileImage) {
                newImages.push({ ...profileImage, label: 'Perfil' });
            }
            
            setGeneratedImages(newImages);
            setAppState(AppState.RESULT);

        } catch (e: any) {
            console.error(e);
            setError(e.message || "Ocorreu um erro desconhecido ao gerar a imagem.");
            setAppState(AppState.EDITOR);
        }
    };

    const handleSuggestLook = async () => {
        const frontalImage = generatedImages.find(img => img.label === 'Frontal');
        if (!frontalImage) {
            setError("Imagem frontal não encontrada para gerar o look.");
            return;
        }

        setIsGeneratingLook(true);
        setError(null);
        
        try {
            const prompt = `Mantendo o rosto e o cabelo da pessoa EXATAMENTE como estão, troque a roupa por um look elegante e estiloso da cintura para cima. O fundo pode ser um ambiente de salão de beleza sofisticado. Não altere o rosto ou o cabelo.`;
            const base64Data = frontalImage.src.split(',')[1];
            const mimeType = frontalImage.src.split(';')[0].split(':')[1];

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents: { parts: [{ inlineData: { data: base64Data, mimeType } }, { text: prompt }] },
                config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
            });

            const imagePart = response.candidates[0].content.parts.find(part => part.inlineData);
            if (imagePart && imagePart.inlineData) {
                setCompleteLookImage({
                    src: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`,
                    alt: 'Look completo e estiloso',
                    label: 'Look Completo'
                });
            } else {
                throw new Error("Não foi possível gerar o look completo.");
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || "Ocorreu um erro ao sugerir o look.");
        } finally {
            setIsGeneratingLook(false);
        }
    };
    
    const handleStartOver = () => {
        setAppState(AppState.LANDING);
        setOriginalImage(null);
        setHairstyle('');
        setCustomHairstyle('');
        setGeneratedImages([]);
        setError(null);
        setCompleteLookImage(null);
        setIsGeneratingLook(false);
    };

    const handleTryAgain = () => {
        setAppState(AppState.EDITOR);
        setGeneratedImages([]);
        setError(null);
        setCompleteLookImage(null);
        setIsGeneratingLook(false);
    };

    const startCamera = async () => {
        setAppState(AppState.CAMERA);
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                if (videoRef.current) videoRef.current.srcObject = stream;
            } else {
                throw new Error("A API da câmera não é suportada neste navegador.");
            }
        } catch (err) {
            console.error("Erro ao acessar câmera: ", err);
            setError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
            setAppState(AppState.LANDING);
        }
    };
    
    const takePicture = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                setOriginalImage(canvasRef.current.toDataURL('image/png'));
                setAppState(AppState.EDITOR);
                stopCamera();
            }
        }
    };

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }, []);

    useEffect(() => () => stopCamera(), [stopCamera]);
    
    const handleDownload = (src: string) => {
        const link = document.createElement('a');
        link.href = src;
        link.download = `suellen-ferreira-visual-${Date.now()}.png`;
        link.click();
    };
    
    const handleShare = async (src: string, alt: string) => {
        if (navigator.share) {
             try {
                const response = await fetch(src);
                const blob = await response.blob();
                const file = new File([blob], `novo-visual.png`, { type: blob.type });
                await navigator.share({ title: 'Meu Novo Visual!', text: alt, files: [file] });
            } catch (err) { console.error("Erro ao compartilhar:", err); }
        } else {
            alert("Compartilhamento de imagem não suportado neste navegador.");
        }
    };

    const ImageCard = ({ image }: { image: GeneratedImage }) => (
      <div className="group relative rounded-2xl overflow-hidden shadow-2xl bg-black/20 border border-white/10 backdrop-blur-md">
          <img src={image.src} alt={image.alt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <div className="absolute top-3 left-3 bg-black/30 backdrop-blur-sm text-white text-xs font-semibold py-1 px-3 rounded-full">{image.label}</div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center gap-3">
             <button onClick={() => setSelectedImage(image)} className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all hover:bg-white/20">
                 <ExpandIcon />
             </button>
             <button onClick={() => handleDownload(image.src)} className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all delay-75 hover:bg-white/20">
                 <DownloadIcon />
             </button>
             <button onClick={() => handleShare(image.src, image.alt)} className="w-12 h-12 flex items-center justify-center bg-white/10 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transform scale-90 group-hover:scale-100 transition-all delay-150 hover:bg-white/20">
                 <ShareIcon />
             </button>
          </div>
      </div>
    );
    
    const renderLanding = () => (
        <div className="flex flex-col items-center text-center">
            <h1 className="font-serif text-8xl md:text-9xl font-bold tracking-wide text-white" style={{ textShadow: '3px 3px 20px rgba(0,0,0,0.8)' }}>Suellen Ferreira</h1>
            <p className="mt-6 text-lg md:text-xl text-gray-200 max-w-xl tracking-wider">Transforme seu visual com apenas um clique!</p>
            
            <div className="mt-12 flex flex-col justify-center items-center gap-4 w-full max-w-sm">
                <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex items-center justify-center gap-3 w-full text-lg bg-transparent backdrop-blur-md border-2 border-white/40 text-white font-semibold py-4 px-8 rounded-full shadow-lg transition-all duration-300 hover:bg-white/10 hover:border-white/60 hover:-translate-y-1 active:scale-[0.98]"
                >
                    <UploadIcon />
                    Começar Transformação
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <button 
                    onClick={startCamera} 
                    className="flex items-center justify-center gap-3 w-full text-lg bg-transparent backdrop-blur-md border-2 border-white/40 text-white font-semibold py-4 px-8 rounded-full shadow-lg transition-all duration-300 hover:bg-white/10 hover:border-white/60 hover:-translate-y-1 active:scale-[0.98]"
                >
                    <CameraIcon />
                    Capturar Foto
                </button>
            </div>

            <div className="mt-8 border-t border-white/10 w-full max-w-sm pt-8">
                 <a
                    href="https://wa.me/5581997580420?text=Olá! Gostaria de agendar um horário."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-3 w-full text-lg bg-green-500/20 backdrop-blur-md border border-green-400/30 text-white font-semibold py-4 px-8 rounded-full shadow-lg transition-all duration-300 hover:bg-green-500/30 hover:border-green-400/40 hover:-translate-y-1 active:scale-[0.98]"
                >
                    <WhatsAppIcon />
                    Agende Seu Horário
                </a>
            </div>

             <div className="mt-12 text-center">
                <a 
                    href="https://www.instagram.com/suellenferreirams" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-2 text-gray-300 hover:text-white transition-colors duration-300"
                >
                    <InstagramIcon />
                    <span className="font-medium">@suellenferreirams</span>
                </a>
             </div>
            {error && <p className="text-red-400 mt-6">{error}</p>}
        </div>
    );
    
    const renderCamera = () => (
        <div className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-6 w-full max-w-lg mx-auto bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <div className="w-full rounded-2xl overflow-hidden shadow-2xl relative">
                    <video ref={videoRef} autoPlay playsInline className="w-full h-auto" />
                    <canvas ref={canvasRef} className="hidden" />
                </div>
                <button onClick={takePicture} className="w-full text-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold py-4 px-8 rounded-full shadow-lg transition-all duration-300 hover:bg-white/20 hover:border-white/30 hover:-translate-y-1 active:scale-[0.98]">Tirar Foto</button>
                <button onClick={() => { stopCamera(); setAppState(AppState.LANDING); }} className="text-gray-400 hover:text-white transition">Cancelar</button>
            </div>
        </div>
    );

    const renderEditor = () => (
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-5xl">
            <div className="w-full flex flex-col lg:flex-row gap-8 lg:gap-12 text-gray-200">
                <div className="lg:w-1/2 flex-shrink-0">
                    <h2 className="font-serif text-3xl font-bold mb-4 text-white">Sua Foto</h2>
                    <img src={originalImage!} alt="Sua foto original" className="rounded-2xl shadow-xl w-full" />
                </div>
                <div className="lg:w-1/2 flex flex-col">
                    <h2 className="font-serif text-3xl font-bold mb-6 text-white">Escolha seu novo estilo</h2>
                    {error && <p className="bg-red-900/50 text-red-300 p-3 rounded-lg mb-4">{error}</p>}
                    
                    <div className="space-y-4 mb-6">
                        <p className="font-semibold text-gray-300">Sugestões:</p>
                        <div className="space-y-3">
                            {HAIRSTYLE_SUGGESTIONS.map(suggestion => (
                                <div key={suggestion.name} className="flex items-center gap-4 p-2 rounded-lg bg-white/5 transition-colors hover:bg-white/10">
                                    <button
                                        onClick={() => {
                                            setHairstyle(suggestion.name);
                                            setCustomHairstyle(suggestion.name);
                                        }}
                                        className={`flex-grow text-left text-sm py-1 px-2 rounded transition-colors ${hairstyle === suggestion.name ? 'text-white font-semibold' : 'text-gray-300'}`}
                                    >
                                        {suggestion.name}
                                    </button>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {suggestion.colors.map(color => (
                                            <button
                                                key={color.hex}
                                                onClick={() => {
                                                    const baseStyle = suggestion.name;
                                                    setHairstyle(baseStyle);
                                                    setCustomHairstyle(`${baseStyle} ${color.name}`);
                                                }}
                                                title={color.name}
                                                className="w-5 h-5 rounded-full ring-1 ring-white/20 transition-transform hover:scale-125"
                                                style={{ backgroundColor: color.hex }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>


                    <div className="mt-4">
                        <label htmlFor="custom-hairstyle" className="font-semibold text-gray-300 block mb-2">Ou descreva o seu próprio estilo:</label>
                        <input 
                            id="custom-hairstyle"
                            type="text" 
                            value={customHairstyle} 
                            onChange={(e) => { setCustomHairstyle(e.target.value); setHairstyle(''); }}
                            placeholder="Ex: Cabelo ruivo longo e cacheado" 
                            className="bg-gray-800/50 border border-white/20 text-gray-200 rounded-lg w-full p-3 focus:ring-2 focus:ring-white/50 focus:border-white/50 outline-none transition" 
                        />
                    </div>

                     <div className="mt-6">
                        <p className="font-semibold text-gray-300 mb-2">Proporção da Imagem:</p>
                        <div className="flex gap-2">
                            {(['1:1', '9:16', '16:9'] as AspectRatio[]).map(ratio => (
                                <button
                                    key={ratio}
                                    onClick={() => setAspectRatio(ratio)}
                                    className={`px-4 py-2 text-sm rounded-full transition-all duration-300 ${aspectRatio === ratio ? 'bg-white/20 border-white/30 scale-105 shadow-md' : 'bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10'}`}
                                >
                                    {ratio}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto pt-8">
                        <button onClick={handleGenerate} disabled={!originalImage || (!hairstyle && !customHairstyle)} className="w-full flex items-center justify-center gap-3 text-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold py-4 px-8 rounded-full shadow-lg transition-all duration-300 hover:bg-white/20 hover:border-white/30 hover:-translate-y-1 disabled:opacity-50 disabled:bg-gray-700 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none active:scale-[0.98]">
                            <SparklesIcon />
                            Gerar Novo Visual
                        </button>
                        <button onClick={handleStartOver} className="w-full text-center mt-4 text-gray-400 hover:text-white transition">Começar de Novo</button>
                    </div>
                </div>
            </div>
        </div>
    );
    
    const renderLoading = () => (
         <div className="text-center text-white flex flex-col items-center justify-center bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-12 shadow-2xl">
             <div className="relative h-20 w-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-t-transparent border-white/50 animate-spin"></div>
             </div>
             <p className="text-xl mt-6 font-semibold">{loadingMessage}</p>
         </div>
    );
    
    const renderResult = () => (
        <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl w-full max-w-6xl">
            <div className="w-full text-gray-200">
                <h2 className="font-serif text-4xl font-bold mb-2 text-center text-white">Seu Novo Visual!</h2>
                <p className="text-center text-gray-300 mb-10">Aqui estão as prévias do seu novo estilo.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {generatedImages.map((image, index) => (
                        <ImageCard key={index} image={image} />
                    ))}
                </div>

                {error && <p className="text-red-400 mt-6 text-center">{error}</p>}

                {generatedImages.length > 0 && (
                     <div className="mt-16 pt-10 border-t border-white/10 text-center">
                        <h3 className="font-serif text-3xl font-bold mb-4 text-white">Próximo Passo: Complete a Transformação</h3>
                        <p className="text-gray-300 mb-6 max-w-2xl mx-auto">Gostou do cabelo? Agora vamos criar um look completo para acompanhar seu novo estilo.</p>
                        
                        {!completeLookImage && (
                            <button 
                                onClick={handleSuggestLook}
                                disabled={isGeneratingLook}
                                className="text-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all duration-300 hover:bg-white/20 hover:-translate-y-1 disabled:opacity-50 disabled:cursor-wait active:scale-[0.98]"
                            >
                                {isGeneratingLook ? 'Criando seu look...' : 'Sugerir um Look Completo'}
                            </button>
                        )}
                    </div>
                )}
                
                {completeLookImage && (
                    <div className="mt-12 text-center">
                         <h3 className="font-serif text-3xl font-bold mb-6 text-white">Seu Look Completo</h3>
                         <div className="max-w-md mx-auto">
                            <ImageCard image={completeLookImage} />
                         </div>
                         <div className="mt-8 bg-black/20 backdrop-blur-md p-8 rounded-2xl max-w-md mx-auto shadow-2xl border border-white/10">
                            <p className="text-xl text-white mb-5">Pronta para tornar esse visual realidade?</p>
                            <a
                                href={`https://wa.me/5581997580420?text=${encodeURIComponent("Olá! Adorei a minha transformação no aplicativo e gostaria de agendar um horário.")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-3 text-lg bg-green-500/80 text-white font-bold py-4 px-8 rounded-full shadow-lg shadow-green-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/30 hover:-translate-y-1 hover:bg-green-500 active:scale-[0.98]"
                            >
                                <WhatsAppIcon />
                                Agende Seu Horário
                            </a>
                         </div>
                    </div>
                )}

                <div className="mt-12 text-center flex flex-col sm:flex-row justify-center items-center gap-6">
                    <button onClick={handleTryAgain} className="text-lg bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold py-3 px-8 rounded-full shadow-lg transition-all duration-300 hover:bg-white/20 hover:-translate-y-1 active:scale-[0.98]">
                        Tentar Outro Estilo
                    </button>
                    <button onClick={handleStartOver} className="text-gray-400 hover:text-white font-medium transition">
                        Começar de Novo
                    </button>
                </div>
            </div>
        </div>
    );

    const renderModal = () => (
        selectedImage && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                <div className="relative w-full max-w-4xl max-h-[90vh] bg-gray-900/80 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/10" onClick={(e) => e.stopPropagation()}>
                    <img src={selectedImage.src} alt={selectedImage.alt} className="w-full h-auto object-contain max-h-[calc(90vh-110px)] rounded-lg" />
                    <button onClick={() => setSelectedImage(null)} className="absolute -top-4 -right-4 w-10 h-10 flex items-center justify-center bg-white text-gray-800 rounded-full text-2xl font-bold shadow-lg hover:scale-110 transition-transform">&times;</button>
                     <div className="mt-4 flex justify-center gap-4">
                        <button onClick={() => handleDownload(selectedImage.src)} className="flex items-center gap-2 bg-white/10 text-white py-2 px-5 rounded-full hover:bg-white/20 transition">
                            <DownloadIcon /> Baixar
                        </button>
                        <button onClick={() => handleShare(selectedImage.src, selectedImage.alt)} className="flex items-center gap-2 bg-white/10 text-white py-2 px-5 rounded-full hover:bg-white/20 transition">
                            <ShareIcon /> Compartilhar
                        </button>
                    </div>
                </div>
            </div>
        )
    );
    
    const Background = () => (
         <div className="absolute inset-0 z-0">
            <img 
                src="https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                alt="Fundo de salão de beleza"
                className="w-full h-full object-cover animate-kenburns filter blur-md"
            />
            <div className="absolute inset-0 bg-black/60"></div>
        </div>
    );

    const states = {
        [AppState.LANDING]: renderLanding(),
        [AppState.CAMERA]: renderCamera(),
        [AppState.EDITOR]: renderEditor(),
        [AppState.LOADING]: renderLoading(),
        [AppState.RESULT]: renderResult(),
    };

    const stateContainerClasses = {
        [AppState.LANDING]: 'items-center justify-center',
        [AppState.CAMERA]: 'items-center justify-center',
        [AppState.EDITOR]: 'items-center justify-center',
        [AppState.LOADING]: 'items-center justify-center',
        [AppState.RESULT]: 'justify-start pt-16 sm:pt-20',
    };

    const AppContainer = ({ state, children }: { state: AppState, children: React.ReactNode }) => (
        <div className={`absolute inset-0 overflow-y-auto p-4 sm:p-6 lg:p-8 flex ${stateContainerClasses[state] || 'items-center justify-center'} transition-opacity duration-700 ease-in-out ${appState === state ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <div className="w-full my-auto">{children}</div>
        </div>
    );

    return (
        <>
            <div className="relative min-h-screen w-full bg-gray-900 text-white overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img 
                        src="https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                        alt="Fundo de salão de beleza"
                        className="w-full h-full object-cover animate-kenburns filter blur-md"
                    />
                    <div className="absolute inset-0 bg-black/60"></div>
                </div>

                <main className="relative z-10 min-h-screen flex flex-col">
                    <AppContainer state={AppState.LANDING}>{renderLanding()}</AppContainer>
                    <AppContainer state={AppState.CAMERA}>{renderCamera()}</AppContainer>
                    <AppContainer state={AppState.EDITOR}>{renderEditor()}</AppContainer>
                    <AppContainer state={AppState.LOADING}>{renderLoading()}</AppContainer>
                    <AppContainer state={AppState.RESULT}>{renderResult()}</AppContainer>
                </main>
            </div>
            
            {renderModal()}
        </>
    );
}

export default App;