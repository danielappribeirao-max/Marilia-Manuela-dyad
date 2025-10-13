import React, { useState } from 'react';
import { useApp } from '../../App';
import * as api from '../../services/api';

export default function AdminSettings() {
    const { logoUrl, setLogoUrl } = useApp();
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                setError('O arquivo é muito grande. O limite é de 2MB.');
                return;
            }
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                setError('Formato de arquivo inválido. Use JPG, PNG ou WEBP.');
                return;
            }
            setError('');
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!selectedFile) {
            setError('Por favor, selecione um arquivo primeiro.');
            return;
        }
        setIsLoading(true);
        setError('');
        const newLogoUrl = await api.uploadLogo(selectedFile);
        setIsLoading(false);

        if (newLogoUrl) {
            setLogoUrl(newLogoUrl);
            alert('Logotipo atualizado com sucesso!');
            setSelectedFile(null);
            setPreviewUrl(null);
        } else {
            setError('Ocorreu um erro ao salvar o novo logotipo. Tente novamente.');
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Configurações do Site</h2>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Logotipo do Site</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div>
                        <p className="text-sm text-gray-600 mb-2">Logotipo Atual:</p>
                        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex justify-center items-center h-32">
                            <img src={logoUrl} alt="Logotipo Atual" className="max-h-full max-w-full" />
                        </div>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-2">Novo Logotipo:</p>
                        <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 flex justify-center items-center h-32">
                            {previewUrl ? (
                                <img src={previewUrl} alt="Pré-visualização" className="max-h-full max-w-full" />
                            ) : (
                                <span className="text-gray-400 text-sm">Pré-visualização</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-6">
                    <label htmlFor="logo-upload" className="cursor-pointer bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                        <span>{selectedFile ? `Arquivo: ${selectedFile.name}` : 'Escolher Arquivo...'}</span>
                        <input id="logo-upload" name="logo-upload" type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">Recomendado: Fundo transparente (PNG), máx 2MB.</p>
                </div>
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={!selectedFile || isLoading}
                        className="px-6 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-colors shadow disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Salvando...' : 'Salvar Logotipo'}
                    </button>
                </div>
            </div>
        </div>
    );
}