import React, { useState } from 'react';
import { useApp } from '../../App';
import * as api from '../../services/api';
import OperatingHoursForm from '../../components/OperatingHoursForm';
import { OperatingHours } from '../../types';

const ImageUploadCard: React.FC<{
  title: string;
  description: string;
  currentImageUrl: string;
  onSave: (file: File) => Promise<string | null>;
}> = ({ title, description, currentImageUrl, onSave }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setFeedback(null);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setFeedback(null);
    const newUrl = await onSave(selectedFile);
    setIsUploading(false);
    if (newUrl) {
      setFeedback({ type: 'success', message: 'Imagem atualizada com sucesso!' });
      setSelectedFile(null);
      setPreviewUrl(null);
    } else {
      setFeedback({ type: 'error', message: 'Ocorreu um erro ao enviar a imagem.' });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
      <p className="text-gray-500 text-sm mt-1 mb-4">{description}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">Imagem Atual</p>
          <img src={currentImageUrl} alt="Imagem atual" className="rounded-md object-contain h-32 w-full bg-gray-100 p-2 border" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-600 mb-2">Nova Imagem</p>
          <div className="h-32 w-full bg-gray-100 rounded-md border-2 border-dashed flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Pré-visualização" className="object-contain h-full w-full p-2" />
            ) : (
              <span className="text-gray-400 text-sm">Pré-visualização</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <label htmlFor={`file-upload-${title.replace(/\s/g, '')}`} className="cursor-pointer w-full sm:w-auto text-center bg-white py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
          Selecionar Arquivo
          <input id={`file-upload-${title.replace(/\s/g, '')}`} type="file" className="sr-only" accept="image/png, image/jpeg, image/webp" onChange={handleFileChange} />
        </label>
        <button
          onClick={handleSave}
          disabled={!selectedFile || isUploading}
          className="w-full sm:w-auto px-6 py-2 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isUploading ? 'Enviando...' : 'Salvar Alteração'}
        </button>
      </div>
      {feedback && (
        <p className={`mt-3 text-sm font-medium text-center ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
};


export default function AdminSettingsPage() {
  const { logoUrl, setLogoUrl, heroImageUrl, setHeroImageUrl, aboutImageUrl, setAboutImageUrl, clinicSettings, updateClinicSettings } = useApp();

  const handleSaveLogo = async (file: File) => {
    const newUrl = await api.uploadLogo(file);
    if (newUrl) {
      setLogoUrl(newUrl);
    }
    return newUrl;
  };
  
  const handleSaveHeroImage = async (file: File) => {
    const newUrl = await api.uploadHeroImage(file);
    if (newUrl) {
      setHeroImageUrl(newUrl);
    }
    return newUrl;
  };

  const handleSaveAboutImage = async (file: File) => {
    const newUrl = await api.uploadAboutImage(file);
    if (newUrl) {
      setAboutImageUrl(newUrl);
    }
    return newUrl;
  };
  
  const defaultOperatingHours: OperatingHours = {
    0: { open: false }, 
    1: { open: true, start: '08:00', end: '20:00' }, 
    2: { open: true, start: '08:00', end: '20:00' }, 
    3: { open: true, start: '08:00', end: '20:00' }, 
    4: { open: true, start: '08:00', end: '20:00' }, 
    5: { open: true, start: '08:00', end: '20:00' }, 
    6: { open: false }
  };

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Configurações do Site</h2>
      <div className="space-y-8">
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Horários de Funcionamento</h3>
            <OperatingHoursForm 
                initialHours={clinicSettings?.operatingHours || defaultOperatingHours}
                onSave={updateClinicSettings}
            />
        </div>
        
        <ImageUploadCard
          title="Logotipo Principal"
          description="Este logo aparece no cabeçalho e no rodapé do site. Use um formato PNG com fundo transparente."
          currentImageUrl={logoUrl}
          onSave={handleSaveLogo}
        />
        <ImageUploadCard
          title="Imagem da Página Inicial"
          description="A imagem principal que aparece no topo da home page. Use uma imagem de alta qualidade (ex: 1600x900 pixels)."
          currentImageUrl={heroImageUrl}
          onSave={handleSaveHeroImage}
        />
        <ImageUploadCard
          title="Imagem da Seção 'Sobre'"
          description="A imagem que aparece ao lado do texto 'Bem-vinda à Marília Manuela' na página inicial."
          currentImageUrl={aboutImageUrl}
          onSave={handleSaveAboutImage}
        />
      </div>
    </div>
  );
}